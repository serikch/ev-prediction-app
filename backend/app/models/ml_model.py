"""
ML Model Loader - Télécharge et charge le modèle depuis GitHub Releases
"""
import os
import logging
import pickle
from pathlib import Path
from typing import Optional, Any
import requests
import numpy as np

logger = logging.getLogger(__name__)

# ============================================
# CONFIGURATION DU MODÈLE
# ============================================

MODEL_DIR = Path(__file__).parent.parent.parent / "ml_models"
MODEL_FILENAME = "model.pkl"
MODEL_PATH = MODEL_DIR / MODEL_FILENAME

# URL du modèle sur GitHub Releases
MODEL_URL = os.getenv(
    "MODEL_URL",
    "https://github.com/serikch/ev-prediction-app/releases/download/v1.0.0/top1_model_bev1_without_battery_features_stackingensemble.pkl"
)

# Instance globale du modèle
_model: Optional[Any] = None

# Ordre des 36 features attendues par le modèle
FEATURE_ORDER = [
    # Base features (11)
    'speed_kmh', 'speed2', 'speed3', 'acceleration', 'slope',
    'slope_abs', 'elevation_diff', 'VCFRONT_tempAmbient', 'temp_range',
    'SOCave292', 'soc_delta',
    
    # Interaction features (6)
    'speed_x_slope', 'speed2_x_slope', 'speed_x_slope_abs',
    'accel_x_speed', 'accel_x_speed2', 'total_effort',
    
    # Rolling features (7)
    'speed_roll_mean_10', 'speed_roll_std_10', 'speed_roll_max_10',
    'speed_roll_min_10', 'accel_roll_mean_5', 'accel_roll_std_5',
    'slope_roll_mean_20',
    
    # Binary state features (4)
    'is_accelerating', 'is_braking', 'is_coasting', 'regen_potential',
    
    # Cumulative features (3)
    'cumul_elevation_gain', 'cumul_elevation_loss', 'time_since_stop',
    
    # Categorical features (3)
    'speed_regime', 'slope_category', 'temp_category',
    
    # Ratio features (2)
    'accel_per_speed', 'slope_per_speed',
]


def download_model() -> bool:
    """
    Télécharge le modèle ML depuis GitHub Releases
    Returns True si succès, False sinon
    """
    logger.info(f"📥 Téléchargement du modèle depuis GitHub Releases...")
    logger.info(f"   URL: {MODEL_URL}")
    
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    
    try:
        response = requests.get(MODEL_URL, stream=True, timeout=600)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0
        
        logger.info(f"   Taille: {total_size / (1024*1024):.1f} MB")
        
        with open(MODEL_PATH, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                downloaded += len(chunk)
                
                # Log progress tous les 10%
                if total_size > 0 and downloaded % (total_size // 10) < 8192:
                    progress = (downloaded / total_size) * 100
                    logger.info(f"   Progression: {progress:.0f}%")
        
        logger.info(f"✅ Modèle téléchargé: {MODEL_PATH}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Échec téléchargement: {e}")
        return False


def load_model() -> Optional[Any]:
    """
    Charge le modèle ML (télécharge d'abord si nécessaire)
    """
    global _model
    
    if _model is not None:
        logger.info("✅ Modèle déjà en mémoire")
        return _model
    
    # Vérifier si le modèle existe localement
    if not MODEL_PATH.exists():
        logger.info("📦 Modèle non trouvé, téléchargement...")
        success = download_model()
        if not success:
            logger.warning("⚠️ Impossible de télécharger le modèle")
            return None
    
    # Charger le modèle
    try:
        logger.info(f"📂 Chargement du modèle: {MODEL_PATH}...")
        
        with open(MODEL_PATH, 'rb') as f:
            _model = pickle.load(f)
        
        logger.info(f"✅ Modèle chargé: {type(_model).__name__}")
        
        # Log info modèle
        if hasattr(_model, 'feature_names_in_'):
            logger.info(f"   Features attendues: {len(_model.feature_names_in_)}")
        if hasattr(_model, 'n_features_in_'):
            logger.info(f"   Nombre de features: {_model.n_features_in_}")
            
        return _model
        
    except Exception as e:
        logger.error(f"❌ Échec chargement modèle: {e}")
        return None


def get_model() -> Optional[Any]:
    """Retourne le modèle chargé (ou None)"""
    return _model


def predict_with_model(features: dict) -> Optional[float]:
    """
    Fait une prédiction avec le modèle ML
    
    Args:
        features: Dictionnaire avec les 36 features
        
    Returns:
        Puissance batterie prédite en kW, ou None si modèle indisponible
    """
    global _model
    
    if _model is None:
        logger.warning("⚠️ Modèle non chargé, impossible de prédire")
        return None
    
    try:
        # Utiliser l'ordre des features du modèle si disponible
        if hasattr(_model, 'feature_names_in_'):
            expected_features = list(_model.feature_names_in_)
        else:
            expected_features = FEATURE_ORDER
        
        # Construire le tableau de features dans le bon ordre
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
        
        if missing_features:
            logger.warning(f"⚠️ {len(missing_features)} features manquantes: {missing_features[:3]}...")
        
        # Convertir en numpy array
        X = np.array(feature_values, dtype=np.float64).reshape(1, -1)
        
        # Prédiction
        prediction = _model.predict(X)[0]
        
        speed = features.get('speed_kmh', 0)
        logger.info(f"✅ Prédiction ML: {prediction:.2f} kW @ {speed:.1f} km/h")
        
        return float(prediction)
        
    except Exception as e:
        logger.error(f"❌ Erreur prédiction: {e}")
        return None