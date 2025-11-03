"""
Endpoints pour les statistiques applicatives
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta

from app.services.app_statistics_service import app_statistics_service
from app.core.database import get_db
from app.core.security import get_current_user

router = APIRouter()


@router.get("/statistics")
async def get_current_statistics(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Récupère les statistiques applicatives actuelles
    """
    try:
        stats = await app_statistics_service.collect_all_statistics(db)
        return {
            "success": True,
            "statistics": stats,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la collecte des statistiques: {str(e)}")


@router.get("/statistics/timeline")
async def get_statistics_timeline(
    time_range: str = Query("24h", description="Plage de temps (1h, 6h, 24h, 7d, 30d)"),
    limit: int = Query(1000, ge=1, le=10000),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Récupère l'historique des statistiques
    """
    try:
        # Calculer la plage de temps
        time_ranges = {
            '1h': timedelta(hours=1),
            '6h': timedelta(hours=6),
            '24h': timedelta(hours=24),
            '7d': timedelta(days=7),
            '30d': timedelta(days=30),
            '90d': timedelta(days=90),
            '1y': timedelta(days=365)
        }
        
        delta = time_ranges.get(time_range, timedelta(hours=24))
        end_time = datetime.utcnow()
        start_time = end_time - delta
        
        timeline = await app_statistics_service.get_timeline(
            db=db,
            start_time=start_time,
            end_time=end_time,
            limit=limit
        )
        
        return {
            "success": True,
            "timeline": timeline,
            "time_range": time_range,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "count": len(timeline)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération de la timeline: {str(e)}")


@router.post("/statistics/collect")
async def collect_statistics(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Force la collecte des statistiques
    Utilisé pour les tests ou pour forcer une mise à jour
    """
    try:
        stats = await app_statistics_service.collect_all_statistics(db)
        return {
            "success": True,
            "message": "Statistiques collectées avec succès",
            "statistics": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la collecte: {str(e)}")


@router.get("/statistics/summary")
async def get_statistics_summary(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Récupère un résumé rapide des statistiques principales
    """
    try:
        stats = await app_statistics_service.collect_all_statistics(db)
        
        return {
            "success": True,
            "summary": stats.get('summary', {}),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération du résumé: {str(e)}")

