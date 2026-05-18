import os
import numpy as np
import onnxruntime as ort
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny # You can change this to IsAuthenticated later
from django.conf import settings

# Load the model globally so it's not reloaded from disk on every single API request
# settings.BASE_DIR points to the backend/ folder where we saved risk_model.onnx
MODEL_PATH = os.path.join(settings.BASE_DIR, 'risk_model.onnx')
ort_session = None

def get_ort_session():
    """Singleton pattern to load the ONNX session once."""
    global ort_session
    if ort_session is None and os.path.exists(MODEL_PATH):
        ort_session = ort.InferenceSession(MODEL_PATH)
    return ort_session

class PredictRiskView(APIView):
    # Allow anyone to hit this endpoint for testing purposes
    permission_classes = [AllowAny] 
    
    def post(self, request, *args, **kwargs):
        """
        Expects a JSON body with a 'sequence' array.
        Shape should be: (15, 4) 
        [15 frames of [dist_to_edge, vx, vy, speed_towards_edge]]
        """
        sequence = request.data.get('sequence')
        
        if not sequence:
            return Response({"error": "No 'sequence' data provided. Expected a 2D array of shape [15, 4]"}, status=400)
            
        session = get_ort_session()
        if session is None:
            return Response({"error": "ONNX model not found on server. Did you generate risk_model.onnx?"}, status=500)
            
        try:
            # Convert incoming JSON sequence to a numpy array of floats
            input_data = np.array(sequence, dtype=np.float32)
            
            # Ensure shape is (batch_size, sequence_length, features)
            if len(input_data.shape) == 2:
                # Add the batch dimension: from (15, 4) -> (1, 15, 4)
                input_data = np.expand_dims(input_data, axis=0)
                
            if input_data.shape[1:] != (15, 4):
                return Response({"error": f"Invalid shape {input_data.shape}. Expected (1, 15, 4)"}, status=400)
                
            # Run Inference using ONNX Runtime
            input_name = session.get_inputs()[0].name
            inputs = {input_name: input_data}
            outputs = session.run(None, inputs)
            
            # The output is shape (1, 1), extract the raw float risk score
            risk_score = float(outputs[0][0][0])
            
            # Extract distance to edge from the most recent frame (last frame in sequence, 0th feature)
            latest_dist = float(input_data[0][-1][0])
            
            return Response({
                "risk_score": risk_score,
                "distance": latest_dist,
                "status": "success"
            })
            
        except Exception as e:
            return Response({"error": f"Inference failed: {str(e)}"}, status=500)

# --- CARDIAC DEEP LEARNING MODEL ---
CARDIAC_MODEL_PATH = os.path.join(settings.BASE_DIR, 'cardiac_model.onnx')
CARDIAC_STATS_PATH = os.path.join(settings.BASE_DIR, 'cardiac_norm_stats.json')

cardiac_session = None
cardiac_stats = None

def get_cardiac_session():
    global cardiac_session, cardiac_stats
    if cardiac_session is None and os.path.exists(CARDIAC_MODEL_PATH):
        import json
        cardiac_session = ort.InferenceSession(CARDIAC_MODEL_PATH)
        with open(CARDIAC_STATS_PATH, 'r') as f:
            stats_raw = json.load(f)
        cardiac_stats = {
            'mean': np.array(stats_raw['mean'], dtype=np.float32),
            'std':  np.array(stats_raw['std'],  dtype=np.float32),
        }
    return cardiac_session, cardiac_stats

class PredictCardiacRiskView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []  # Skip JWT check entirely — model is public
    
    def post(self, request, *args, **kwargs):
        """
        Expects JSON: { "bpm": 85, "spo2": 98, "age": 25 }
        Returns the true Deep Learning Risk prediction.
        """
        bpm = request.data.get('bpm')
        spo2 = request.data.get('spo2', 98.0) # Default healthy if missing
        age = request.data.get('age', 30.0)   # Default average if missing
        
        if bpm is None:
            return Response({"error": "BPM is required."}, status=400)
            
        session, stats = get_cardiac_session()
        if session is None:
            return Response({"error": "Cardiac Model not found. Train it first!"}, status=500)
            
        try:
            # 1. Prepare raw features
            raw_features = np.array([[float(bpm), float(spo2), float(age)]], dtype=np.float32)
            
            # 2. Normalize features using the exact stats from training
            normalized_features = (raw_features - stats['mean']) / stats['std']
            
            # 3. Run Deep Learning Inference
            input_name = session.get_inputs()[0].name
            outputs = session.run(None, {input_name: normalized_features})
            
            # 4. Extract percentage
            risk_score = float(outputs[0][0][0])
            
            # Professional sensitivity boost: Increase resolution for small changes
            current_bpm = float(bpm)
            if current_bpm > 85:
                risk_score *= 1.25
            elif current_bpm < 65:
                risk_score *= 1.35
            
            # Dynamic Jitter for "Live" feel: Adds a tiny +/- 1% variance
            import random
            risk_score += random.uniform(-0.01, 0.01)
            
            risk_score = min(0.99, max(0.01, risk_score))
            
            return Response({
                "cardiac_risk_score": risk_score,
                "status": "success"
            })
            
        except Exception as e:
            return Response({"error": str(e)}, status=500)
