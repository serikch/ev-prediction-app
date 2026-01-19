"""
Router de prédiction - Utilise le vrai modèle ML
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import numpy as np
import logging

from app.models.ml_model import get_model, predict_with_model

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/predict", tags=["prediction"])


# ============================================
# SCHEMAS
# ============================================

class FeaturesRequest(BaseModel):
    """Les 36 features calculées par le frontend"""
    # Base features (11)
    speed_kmh: float = Field(default=0, ge=0, le=250)
    speed2: float = Field(default=0)
    speed3: float = Field(default=0)
    acceleration: float = Field(default=0)
    slope: float = Field(default=0)
    slope_abs: float = Field(default=0)
    elevation_diff: float = Field(default=0)
    VCFRONT_tempAmbient: float = Field(default=15)
    temp_range: float = Field(default=3.0)
    SOCave292: float = Field(default=80, ge=0, le=100)
    soc_delta: float = Field(default=0)
    
    # Interaction features (6)
    speed_x_slope: float = Field(default=0)
    speed2_x_slope: float = Field(default=0)
    speed_x_slope_abs: float = Field(default=0)
    accel_x_speed: float = Field(default=0)
    accel_x_speed2: float = Field(default=0)
    total_effort: float = Field(default=0)
    
    # Rolling features (7)
    speed_roll_mean_10: float = Field(default=0)
    speed_roll_std_10: float = Field(default=0)
    speed_roll_max_10: float = Field(default=0)
    speed_roll_min_10: float = Field(default=0)
    accel_roll_mean_5: float = Field(default=0)
    accel_roll_std_5: float = Field(default=0)
    slope_roll_mean_20: float = Field(default=0)
    
    # Binary state features (4)
    is_accelerating: int = Field(default=0, ge=0, le=1)
    is_braking: int = Field(default=0, ge=0, le=1)
    is_coasting: int = Field(default=0, ge=0, le=1)
    regen_potential: int = Field(default=0, ge=0, le=1)
    
    # Cumulative features (3)
    cumul_elevation_gain: float = Field(default=0)
    cumul_elevation_loss: float = Field(default=0)
    time_since_stop: float = Field(default=0)
    
    # Categorical features (3)
    speed_regime: int = Field(default=0, ge=0, le=3)
    slope_category: int = Field(default=2, ge=0, le=4)
    temp_category: int = Field(default=2, ge=0, le=4)
    
    # Ratio features (2)
    accel_per_speed: float = Field(default=0)
    slope_per_speed: float = Field(default=0)


class PredictionRequest(BaseModel):
    """Requête de prédiction"""
    vehicle_type: str = Field(default="BEV1", description="BEV1 ou BEV2")
    features: FeaturesRequest


class PredictionResponse(BaseModel):
    """Réponse avec prédiction"""
    battery_power_kw: float
    efficiency_kwh_100km: float
    confidence: float
    optimal_speed: Optional[float] = None
    recommendation_message: str = ""
    recommendation_type: str = "info"
    model_used: str = "ML"


# ============================================
# MODÈLE PHYSIQUE (FALLBACK)
# ============================================

VEHICLE_SPECS = {
    "BEV1": {"mass": 1900, "cd_a": 0.59, "crr": 0.01, "efficiency": 0.88, "capacity": 60.5},
    "BEV2": {"mass": 2000, "cd_a": 0.59, "crr": 0.01, "efficiency": 0.88, "capacity": 78.8},
}


def physics_prediction(features: dict, vehicle_type: str = "BEV1") -> float:
    """Prédiction physique (fallback si ML indisponible)"""
    specs = VEHICLE_SPECS.get(vehicle_type, VEHICLE_SPECS["BEV1"])
    
    speed_kmh = features.get("speed_kmh", 0)
    acceleration = features.get("acceleration", 0)
    slope = features.get("slope", 0)
    ambient_temp = features.get("VCFRONT_tempAmbient", 15)
    
    mass = specs["mass"]
    cd_a = specs["cd_a"]
    crr = specs["crr"]
    efficiency = specs["efficiency"]
    
    speed_ms = speed_kmh / 3.6
    slope_rad = np.arctan(slope / 100)
    rho = 1.225
    g = 9.81
    
    # Forces
    F_aero = 0.5 * rho * cd_a * speed_ms ** 2
    F_roll = crr * mass * g * np.cos(slope_rad)
    F_grade = mass * g * np.sin(slope_rad)
    F_accel = mass * acceleration
    
    F_total = F_aero + F_roll + F_grade + F_accel
    P_wheels = F_total * speed_ms / 1000  # kW
    
    # Puissance batterie avec efficacité
    if P_wheels > 0:
        power_kw = P_wheels / efficiency
    else:
        power_kw = P_wheels * 0.7  # Efficacité régénération
    
    # Auxiliaires (HVAC)
    aux = 0.5
    if ambient_temp < 10 or ambient_temp > 25:
        aux += 1.5
    power_kw += aux
    
    return power_kw


def calculate_optimal_speed(features: dict, vehicle_type: str = "BEV1") -> float:
    """Calcule la vitesse optimale"""
    speed = features.get("speed_kmh", 0)
    slope = features.get("slope", 0)
    soc = features.get("SOCave292", 80)
    
    # Vitesse optimale de base
    optimal = 85
    
    # Ajustements selon pente
    if slope > 5:
        optimal = min(70, optimal)
    elif slope > 2:
        optimal = min(80, optimal)
    elif slope < -3:
        optimal = max(90, optimal)
    
    # Ajustements selon SOC
    if soc < 20:
        optimal = min(70, optimal)
    elif soc < 30:
        optimal = min(80, optimal)
    
    # Ne pas recommander plus vite si déjà lent
    if speed > 0 and speed < 50:
        optimal = min(speed + 10, optimal)
    
    return optimal


def generate_recommendation(power: float, features: dict) -> tuple:
    """Génère une recommandation de conduite"""
    speed = features.get("speed_kmh", 0)
    slope = features.get("slope", 0)
    acceleration = features.get("acceleration", 0)
    
    # Régénération active
    if power < -5:
        return (
            f"Régénération active ({abs(power):.0f} kW récupérés)",
            "info"
        )
    
    # Consommation très élevée
    if power > 80 and speed > 100:
        return (
            "Consommation très élevée - Réduisez à 90 km/h pour économiser ~25%",
            "danger"
        )
    
    # Montée forte
    if slope > 5 and power > 40:
        return (
            f"Montée {slope:.1f}% - Maintenez une vitesse stable",
            "warning"
        )
    
    # Accélération forte
    if acceleration > 2.0:
        return (
            "Accélération forte - Accélérez plus doucement pour économiser 15-20%",
            "warning"
        )
    
    # Vitesse élevée
    if speed > 120 and power > 50:
        return (
            f"À {speed:.0f} km/h, réduire à 110 km/h économise ~15%",
            "warning"
        )
    
    # Bonne efficacité
    if power < 25 and speed > 30:
        return (
            "Conduite éco-efficace 🌿",
            "success"
        )
    
    return ("Conduite normale", "info")


# ============================================
# ENDPOINTS
# ============================================

@router.post("", response_model=PredictionResponse)
async def predict_power(request: PredictionRequest):
    """
    Prédit la consommation avec le modèle ML
    
    Accepte les 36 features calculées par le frontend et retourne:
    - Puissance prédite (kW)
    - Efficacité (kWh/100km)
    - Vitesse optimale
    - Recommandation de conduite
    """
    features_dict = request.features.model_dump()
    vehicle_type = request.vehicle_type
    
    # Essayer le modèle ML d'abord
    model = get_model()
    power_kw = None
    model_used = "Physics (fallback)"
    
    if model is not None:
        power_kw = predict_with_model(features_dict)
        if power_kw is not None:
            model_used = "ML (XGBoost/Stacking)"
            logger.info(f"✅ Prédiction ML: {power_kw:.2f} kW")
    
    # Fallback sur modèle physique
    if power_kw is None:
        power_kw = physics_prediction(features_dict, vehicle_type)
        logger.info(f"⚠️ Fallback physique: {power_kw:.2f} kW")
    
    # Efficacité
    speed = features_dict.get("speed_kmh", 0)
    efficiency = (power_kw / speed * 100) if speed > 1 else 0
    
    # Vitesse optimale
    optimal_speed = calculate_optimal_speed(features_dict, vehicle_type)
    
    # Recommandation
    rec_message, rec_type = generate_recommendation(power_kw, features_dict)
    
    # Confiance
    confidence = 0.92 if "ML" in model_used else 0.75
    
    return PredictionResponse(
        battery_power_kw=round(power_kw, 2),
        efficiency_kwh_100km=round(efficiency, 2),
        confidence=confidence,
        optimal_speed=round(optimal_speed),
        recommendation_message=rec_message,
        recommendation_type=rec_type,
        model_used=model_used
    )


@router.get("/health")
async def health():
    """Health check"""
    model = get_model()
    return {
        "status": "healthy",
        "ml_model_loaded": model is not None,
        "model_type": type(model).__name__ if model else "None"
    }


@router.get("/models")
async def get_models_info():
    """Info sur les modèles"""
    model = get_model()
    
    model_info = {
        "ml_model_loaded": model is not None,
        "model_type": type(model).__name__ if model else None,
    }
    
    if model is not None:
        if hasattr(model, 'n_features_in_'):
            model_info["n_features"] = int(model.n_features_in_)
        if hasattr(model, 'feature_names_in_'):
            model_info["feature_names"] = list(model.feature_names_in_)[:10]
    
    return {
        "available_vehicles": ["BEV1", "BEV2"],
        "vehicle_specs": {
            "BEV1": {"name": "Tesla Model Y SR", "battery": "60.5 kWh", "chemistry": "LFP"},
            "BEV2": {"name": "Tesla Model Y LR", "battery": "78.8 kWh", "chemistry": "NCA"},
        },
        "model_info": model_info
    }