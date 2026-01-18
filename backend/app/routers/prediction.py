"""
Prediction API endpoints
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import numpy as np
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/predict", tags=["prediction"])


class SensorData(BaseModel):
    speed_kmh: float = Field(..., ge=0, le=250)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    elevation: Optional[float] = None
    timestamp: float
    soc: float = Field(..., ge=0, le=100)
    ambient_temp: float = Field(default=15.0)


class PredictionRequest(BaseModel):
    vehicle_type: str = "BEV1"
    current_data: SensorData


class PredictionResponse(BaseModel):
    battery_power_kw: float
    efficiency_kwh_100km: float
    confidence: float
    recommended_speed: Optional[float] = None
    recommendation_message: str = ""
    recommendation_type: str = "info"
    features_used: Optional[Dict[str, Any]] = None


# Vehicle specs
VEHICLE_SPECS = {
    "BEV1": {"mass": 1900, "cd_a": 0.59, "crr": 0.01, "efficiency": 0.88, "capacity": 60.5},
    "BEV2": {"mass": 2000, "cd_a": 0.59, "crr": 0.01, "efficiency": 0.88, "capacity": 78.8},
}

# Session storage for previous values
_sessions: Dict[str, Dict] = {}


def physics_prediction(
    speed_kmh: float,
    acceleration: float,
    slope: float,
    ambient_temp: float,
    vehicle_type: str = "BEV1"
) -> Dict[str, Any]:
    """Physics-based power prediction"""
    specs = VEHICLE_SPECS.get(vehicle_type, VEHICLE_SPECS["BEV1"])
    
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
    
    # Battery power
    if P_wheels > 0:
        power_kw = P_wheels / efficiency
    else:
        power_kw = P_wheels * 0.7  # Regen
    
    # Auxiliaries
    aux = 0.5
    if ambient_temp < 10 or ambient_temp > 25:
        aux += 1.5
    power_kw += aux
    
    # Efficiency
    efficiency_kwh = (power_kw / speed_kmh * 100) if speed_kmh > 1 else 0
    
    return {
        "battery_power_kw": round(power_kw, 2),
        "efficiency_kwh_100km": round(efficiency_kwh, 2),
        "confidence": 0.75,
    }


@router.post("", response_model=PredictionResponse)
async def predict_energy(
    request: PredictionRequest,
    session_id: Optional[str] = "default",
) -> PredictionResponse:
    """Predict energy consumption"""
    
    current = request.current_data
    vehicle_type = request.vehicle_type
    
    # Get previous data for acceleration calculation
    session = _sessions.get(session_id, {})
    prev_speed = session.get("speed", current.speed_kmh)
    prev_elevation = session.get("elevation", current.elevation or 0)
    prev_timestamp = session.get("timestamp", current.timestamp - 1)
    
    dt = max(0.1, current.timestamp - prev_timestamp)
    
    # Calculate acceleration
    speed_ms = current.speed_kmh / 3.6
    prev_speed_ms = prev_speed / 3.6
    acceleration = (speed_ms - prev_speed_ms) / dt
    
    # Calculate slope
    elevation = current.elevation or 0
    distance = speed_ms * dt
    slope = ((elevation - prev_elevation) / distance * 100) if distance > 1 else 0
    slope = max(-20, min(20, slope))
    
    # Predict
    result = physics_prediction(
        current.speed_kmh,
        acceleration,
        slope,
        current.ambient_temp,
        vehicle_type
    )
    
    # Recommendation
    power = result["battery_power_kw"]
    rec_type = "info"
    rec_msg = "Conduite normale"
    rec_speed = current.speed_kmh
    
    if power < -5:
        rec_type = "info"
        rec_msg = f"Régénération active ({abs(power):.0f} kW)"
    elif power > 50 and current.speed_kmh > 100:
        rec_type = "danger"
        rec_msg = "Consommation élevée - Réduisez à 90 km/h"
        rec_speed = 90
    elif power > 35:
        rec_type = "warning"
        rec_msg = "Ralentissez pour économiser de l'énergie"
        rec_speed = current.speed_kmh - 10
    elif acceleration > 1.5:
        rec_type = "warning"
        rec_msg = "Accélération progressive recommandée"
    elif power < 25 and current.speed_kmh > 20:
        rec_type = "success"
        rec_msg = "Conduite éco-efficace 🌿"
    
    # Update session
    _sessions[session_id] = {
        "speed": current.speed_kmh,
        "elevation": elevation,
        "timestamp": current.timestamp,
    }
    
    return PredictionResponse(
        battery_power_kw=result["battery_power_kw"],
        efficiency_kwh_100km=result["efficiency_kwh_100km"],
        confidence=result["confidence"],
        recommended_speed=rec_speed,
        recommendation_message=rec_msg,
        recommendation_type=rec_type,
        features_used={
            "speed_kmh": current.speed_kmh,
            "acceleration": round(acceleration, 3),
            "slope": round(slope, 2),
        }
    )


@router.get("/models")
async def get_models():
    return {
        "available_models": ["BEV1", "BEV2"],
        "model_info": {
            "BEV1": {"name": "Physics Model", "type": "Tesla Model Y SR"},
            "BEV2": {"name": "Physics Model", "type": "Tesla Model Y LR"},
        }
    }


@router.delete("/session/{session_id}")
async def clear_session(session_id: str):
    if session_id in _sessions:
        del _sessions[session_id]
    return {"status": "cleared"}
