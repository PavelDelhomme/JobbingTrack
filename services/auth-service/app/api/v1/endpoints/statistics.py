"""
Endpoints pour les statistiques des utilisateurs
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.user import User
from app.core.security import get_current_user

router = APIRouter()


@router.get("/statistics/users")
async def get_users_statistics(
    db: Session = Depends(get_db)
):
    """
    Récupère les statistiques des utilisateurs
    """
    try:
        # Compter le nombre total d'utilisateurs
        total_users = db.query(User).count()
        
        # Utilisateurs actifs (connectés dans les 30 derniers jours)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        active_users = db.query(User).filter(
            User.last_login >= thirty_days_ago
        ).count() if hasattr(User, 'last_login') else 0
        
        # Utilisateurs par rôle
        users_by_role = dict(
            db.query(User.role, func.count(User.id))
            .group_by(User.role)
            .all()
        ) if hasattr(User, 'role') else {}
        
        # Nouveaux utilisateurs ce mois
        first_day_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        new_this_month = db.query(User).filter(
            User.created_at >= first_day_of_month
        ).count()
        
        # Nouveaux utilisateurs cette semaine
        week_ago = datetime.utcnow() - timedelta(days=7)
        new_this_week = db.query(User).filter(
            User.created_at >= week_ago
        ).count()
        
        return {
            "success": True,
            "statistics": {
                "total": total_users,
                "active": active_users,
                "by_role": users_by_role,
                "new_this_month": new_this_month,
                "new_this_week": new_this_week,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la récupération des statistiques: {str(e)}"
        )


@router.get("/statistics/sessions")
async def get_sessions_statistics(
    db: Session = Depends(get_db)
):
    """
    Récupère les statistiques des sessions actives
    """
    try:
        # TODO: Implémenter le comptage des sessions actives
        # Pour l'instant, on retourne 0
        # Il faudrait créer une table Session pour tracker les sessions actives
        
        return {
            "success": True,
            "statistics": {
                "active_sessions": 0,
                "unique_users": 0,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la récupération des sessions: {str(e)}"
        )

