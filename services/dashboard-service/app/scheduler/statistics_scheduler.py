"""
Planificateur de tâches pour la collecte automatique des statistiques
"""
import asyncio
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime

from app.services.app_statistics_service import app_statistics_service
from app.core.database import SessionLocal

logger = logging.getLogger(__name__)

# Instance globale du scheduler
scheduler = AsyncIOScheduler()


async def collect_statistics_task():
    """Tâche de collecte des statistiques"""
    try:
        logger.info("🔄 Démarrage de la collecte automatique des statistiques")
        db = SessionLocal()
        try:
            await app_statistics_service.collect_all_statistics(db)
            logger.info("✅ Statistiques collectées avec succès")
        finally:
            db.close()
    except Exception as e:
        logger.error(f"❌ Erreur lors de la collecte automatique: {e}")


def start_statistics_scheduler():
    """Démarre le planificateur de statistiques"""
    try:
        logger.info("🚀 Démarrage du planificateur de statistiques")
        
        # Collecter les statistiques toutes les heures
        scheduler.add_job(
            collect_statistics_task,
            trigger=IntervalTrigger(hours=1),
            id='collect_statistics_hourly',
            name='Collecte horaire des statistiques',
            replace_existing=True
        )
        
        # Collecte quotidienne à minuit pour les rapports journaliers
        scheduler.add_job(
            collect_statistics_task,
            trigger=CronTrigger(hour=0, minute=5),
            id='collect_statistics_daily',
            name='Collecte quotidienne des statistiques',
            replace_existing=True
        )
        
        # Démarrer le scheduler
        scheduler.start()
        logger.info("✅ Planificateur de statistiques démarré")
        
    except Exception as e:
        logger.error(f"❌ Erreur démarrage planificateur: {e}")


def stop_statistics_scheduler():
    """Arrête le planificateur de statistiques"""
    try:
        if scheduler.running:
            scheduler.shutdown()
            logger.info("🛑 Planificateur de statistiques arrêté")
    except Exception as e:
        logger.error(f"❌ Erreur arrêt planificateur: {e}")


def get_scheduler_status():
    """Retourne le statut du planificateur"""
    return {
        "running": scheduler.running,
        "jobs": [
            {
                "id": job.id,
                "name": job.name,
                "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None
            }
            for job in scheduler.get_jobs()
        ]
    }

