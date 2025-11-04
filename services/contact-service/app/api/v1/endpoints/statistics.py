"""
Endpoints pour les statistiques des contacts
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.contact import Contact

router = APIRouter()


@router.get("/statistics/contacts")
async def get_contacts_statistics(
    db: Session = Depends(get_db)
):
    """
    Récupère les statistiques des contacts
    """
    try:
        # Nombre total de contacts
        total_contacts = db.query(Contact).count()
        
        # Nouveaux contacts ce mois
        first_day_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        new_this_month = db.query(Contact).filter(
            Contact.created_at >= first_day_of_month
        ).count()
        
        # Nouveaux contacts cette semaine
        week_ago = datetime.utcnow() - timedelta(days=7)
        new_this_week = db.query(Contact).filter(
            Contact.created_at >= week_ago
        ).count()
        
        return {
            "success": True,
            "statistics": {
                "total": total_contacts,
                "this_month": new_this_month,
                "this_week": new_this_week,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la récupération des statistiques: {str(e)}"
        )

