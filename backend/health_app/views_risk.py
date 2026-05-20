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

# --- CARDIAC DEEP LEARNING MODEL DELETED ---


class PredictCardiacRiskView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []  # Skip JWT check entirely — model is public
    
    def post(self, request, *args, **kwargs):
        """
        Expects JSON: { "bpm": 85, "spo2": 98, "sys": 120, "temp": 36.6 }
        Returns the CatBoost Risk prediction.
        """
        bpm = request.data.get('bpm')
        spo2 = request.data.get('spo2', 98.0) # Default healthy if missing
        sys_bp = request.data.get('sys', 120.0) # Default if missing
        temp = request.data.get('temp', 36.6)   # Default if missing
        
        if bpm is None:
            return Response({"error": "BPM is required."}, status=400)
            
        try:
            from .catboost_service import get_catboost_model
            model = get_catboost_model()
            
            if model is None:
                return Response({"error": "CatBoost Model not found."}, status=500)
            
            features = [[float(bpm), float(spo2), float(sys_bp), float(temp)]]
            proba = model.predict_proba(features)[0]
            
            pred_class = int(model.predict(features)[0][0])
            status_labels = {0: 'normal', 1: 'warning', 2: 'critical'}
            catboost_status = status_labels.get(pred_class, 'normal')
            
            risk_score = float(proba[1] * 0.5 + proba[2] * 1.0)
            
            import random
            risk_score += random.uniform(-0.01, 0.01)
            
            risk_score = min(0.99, max(0.01, risk_score))
            
            return Response({
                "cardiac_risk_score": risk_score,
                "catboost_status": catboost_status,
                "status": "success"
            })
            
        except Exception as e:
            return Response({"error": str(e)}, status=500)
