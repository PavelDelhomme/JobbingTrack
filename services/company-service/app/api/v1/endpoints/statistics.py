"""
Endpoints pour les statistiques des entreprises
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.company import Company

router = APIRouter()


@router.get("/statistics/companies")
async def get_companies_statistics(
    db: Session = Depends(get_db)
):
    """
    Récupère les statistiques des entreprises
    """
    try:
        # Nombre total d'entreprises
        total_companies = db.query(Company).count()
        
        # Entreprises par secteur
        companies_by_industry = {}
        if hasattr(Company, 'industry'):
            companies_by_industry = dict(
                db.query(Company.industry, func.count(Company.id))
                .group_by(Company.industry)
                .all()
            )
        
        # Entreprises par taille
        companies_by_size = {}
        if hasattr(Company, 'size'):
            companies_by_size = dict(
                db.query(Company.size, func.count(Company.id))
                .group_by(Company.size)
                .all()
            )
        
        # Nouvelles entreprises ce mois
        first_day_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        new_this_month = db.query(Company).filter(
            Company.created_at >= first_day_of_month
        ).count()
        
        # Nouvelles entreprises cette semaine
        week_ago = datetime.utcnow() - timedelta(days=7)
        new_this_week = db.query(Company).filter(
            Company.created_at >= week_ago
        ).count()
        
        return {
            "success": True,
            "statistics": {
                "total": total_companies,
                "by_industry": companies_by_industry,
                "by_size": companies_by_size,
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

