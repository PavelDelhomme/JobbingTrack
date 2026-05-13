"""
Endpoints pour les statistiques des entretiens
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.interview import Interview

router = APIRouter()


@router.get("/statistics/interviews")
async def get_interviews_statistics(
    db: Session = Depends(get_db)
):
    """
    Récupère les statistiques des entretiens
    """
    try:
        # Nombre total d'entretiens
        total_interviews = db.query(Interview).count()
        
        # Entretiens par statut
        interviews_by_status = {}
        if hasattr(Interview, 'status'):
            interviews_by_status = dict(
                db.query(Interview.status, func.count(Interview.id))
                .group_by(Interview.status)
                .all()
            )
        
        # Entretiens planifiés (status = SCHEDULED)
        scheduled = interviews_by_status.get('SCHEDULED', 0)
        
        # Entretiens complétés (status = COMPLETED)
        completed = interviews_by_status.get('COMPLETED', 0)
        
        # Entretiens cette semaine
        week_ago = datetime.utcnow() - timedelta(days=7)
        this_week = db.query(Interview).filter(
            Interview.created_at >= week_ago
        ).count()
        
        # Entretiens à venir (scheduled_date > maintenant)
        now = datetime.utcnow()
        upcoming = 0
        if hasattr(Interview, 'scheduled_date'):
            upcoming = db.query(Interview).filter(
                Interview.scheduled_date >= now
            ).count()
        
        return {
            "success": True,
            "statistics": {
                "total": total_interviews,
                "by_status": interviews_by_status,
                "scheduled": scheduled,
                "completed": completed,
                "this_week": this_week,
                "upcoming": upcoming,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la récupération des statistiques: {str(e)}"
        )

