"""
Service de collecte des statistiques applicatives
Collecte les données depuis les différents services et les stocke en timeline
"""
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import httpx
import asyncio
from sqlalchemy.orm import Session
from app.models.statistics import ApplicationStatistics, StatisticsTimeline
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class AppStatisticsService:
    """Service pour collecter les statistiques applicatives"""
    
    def __init__(self):
        self.auth_service_url = settings.AUTH_SERVICE_URL
        self.application_service_url = settings.APPLICATION_SERVICE_URL
        self.company_service_url = settings.COMPANY_SERVICE_URL
        self.contact_service_url = settings.CONTACT_SERVICE_URL
        self.interview_service_url = settings.INTERVIEW_SERVICE_URL
        
    async def collect_all_statistics(self, db: Session) -> Dict[str, Any]:
        """Collecte toutes les statistiques applicatives"""
        try:
            logger.info("🔄 Début de la collecte des statistiques applicatives")
            
            # Collecter toutes les statistiques en parallèle
            results = await asyncio.gather(
                self._collect_users_stats(),
                self._collect_applications_stats(),
                self._collect_companies_stats(),
                self._collect_contacts_stats(),
                self._collect_interviews_stats(),
                self._collect_calls_stats(),
                self._collect_followups_stats(),
                self._collect_events_stats(),
                return_exceptions=True
            )
            
            users_stats, apps_stats, companies_stats, contacts_stats, \
            interviews_stats, calls_stats, followups_stats, events_stats = results
            
            # Gérer les erreurs
            stats = {
                'users': users_stats if not isinstance(users_stats, Exception) else self._default_users_stats(),
                'applications': apps_stats if not isinstance(apps_stats, Exception) else self._default_apps_stats(),
                'companies': companies_stats if not isinstance(companies_stats, Exception) else self._default_companies_stats(),
                'contacts': contacts_stats if not isinstance(contacts_stats, Exception) else self._default_contacts_stats(),
                'interviews': interviews_stats if not isinstance(interviews_stats, Exception) else self._default_interviews_stats(),
                'calls': calls_stats if not isinstance(calls_stats, Exception) else self._default_calls_stats(),
                'followups': followups_stats if not isinstance(followups_stats, Exception) else self._default_followups_stats(),
                'events': events_stats if not isinstance(events_stats, Exception) else self._default_events_stats(),
            }
            
            # Calculer les statistiques agrégées
            stats['summary'] = {
                'total_users': stats['users'].get('total', 0),
                'total_applications': stats['applications'].get('total', 0),
                'total_companies': stats['companies'].get('total', 0),
                'total_contacts': stats['contacts'].get('total', 0),
                'total_interviews': stats['interviews'].get('total', 0),
                'active_users': stats['users'].get('active', 0),
                'new_this_week': stats['applications'].get('this_week', 0),
                'new_this_month': stats['applications'].get('this_month', 0),
            }
            
            # Sauvegarder dans la timeline
            await self._save_to_timeline(db, stats)
            
            logger.info("✅ Statistiques collectées avec succès")
            return stats
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la collecte des statistiques: {e}")
            raise
    
    async def _collect_users_stats(self) -> Dict[str, Any]:
        """Collecte les statistiques des utilisateurs"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.auth_service_url}/api/v1/statistics/users")
                if response.status_code == 200:
                    return response.json()
                return self._default_users_stats()
        except Exception as e:
            logger.error(f"Erreur collecte users stats: {e}")
            return self._default_users_stats()
    
    async def _collect_applications_stats(self) -> Dict[str, Any]:
        """Collecte les statistiques des candidatures"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.application_service_url}/api/v1/statistics/applications")
                if response.status_code == 200:
                    return response.json()
                return self._default_apps_stats()
        except Exception as e:
            logger.error(f"Erreur collecte applications stats: {e}")
            return self._default_apps_stats()
    
    async def _collect_companies_stats(self) -> Dict[str, Any]:
        """Collecte les statistiques des entreprises"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.company_service_url}/api/v1/statistics/companies")
                if response.status_code == 200:
                    return response.json()
                return self._default_companies_stats()
        except Exception as e:
            logger.error(f"Erreur collecte companies stats: {e}")
            return self._default_companies_stats()
    
    async def _collect_contacts_stats(self) -> Dict[str, Any]:
        """Collecte les statistiques des contacts"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.contact_service_url}/api/v1/statistics/contacts")
                if response.status_code == 200:
                    return response.json()
                return self._default_contacts_stats()
        except Exception as e:
            logger.error(f"Erreur collecte contacts stats: {e}")
            return self._default_contacts_stats()
    
    async def _collect_interviews_stats(self) -> Dict[str, Any]:
        """Collecte les statistiques des entretiens"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.interview_service_url}/api/v1/statistics/interviews")
                if response.status_code == 200:
                    return response.json()
                return self._default_interviews_stats()
        except Exception as e:
            logger.error(f"Erreur collecte interviews stats: {e}")
            return self._default_interviews_stats()
    
    async def _collect_calls_stats(self) -> Dict[str, Any]:
        """Collecte les statistiques des appels"""
        try:
            # TODO: Implémenter quand le service d'appels aura un endpoint de stats
            return self._default_calls_stats()
        except Exception as e:
            logger.error(f"Erreur collecte calls stats: {e}")
            return self._default_calls_stats()
    
    async def _collect_followups_stats(self) -> Dict[str, Any]:
        """Collecte les statistiques des relances"""
        try:
            # TODO: Implémenter quand le service de relances aura un endpoint de stats
            return self._default_followups_stats()
        except Exception as e:
            logger.error(f"Erreur collecte followups stats: {e}")
            return self._default_followups_stats()
    
    async def _collect_events_stats(self) -> Dict[str, Any]:
        """Collecte les statistiques des événements"""
        try:
            # TODO: Implémenter quand le service d'événements aura un endpoint de stats
            return self._default_events_stats()
        except Exception as e:
            logger.error(f"Erreur collecte events stats: {e}")
            return self._default_events_stats()
    
    async def _save_to_timeline(self, db: Session, stats: Dict[str, Any]):
        """Sauvegarde les statistiques dans la timeline"""
        try:
            timeline_entry = StatisticsTimeline(
                timestamp=datetime.utcnow(),
                total_users=stats['summary']['total_users'],
                active_users=stats['summary']['active_users'],
                total_applications=stats['summary']['total_applications'],
                total_companies=stats['summary']['total_companies'],
                total_contacts=stats['summary']['total_contacts'],
                total_interviews=stats['summary']['total_interviews'],
                new_this_week=stats['summary']['new_this_week'],
                new_this_month=stats['summary']['new_this_month'],
                applications_by_status=stats['applications'].get('by_status', {}),
                users_by_role=stats['users'].get('by_role', {}),
                companies_by_industry=stats['companies'].get('by_industry', {}),
                raw_data=stats
            )
            db.add(timeline_entry)
            db.commit()
            logger.info("✅ Statistiques sauvegardées dans la timeline")
        except Exception as e:
            logger.error(f"❌ Erreur sauvegarde timeline: {e}")
            db.rollback()
    
    async def get_timeline(
        self, 
        db: Session, 
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Récupère l'historique des statistiques"""
        try:
            query = db.query(StatisticsTimeline)
            
            if start_time:
                query = query.filter(StatisticsTimeline.timestamp >= start_time)
            if end_time:
                query = query.filter(StatisticsTimeline.timestamp <= end_time)
            
            timeline = query.order_by(StatisticsTimeline.timestamp.desc()).limit(limit).all()
            
            return [
                {
                    'timestamp': entry.timestamp.isoformat(),
                    'total_users': entry.total_users,
                    'active_users': entry.active_users,
                    'total_applications': entry.total_applications,
                    'total_companies': entry.total_companies,
                    'total_contacts': entry.total_contacts,
                    'total_interviews': entry.total_interviews,
                    'new_this_week': entry.new_this_week,
                    'new_this_month': entry.new_this_month,
                    'applications_by_status': entry.applications_by_status,
                    'users_by_role': entry.users_by_role,
                    'companies_by_industry': entry.companies_by_industry,
                }
                for entry in timeline
            ]
        except Exception as e:
            logger.error(f"❌ Erreur récupération timeline: {e}")
            return []
    
    # Méthodes pour les valeurs par défaut
    def _default_users_stats(self) -> Dict[str, Any]:
        return {
            'total': 0,
            'active': 0,
            'by_role': {},
            'new_this_month': 0,
            'new_this_week': 0
        }
    
    def _default_apps_stats(self) -> Dict[str, Any]:
        return {
            'total': 0,
            'by_status': {},
            'by_type': {},
            'this_month': 0,
            'this_week': 0
        }
    
    def _default_companies_stats(self) -> Dict[str, Any]:
        return {
            'total': 0,
            'by_industry': {},
            'by_size': {},
            'this_month': 0
        }
    
    def _default_contacts_stats(self) -> Dict[str, Any]:
        return {
            'total': 0,
            'this_month': 0
        }
    
    def _default_interviews_stats(self) -> Dict[str, Any]:
        return {
            'total': 0,
            'scheduled': 0,
            'completed': 0,
            'this_week': 0
        }
    
    def _default_calls_stats(self) -> Dict[str, Any]:
        return {
            'total': 0,
            'this_week': 0
        }
    
    def _default_followups_stats(self) -> Dict[str, Any]:
        return {
            'total': 0,
            'pending': 0
        }
    
    def _default_events_stats(self) -> Dict[str, Any]:
        return {
            'total': 0,
            'this_month': 0
        }


# Instance globale du service
app_statistics_service = AppStatisticsService()

