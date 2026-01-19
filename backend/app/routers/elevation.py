"""
Router d'élévation - Utilise OpenTopoData eudem25m
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List
import httpx
import math
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/elevation", tags=["elevation"])

ELEVATION_API_URL = "https://api.opentopodata.org/v1/eudem25m"


class GPSPoint(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class ElevationPoint(BaseModel):
    latitude: float
    longitude: float
    elevation: float


class ElevationResponse(BaseModel):
    points: List[ElevationPoint]
    source: str = "eudem25m"


@router.get("/single")
async def get_single_elevation(latitude: float, longitude: float):
    """Obtenir l'élévation d'un point GPS"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                ELEVATION_API_URL,
                params={
                    "locations": f"{latitude},{longitude}",
                    "interpolation": "bilinear"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "OK" and data.get("results"):
                    elevation = data["results"][0].get("elevation")
                    return {
                        "latitude": latitude,
                        "longitude": longitude,
                        "elevation": elevation,
                        "source": "eudem25m"
                    }
            
            raise HTTPException(status_code=503, detail="Service d'élévation indisponible")
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Timeout service d'élévation")
    except Exception as e:
        logger.error(f"Erreur élévation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def get_elevations(points: List[GPSPoint]):
    """Obtenir les élévations de plusieurs points"""
    if len(points) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 points")
    
    locations = "|".join([f"{p.latitude},{p.longitude}" for p in points])
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                ELEVATION_API_URL,
                params={
                    "locations": locations,
                    "interpolation": "bilinear"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "OK" and data.get("results"):
                    result_points = []
                    for i, result in enumerate(data["results"]):
                        result_points.append(ElevationPoint(
                            latitude=points[i].latitude,
                            longitude=points[i].longitude,
                            elevation=result.get("elevation") or 0
                        ))
                    return ElevationResponse(points=result_points)
            
            # Fallback: retourner des zéros
            return ElevationResponse(
                points=[
                    ElevationPoint(latitude=p.latitude, longitude=p.longitude, elevation=0)
                    for p in points
                ]
            )
            
    except Exception as e:
        logger.error(f"Erreur batch élévation: {e}")
        return ElevationResponse(
            points=[
                ElevationPoint(latitude=p.latitude, longitude=p.longitude, elevation=0)
                for p in points
            ]
        )