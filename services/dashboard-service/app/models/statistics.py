"""
Modèles pour les statistiques applicatives et leur historique
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class StatisticsTimeline(Base):
    """Historique des statistiques applicatives"""
    __tablename__ = "statistics_timeline"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Statistiques utilisateurs
    total_users = Column(Integer, default=0)
    active_users = Column(Integer, default=0)
    users_by_role = Column(JSON, default={})
    
    # Statistiques candidatures
    total_applications = Column(Integer, default=0)
    applications_by_status = Column(JSON, default={})
    applications_by_type = Column(JSON, default={})
    new_this_week = Column(Integer, default=0)
    new_this_month = Column(Integer, default=0)
    
    # Statistiques entreprises
    total_companies = Column(Integer, default=0)
    companies_by_industry = Column(JSON, default={})
    companies_by_size = Column(JSON, default={})
    
    # Statistiques contacts
    total_contacts = Column(Integer, default=0)
    
    # Statistiques entretiens
    total_interviews = Column(Integer, default=0)
    interviews_scheduled = Column(Integer, default=0)
    interviews_completed = Column(Integer, default=0)
    
    # Statistiques appels
    total_calls = Column(Integer, default=0)
    
    # Statistiques relances
    total_followups = Column(Integer, default=0)
    followups_pending = Column(Integer, default=0)
    
    # Statistiques événements
    total_events = Column(Integer, default=0)
    
    # Données brutes complètes (pour référence)
    raw_data = Column(JSON, default={})
    
    def to_dict(self):
        """Convertit le modèle en dictionnaire"""
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'users': {
                'total': self.total_users,
                'active': self.active_users,
                'by_role': self.users_by_role or {}
            },
            'applications': {
                'total': self.total_applications,
                'by_status': self.applications_by_status or {},
                'by_type': self.applications_by_type or {},
                'this_week': self.new_this_week,
                'this_month': self.new_this_month
            },
            'companies': {
                'total': self.total_companies,
                'by_industry': self.companies_by_industry or {},
                'by_size': self.companies_by_size or {}
            },
            'contacts': {
                'total': self.total_contacts
            },
            'interviews': {
                'total': self.total_interviews,
                'scheduled': self.interviews_scheduled,
                'completed': self.interviews_completed
            },
            'calls': {
                'total': self.total_calls
            },
            'followups': {
                'total': self.total_followups,
                'pending': self.followups_pending
            },
            'events': {
                'total': self.total_events
            }
        }


class ApplicationStatistics(Base):
    """Statistiques actuelles (snapshot le plus récent)"""
    __tablename__ = "application_statistics"
    
    id = Column(Integer, primary_key=True, index=True)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Stats utilisateurs
    total_users = Column(Integer, default=0)
    active_users = Column(Integer, default=0)
    
    # Stats candidatures
    total_applications = Column(Integer, default=0)
    applications_sent = Column(Integer, default=0)
    applications_in_review = Column(Integer, default=0)
    applications_interview = Column(Integer, default=0)
    applications_rejected = Column(Integer, default=0)
    
    # Stats entreprises
    total_companies = Column(Integer, default=0)
    
    # Stats contacts
    total_contacts = Column(Integer, default=0)
    
    # Stats entretiens
    total_interviews = Column(Integer, default=0)
    
    # Données JSON complètes
    full_data = Column(JSON, default={})

