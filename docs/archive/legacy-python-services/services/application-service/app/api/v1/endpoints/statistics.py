"""
Endpoints pour les statistiques des candidatures
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.application import Application
from app.core.security import get_current_user

router = APIRouter()


@router.get("/statistics/applications")
async def get_applications_statistics(
    db: Session = Depends(get_db)
):
    """
    Récupère les statistiques des candidatures
    """
    try:
        # Nombre total de candidatures
        total_applications = db.query(Application).count()
        
        # Candidatures par statut
        applications_by_status = dict(
            db.query(Application.status, func.count(Application.id))
            .group_by(Application.status)
            .all()
        )
        
        # Candidatures par type (si le champ existe)
        applications_by_type = {}
        if hasattr(Application, 'job_type'):
            applications_by_type = dict(
                db.query(Application.job_type, func.count(Application.id))
                .group_by(Application.job_type)
                .all()
            )
        
        # Nouvelles candidatures ce mois
        first_day_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        new_this_month = db.query(Application).filter(
            Application.created_at >= first_day_of_month
        ).count()
        
        # Nouvelles candidatures cette semaine
        week_ago = datetime.utcnow() - timedelta(days=7)
        new_this_week = db.query(Application).filter(
            Application.created_at >= week_ago
        ).count()
        
        # Candidatures aujourd'hui
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        new_today = db.query(Application).filter(
            Application.created_at >= today
        ).count()
        
        # Taux de conversion (entretiens / candidatures envoyées)
        sent_count = applications_by_status.get('SENT', 0) + applications_by_status.get('IN_REVIEW', 0)
        interview_count = applications_by_status.get('INTERVIEW_SCHEDULED', 0) + applications_by_status.get('INTERVIEWED', 0)
        conversion_rate = (interview_count / sent_count * 100) if sent_count > 0 else 0
        
        return {
            "success": True,
            "statistics": {
                "total": total_applications,
                "by_status": applications_by_status,
                "by_type": applications_by_type,
                "this_month": new_this_month,
                "this_week": new_this_week,
                "today": new_today,
                "conversion_rate": round(conversion_rate, 2),
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la récupération des statistiques: {str(e)}"
        )


@router.get("/statistics/applications/timeline")
async def get_applications_timeline(
    days: int = 30,
    db: Session = Depends(get_db)
):
    """
    Récupère l'évolution des candidatures sur X jours
    """
    try:
        # Calculer les statistiques par jour
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Récupérer les candidatures par jour
        daily_stats = []
        for i in range(days):
            day_start = start_date + timedelta(days=i)
            day_end = day_start + timedelta(days=1)
            
            count = db.query(Application).filter(
                Application.created_at >= day_start,
                Application.created_at < day_end
            ).count()
            
            daily_stats.append({
                "date": day_start.strftime("%Y-%m-%d"),
                "count": count
            })
        
        return {
            "success": True,
            "timeline": daily_stats,
            "days": days,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la récupération de la timeline: {str(e)}"
        )

