"""
EV Energy Prediction API
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="EV Energy Prediction API",
    version="1.0.0",
    description="API for predicting electric vehicle energy consumption"
)

# CORS - Allow all origins for mobile testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routers
from app.routers import prediction, elevation

app.include_router(prediction.router)
app.include_router(elevation.router)


@app.get("/")
async def root():
    return {
        "name": "EV Energy Prediction API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
