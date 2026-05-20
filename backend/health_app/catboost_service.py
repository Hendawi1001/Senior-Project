import os
import logging
from catboost import CatBoostClassifier

logger = logging.getLogger(__name__)

# Global model instance
_catboost_model = None

def get_catboost_model():
    global _catboost_model
    if _catboost_model is None:
        from django.conf import settings
        model_path = os.path.join(settings.BASE_DIR, 'catboost_model.json')
        if os.path.exists(model_path):
            try:
                _catboost_model = CatBoostClassifier()
                _catboost_model.load_model(model_path, format='json')
                logger.info("CatBoost model loaded successfully for dashboard.")
            except Exception as e:
                logger.error(f"Failed to load CatBoost model: {e}")
        else:
            logger.error(f"CatBoost model file not found at {model_path}")
    return _catboost_model

def predict_health_status(heart_rate, sp02, blood_pressure_sys, temperature):
    model = get_catboost_model()
    if model is None:
        return 'normal'
    try:
        # Features order matching train_catboost.py:
        # ['Heart_Rate', 'Oxygen_Saturation', 'Systolic_BP', 'Temperature']
        features = [[float(heart_rate), float(sp02), float(blood_pressure_sys), float(temperature)]]
        prediction = model.predict(features)
        
        val = int(prediction[0][0]) if hasattr(prediction[0], '__len__') else int(prediction[0])
        
        # Mapping:
        # 0 -> normal
        # 1 -> warning
        # 2 -> critical
        mapping = {0: 'normal', 1: 'warning', 2: 'critical'}
        return mapping.get(val, 'normal')
    except Exception as e:
        logger.error(f"CatBoost prediction error: {e}")
        return 'normal'
