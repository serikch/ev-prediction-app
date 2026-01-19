"""
ML Model Loader - Télécharge et charge le modèle XGBoost depuis GitHub Releases

VERSION SIMPLIFIÉE: XGBoost seul (pas de StackingEnsemble)
"""
import os
import logging
import joblib
from pathlib import Path
from typing import Optional, Any
import requests
import numpy as np

# ============================================
# IMPORT DEPENDENCIES
# ============================================
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor

# ============================================
# LOGGING
# ============================================
logger = logging.getLogger(__name__)

# ============================================
# CONFIGURATION
# ============================================
MODEL_DIR = Path(__file__).parent.parent.parent / "ml_models"
MODEL_FILENAME = "model.pkl"
MODEL_PATH = MODEL_DIR / MODEL_FILENAME

# ✅ NOUVEAU MODÈLE: XGBoost BEV2 (beaucoup plus léger!)
MODEL_URL = os.getenv(
    "MODEL_URL",
    "https://github.com/serikch/ev-prediction-app/releases/download/v1.0.0/top2_model_bev2_without_battery_features_xgboost.pkl"
)

_model: Optional[Any] = None

FEATURE_ORDER = [
    'speed_kmh', 'speed2', 'speed3', 'acceleration', 'slope',
    'slope_abs', 'elevation_diff', 'VCFRONT_tempAmbient', 'temp_range',
    'SOCave292', 'soc_delta',
    'speed_x_slope', 'speed2_x_slope', 'speed_x_slope_abs',
    'accel_x_speed', 'accel_x_speed2', 'total_effort',
    'speed_roll_mean_10', 'speed_roll_std_10', 'speed_roll_max_10',
    'speed_roll_min_10', 'accel_roll_mean_5', 'accel_roll_std_5',
    'slope_roll_mean_20',
    'is_accelerating', 'is_braking', 'is_coasting', 'regen_potential',
    'cumul_elevation_gain', 'cumul_elevation_loss', 'time_since_stop',
    'speed_regime', 'slope_category', 'temp_category',
    'accel_per_speed', 'slope_per_speed',
]


def download_model() -> bool:
    """Télécharge le modèle ML depuis GitHub Releases"""
    logger.info(f"📥 Téléchargement du modèle XGBoost...")
    logger.info(f"   URL: {MODEL_URL}")
    
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    
    try:
        response = requests.get(MODEL_URL, stream=True, timeout=300)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0
        
        logger.info(f"   Taille: {total_size / (1024*1024):.1f} MB")
        
        with open(MODEL_PATH, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                downloaded += len(chunk)
                
                if total_size > 0 and downloaded % (total_size // 10 + 1) < 8192:
                    progress = (downloaded / total_size) * 100
                    logger.info(f"   Progression: {progress:.0f}%")
        
        logger.info(f"✅ Modèle téléchargé: {MODEL_PATH}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Échec téléchargement: {e}")
        return False


def load_model() -> Optional[Any]:
    """Charge le modèle ML avec joblib"""
    global _model
    
    if _model is not None:
        logger.info("✅ Modèle déjà en mémoire")
        return _model
    
    if not MODEL_PATH.exists():
        logger.info("📦 Modèle non trouvé, téléchargement...")
        success = download_model()
        if not success:
            logger.warning("⚠️ Impossible de télécharger le modèle")
            return None
    
    try:
        logger.info(f"📂 Chargement du modèle: {MODEL_PATH}...")
        
        model_data = joblib.load(MODEL_PATH)
        
        if isinstance(model_data, dict):
            _model = model_data.get('model')
            features = model_data.get('features', [])
            logger.info(f"✅ Modèle chargé: {type(_model).__name__}")
            logger.info(f"   Features attendues: {len(features)}")
            logger.info(f"   R²: {model_data.get('r2', 'N/A')}")
            logger.info(f"   MAE: {model_data.get('mae', 'N/A')} kW")
            logger.info(f"   Vehicle: {model_data.get('vehicle_type', 'N/A')}")
        else:
            _model = model_data
            logger.info(f"✅ Modèle chargé: {type(_model).__name__}")
        
        if hasattr(_model, 'n_features_in_'):
            logger.info(f"   Nombre de features: {_model.n_features_in_}")
            
        return _model
        
    except Exception as e:
        logger.error(f"❌ Échec chargement modèle: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return None


def get_model() -> Optional[Any]:
    """Retourne le modèle chargé (ou None)"""
    return _model


def predict_with_model(features: dict) -> Optional[float]:
    """Fait une prédiction avec le modèle ML"""
    global _model
    
    if _model is None:
        logger.warning("⚠️ Modèle non chargé, impossible de prédire")
        return None
    
    try:
        if hasattr(_model, 'feature_names_in_'):
            expected_features = list(_model.feature_names_in_)
        else:
            expected_features = FEATURE_ORDER
        
        feature_values = []
        missing_features = []
        
        for feat in expected_features:
            if feat in features:
                try:
                    value = float(features[feat])
                except (ValueError, TypeError):
                    value = 0.0
                    missing_features.append(feat)
                feature_values.append(value)
            else:
                missing_features.append(feat)
                feature_values.append(0.0)
        
        if missing_features and len(missing_features) <= 5:
            logger.debug(f"Features manquantes: {missing_features}")
        
        X = np.array(feature_values, dtype=np.float64).reshape(1, -1)
        prediction = _model.predict(X)[0]
        
        speed = features.get('speed_kmh', 0)
        logger.debug(f"✅ Prédiction ML: {prediction:.2f} kW @ {speed:.1f} km/h")
        
        return float(prediction)
        
    except Exception as e:
        logger.error(f"❌ Erreur prédiction: {e}")
        return None