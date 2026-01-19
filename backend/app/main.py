"""
EV Energy Prediction API - Point d'entrée
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import du loader de modèle
from app.models.ml_model import load_model, get_model


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Charge le modèle ML au démarrage"""
    logger.info("🚀 Démarrage de l'API EV Energy Prediction...")
    
    # Charger le modèle ML
    try:
        model = load_model()
        if model:
            logger.info(f"✅ Modèle ML chargé: {type(model).__name__}")
        else:
            logger.warning("⚠️ Modèle ML non disponible - fallback physique")
    except Exception as e:
        logger.error(f"❌ Erreur chargement modèle: {e}")
        logger.warning("⚠️ Utilisation du fallback physique")
    
    yield
    
    logger.info("👋 Arrêt de l'API...")


app = FastAPI(
    title="EV Energy Prediction API",
    version="2.0.0",
    description="API de prédiction de consommation énergétique pour véhicules électriques",
    lifespan=lifespan
)

# CORS - Autoriser toutes les origines pour tests mobile/web
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import des routers
from app.routers import prediction, elevation

app.include_router(prediction.router)
app.include_router(elevation.router)


@app.get("/")
async def root():
    """Informations API"""
    model = get_model()
    return {
        "name": "EV Energy Prediction API",
        "version": "2.0.0",
        "status": "running",
        "ml_model_loaded": model is not None,
        "model_type": type(model).__name__ if model else "Physics fallback",
        "docs": "/docs",
        "team": "Team 5314 - ESILV"
    }


@app.get("/health")
async def health():
    """Health check"""
    model = get_model()
    return {
        "status": "healthy",
        "ml_model_ready": model is not None
    }