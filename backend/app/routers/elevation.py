"""
Elevation API endpoints
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import httpx
import asyncio
import math
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/elevation", tags=["elevation"])

ELEVATION_API_URL = "https://api.opentopodata.org/v1/eudem25m"


class GPSPoint(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class ElevationRequest(BaseModel):
    points: List[GPSPoint] = Field(..., min_length=1, max_length=100)


class ElevationPoint(BaseModel):
    latitude: float
    longitude: float
    elevation: float


class ElevationResponse(BaseModel):
    points: List[ElevationPoint]
    source: str = "eudem25m"


@router.get("/single")
async def get_single_elevation(latitude: float, longitude: float):
    """Get elevation for a single point"""
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
            
            raise HTTPException(status_code=503, detail="Elevation service unavailable")
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Elevation service timeout")
    except Exception as e:
        logger.error(f"Elevation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=ElevationResponse)
async def get_elevations(request: ElevationRequest):
    """Get elevations for multiple points"""
    if len(request.points) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 points")
    
    locations = "|".join([f"{p.latitude},{p.longitude}" for p in request.points])
    
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
                    points = []
                    for i, result in enumerate(data["results"]):
                        points.append(ElevationPoint(
                            latitude=request.points[i].latitude,
                            longitude=request.points[i].longitude,
                            elevation=result.get("elevation") or 0
                        ))
                    return ElevationResponse(points=points)
            
            # Fallback: return zeros
            return ElevationResponse(
                points=[
                    ElevationPoint(latitude=p.latitude, longitude=p.longitude, elevation=0)
                    for p in request.points
                ]
            )
            
    except Exception as e:
        logger.error(f"Elevation batch error: {e}")
        return ElevationResponse(
            points=[
                ElevationPoint(latitude=p.latitude, longitude=p.longitude, elevation=0)
                for p in request.points
            ]
        )


@router.post("/with-slope")
async def get_elevations_with_slope(points: List[GPSPoint]):
    """Get elevations and calculate slopes"""
    if len(points) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 points")
    
    # Get elevations
    request = ElevationRequest(points=points)
    elevations_response = await get_elevations(request)
    elevations = [p.elevation for p in elevations_response.points]
    
    # Calculate slopes
    results = []
    for i, (point, elevation) in enumerate(zip(points, elevations)):
        slope = 0.0
        if i > 0:
            # Haversine distance
            R = 6371000
            lat1 = math.radians(points[i-1].latitude)
            lat2 = math.radians(point.latitude)
            dlat = lat2 - lat1
            dlon = math.radians(point.longitude - points[i-1].longitude)
            
            a = math.sin(dlat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2
            distance = R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
            
            if distance > 1:
                slope = (elevation - elevations[i-1]) / distance * 100
                slope = max(-20, min(20, slope))
        
        results.append({
            "latitude": point.latitude,
            "longitude": point.longitude,
            "elevation": elevation,
            "slope": slope
        })
    
    return {"points": results, "source": "eudem25m"}
