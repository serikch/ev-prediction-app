"""
ML Model Loader - Télécharge et charge le modèle depuis GitHub Releases

FIXED: Utilise JOBLIB (pas pickle) car le modèle a été sauvegardé avec joblib.dump()
"""
import os
import sys
import logging
import joblib  # ← JOBLIB, pas pickle!
from pathlib import Path
from typing import Optional, Any
import requests
import numpy as np

# ============================================
# IMPORT ALL DEPENDENCIES
# ============================================
from sklearn.base import BaseEstimator, RegressorMixin
from sklearn.utils._tags import Tags, InputTags, TargetTags
from sklearn.linear_model import Ridge
from sklearn.ensemble import (
    RandomForestRegressor, 
    StackingRegressor, 
    VotingRegressor,
)
from sklearn.preprocessing import StandardScaler

from xgboost import XGBRegressor
from lightgbm import LGBMRegressor
from catboost import CatBoostRegressor

# ============================================
# SKLEARN 1.6+ COMPATIBLE CATBOOST WRAPPER
# ============================================
class CatBoostRegressorWrapper(BaseEstimator, RegressorMixin):
    """
    Wrapper around CatBoostRegressor to make it compatible with sklearn 1.6+.
    """
    
    def __init__(self, iterations=500, learning_rate=0.1, depth=6, 
                 l2_leaf_reg=3, random_state=42, verbose=False, thread_count=-1,
                 **kwargs):
        self.iterations = iterations
        self.learning_rate = learning_rate
        self.depth = depth
        self.l2_leaf_reg = l2_leaf_reg
        self.random_state = random_state
        self.verbose = verbose
        self.thread_count = thread_count
        self.kwargs = kwargs
        self._model = None
    
    def fit(self, X, y):
        self._model = CatBoostRegressor(
            iterations=self.iterations,
            learning_rate=self.learning_rate,
            depth=self.depth,
            l2_leaf_reg=self.l2_leaf_reg,
            random_state=self.random_state,
            verbose=self.verbose,
            thread_count=self.thread_count,
            **self.kwargs
        )
        self._model.fit(X, y)
        return self
    
    def predict(self, X):
        return self._model.predict(X)
    
    @property
    def feature_importances_(self):
        return self._model.feature_importances_
    
    def get_params(self, deep=True):
        return {
            'iterations': self.iterations,
            'learning_rate': self.learning_rate,
            'depth': self.depth,
            'l2_leaf_reg': self.l2_leaf_reg,
            'random_state': self.random_state,
            'verbose': self.verbose,
            'thread_count': self.thread_count,
            **self.kwargs
        }
    
    def set_params(self, **params):
        for key, value in params.items():
            if key in ['iterations', 'learning_rate', 'depth', 'l2_leaf_reg', 
                       'random_state', 'verbose', 'thread_count']:
                setattr(self, key, value)
            else:
                self.kwargs[key] = value
        return self
    
    def __sklearn_tags__(self):
        tags = Tags(
            estimator_type="regressor",
            target_tags=TargetTags(required=True),
            input_tags=InputTags()
        )
        return tags


# ============================================
# INJECT CatBoostRegressorWrapper INTO __main__
# ============================================
import __main__
__main__.CatBoostRegressorWrapper = CatBoostRegressorWrapper


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

MODEL_URL = os.getenv(
    "MODEL_URL",
    "https://github.com/serikch/ev-prediction-app/releases/download/v1.0.0/top1_model_bev1_without_battery_features_stackingensemble.pkl"
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
    logger.info(f"📥 Téléchargement du modèle...")
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
                
                if total_size > 0 and downloaded % (total_size // 10) < 8192:
                    progress = (downloaded / total_size) * 100
                    logger.info(f"   Progression: {progress:.0f}%")
        
        logger.info(f"✅ Modèle téléchargé: {MODEL_PATH}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Échec téléchargement: {e}")
        return False


def load_model() -> Optional[Any]:
    """Charge le modèle ML avec JOBLIB"""
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
        logger.info(f"📂 Chargement du modèle avec joblib: {MODEL_PATH}...")
        
        # JOBLIB.LOAD - pas pickle!
        model_data = joblib.load(MODEL_PATH)
        
        if isinstance(model_data, dict):
            _model = model_data.get('model')
            features = model_data.get('features', [])
            logger.info(f"✅ Modèle chargé: {type(_model).__name__}")
            logger.info(f"   Features attendues: {len(features)}")
            logger.info(f"   R²: {model_data.get('r2', 'N/A')}")
            logger.info(f"   MAE: {model_data.get('mae', 'N/A')} kW")
        else:
            _model = model_data
            logger.info(f"✅ Modèle chargé: {type(_model).__name__}")
        
        if hasattr(_model, 'feature_names_in_'):
            logger.info(f"   Features du modèle: {len(_model.feature_names_in_)}")
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
        
        if missing_features:
            logger.warning(f"⚠️ {len(missing_features)} features manquantes: {missing_features[:3]}...")
        
        X = np.array(feature_values, dtype=np.float64).reshape(1, -1)
        prediction = _model.predict(X)[0]
        
        speed = features.get('speed_kmh', 0)
        logger.info(f"✅ Prédiction ML: {prediction:.2f} kW @ {speed:.1f} km/h")
        
        return float(prediction)
        
    except Exception as e:
        logger.error(f"❌ Erreur prédiction: {e}")
        return None