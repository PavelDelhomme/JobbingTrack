# Système de Statistiques Applicatives - Documentation Complète

## 📊 Vue d'ensemble

Ce document décrit le système complet de collecte, stockage et affichage des statistiques applicatives pour JobbingTrack.

## 🏗️ Architecture

### Backend

```
dashboard-service/
├── app/
│   ├── models/
│   │   └── statistics.py                    # Modèles BDD pour la timeline
│   ├── services/
│   │   └── app_statistics_service.py        # Service de collecte
│   ├── api/v1/endpoints/
│   │   └── app_statistics.py                # Endpoints API
│   └── scheduler/
│       └── statistics_scheduler.py           # Collecte automatique

auth-service/app/api/v1/endpoints/
└── statistics.py                              # Stats utilisateurs

application-service/app/api/v1/endpoints/
└── statistics.py                              # Stats candidatures

company-service/app/api/v1/endpoints/
└── statistics.py                              # Stats entreprises

contact-service/app/api/v1/endpoints/
└── statistics.py                              # Stats contacts

interview-service/app/api/v1/endpoints/
└── statistics.py                              # Stats entretiens
```

### Frontend

```
frontend/src/
├── lib/services/
│   └── statisticsService.ts                  # Service API frontend
└── app/(admin)/statistics/
    └── page.tsx                               # Page de visualisation
```

## 🔧 Composants Backend

### 1. Service de Collecte (`app_statistics_service.py`)

**Fonctionnalités** :
- Collecte les statistiques depuis tous les microservices
- Agrège les données
- Sauvegarde dans la timeline
- Gère les erreurs gracieusement

**Méthodes principales** :
- `collect_all_statistics()` : Collecte toutes les stats
- `get_timeline()` : Récupère l'historique
- `_save_to_timeline()` : Sauvegarde les données

```python
# Exemple d'utilisation
stats = await app_statistics_service.collect_all_statistics(db)
timeline = await app_statistics_service.get_timeline(
    db=db,
    start_time=datetime.now() - timedelta(days=30),
    limit=1000
)
```

### 2. Modèles de Base de Données (`statistics.py`)

#### Table `statistics_timeline`
Stocke l'historique complet des statistiques avec un snapshot horaire.

**Colonnes principales** :
- `timestamp` : Horodatage du snapshot
- `total_users`, `active_users` : Statistiques utilisateurs
- `total_applications`, `applications_by_status` : Statistiques candidatures
- `total_companies`, `companies_by_industry` : Statistiques entreprises
- `total_contacts`, `total_interviews` : Autres statistiques
- `raw_data` : JSON complet pour référence

**Index** :
- Index sur `timestamp` pour les requêtes temporelles rapides

#### Table `application_statistics`
Snapshot actuel (optionnel, pour les requêtes rapides)

### 3. Planificateur de Tâches (`statistics_scheduler.py`)

**Collecte automatique** :
- Toutes les heures : Collecte régulière
- Tous les jours à minuit : Rapport journalier

```python
# Démarrer le planificateur au démarrage de l'application
from app.scheduler.statistics_scheduler import start_statistics_scheduler

start_statistics_scheduler()
```

### 4. Endpoints API

#### Dashboard Service (`/api/v1/statistics`)

**GET `/api/v1/statistics`**
- Récupère les statistiques actuelles
- Déclenche une collecte en temps réel
- Retourne : applications, users, companies, contacts, interviews

```json
{
  "success": true,
  "statistics": {
    "applications": { "total": 150, "by_status": {...}, "this_week": 12 },
    "users": { "total": 45, "active": 32, "by_role": {...} },
    "companies": { "total": 80, "by_industry": {...} },
    "summary": { "total_users": 45, "total_applications": 150, ... }
  },
  "timestamp": "2025-11-03T12:00:00Z"
}
```

**GET `/api/v1/statistics/timeline`**
- Récupère l'historique des statistiques
- Paramètres : `time_range` (1h, 6h, 24h, 7d, 30d, 90d, 1y), `limit`
- Retourne : tableau de snapshots historiques

**POST `/api/v1/statistics/collect`**
- Force une collecte immédiate
- Utile pour les tests ou mises à jour manuelles

**GET `/api/v1/statistics/summary`**
- Récupère un résumé rapide
- Optimisé pour les dashboards

#### Endpoints de chaque service

**Auth Service** :
- `GET /api/v1/statistics/users` : Statistiques utilisateurs
- `GET /api/v1/statistics/sessions` : Sessions actives

**Application Service** :
- `GET /api/v1/statistics/applications` : Statistiques candidatures
- `GET /api/v1/statistics/applications/timeline` : Évolution temporelle

**Company Service** :
- `GET /api/v1/statistics/companies` : Statistiques entreprises

**Contact Service** :
- `GET /api/v1/statistics/contacts` : Statistiques contacts

**Interview Service** :
- `GET /api/v1/statistics/interviews` : Statistiques entretiens

## 🎨 Frontend

### Service TypeScript (`statisticsService.ts`)

**Méthodes disponibles** :

```typescript
// Récupérer les statistiques actuelles
const stats = await statisticsService.getCurrentStatistics()

// Récupérer la timeline
const timeline = await statisticsService.getStatisticsTimeline('30d', 1000)

// Récupérer un résumé
const summary = await statisticsService.getStatisticsSummary()

// Forcer une collecte
await statisticsService.collectStatistics()

// Timeline des candidatures
const appTimeline = await statisticsService.getApplicationsTimeline(30)
```

### Page Statistics (`statistics/page.tsx`)

La page affiche maintenant les **vraies données** au lieu des données mockées :

**Sections principales** :
1. **Overview** : Vue d'ensemble avec métriques clés
2. **System** : Métriques système et performance
3. **Services** : État des services
4. **Network** : Métriques réseau
5. **Security** : Alertes de sécurité
6. **Logs** : Logs système

**Graphiques** :
- Graphiques temporels pour voir l'évolution
- Graphiques circulaires pour les répartitions
- Graphiques à barres pour les comparaisons

## 📈 Métriques Collectées

### Utilisateurs
- **Total** : Nombre total d'utilisateurs
- **Actifs** : Utilisateurs connectés dans les 30 derniers jours
- **Par rôle** : Répartition USER/ADMIN/SUPER_ADMIN
- **Nouveaux** : Ce mois, cette semaine

### Candidatures
- **Total** : Nombre total de candidatures
- **Par statut** : DRAFT, SENT, IN_REVIEW, INTERVIEW_SCHEDULED, etc.
- **Par type** : FULL_TIME, PART_TIME, CONTRACT
- **Période** : Ce mois, cette semaine, aujourd'hui
- **Taux de conversion** : % de candidatures → entretiens

### Entreprises
- **Total** : Nombre total d'entreprises
- **Par secteur** : Technology, Finance, Healthcare, etc.
- **Par taille** : Startup, SMB, Enterprise
- **Nouvelles** : Ce mois, cette semaine

### Contacts
- **Total** : Nombre total de contacts
- **Nouveaux** : Ce mois, cette semaine

### Entretiens
- **Total** : Nombre total d'entretiens
- **Par statut** : SCHEDULED, COMPLETED, CANCELLED
- **Planifiés** : Nombre d'entretiens programmés
- **À venir** : Entretiens futurs
- **Cette semaine** : Entretiens récents

## 🚀 Déploiement

### 1. Migrations Base de Données

```bash
# Dashboard Service
cd services/dashboard-service
alembic revision --autogenerate -m "Add statistics tables"
alembic upgrade head
```

### 2. Installation Dépendances

```bash
# Dashboard Service
pip install apscheduler httpx

# Chaque service
pip install sqlalchemy
```

### 3. Configuration

**Variables d'environnement** :
```bash
# Dashboard Service
AUTH_SERVICE_URL=http://auth-service:8000
APPLICATION_SERVICE_URL=http://application-service:8000
COMPANY_SERVICE_URL=http://company-service:8000
CONTACT_SERVICE_URL=http://contact-service:8000
INTERVIEW_SERVICE_URL=http://interview-service:8000
```

### 4. Démarrage

```bash
# Le planificateur démarre automatiquement avec le service
python app/main.py
```

## 📊 Utilisation

### Collecte Manuelle

```bash
# Via API
curl -X POST http://localhost:3000/api/v1/statistics/collect \
  -H "Authorization: Bearer YOUR_TOKEN"

# Via frontend
# Bouton "Actualiser" dans la page Statistics
```

### Consultation

1. **Page Statistics** : `/statistics`
   - Vue complète des statistiques
   - Graphiques temporels
   - Filtres par période

2. **Dashboard** : `/backoffice`
   - Résumé rapide
   - Métriques clés
   - Widgets interactifs

### Exemples de Requêtes

```typescript
// Frontend - Récupérer les stats des 7 derniers jours
const stats = await statisticsService.getStatisticsTimeline('7d')

// Afficher l'évolution des candidatures
const timeline = await statisticsService.getApplicationsTimeline(30)

// Graphique d'évolution
const data = timeline.map(entry => ({
  date: entry.date,
  count: entry.count
}))
```

## 🔍 Monitoring

### Logs

```
[STATISTICS] 🔄 Début de la collecte des statistiques applicatives
[STATISTICS] ✅ Statistiques des utilisateurs collectées: 45 users
[STATISTICS] ✅ Statistiques des candidatures collectées: 150 applications
[STATISTICS] ✅ Statistiques collectées avec succès
[STATISTICS] ✅ Statistiques sauvegardées dans la timeline
```

### Erreurs Communes

1. **Service indisponible** :
   ```
   ⚠️ Erreur collecte applications stats: Connection refused
   ```
   → Vérifier que le service est démarré

2. **Timeout** :
   ```
   ⚠️ Erreur collecte users stats: Timeout
   ```
   → Augmenter le timeout dans `httpx.AsyncClient(timeout=30.0)`

3. **Token invalide** :
   ```
   ❌ Unauthorized: Invalid token
   ```
   → Vérifier l'authentification entre services

## 🧪 Tests

### Tests Unitaires

```python
# Test du service de collecte
async def test_collect_statistics():
    db = TestSession()
    stats = await app_statistics_service.collect_all_statistics(db)
    assert stats['summary']['total_users'] >= 0
    assert 'applications' in stats
```

### Tests d'Intégration

```python
# Test de l'endpoint
async def test_statistics_endpoint():
    response = await client.get("/api/v1/statistics")
    assert response.status_code == 200
    data = response.json()
    assert 'statistics' in data
```

### Tests Frontend

```typescript
// Test du service
test('getCurrentStatistics récupère les données', async () => {
  const stats = await statisticsService.getCurrentStatistics()
  expect(stats).toHaveProperty('applications')
  expect(stats.applications.total).toBeGreaterThanOrEqual(0)
})
```

## 📝 TODO / Améliorations Futures

### Priorité Haute
- [x] Créer le service de collecte
- [x] Créer les modèles de timeline
- [x] Créer les endpoints dans chaque service
- [x] Mettre à jour le frontend
- [ ] Ajouter les migrations de base de données
- [ ] Tester la collecte automatique

### Priorité Moyenne
- [ ] Ajouter le cache Redis pour les statistiques
- [ ] Optimiser les requêtes SQL avec des index
- [ ] Ajouter des alertes si les stats sont anormales
- [ ] Créer un rapport PDF téléchargeable

### Priorité Basse
- [ ] Ajouter des prédictions ML sur les tendances
- [ ] Exporter les stats vers Excel/CSV
- [ ] Créer un widget personnalisable
- [ ] Ajouter des comparaisons période à période

## 🔐 Sécurité

1. **Authentification** : Tous les endpoints nécessitent un token valide
2. **Autorisation** : Seuls les admins peuvent forcer la collecte
3. **Rate Limiting** : Limiter les requêtes à 60/minute
4. **Validation** : Valider toutes les entrées
5. **Logs** : Logger tous les accès aux statistiques sensibles

## 💡 Bonnes Pratiques

1. **Collecte Régulière** : Ne pas collecter trop souvent (max 1x/heure)
2. **Nettoyage** : Archiver les données > 1 an
3. **Performance** : Utiliser des index sur `timestamp`
4. **Erreurs** : Toujours retourner des valeurs par défaut
5. **Cache** : Cacher les résumés pendant 5 minutes

## 📚 Références

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [APScheduler Documentation](https://apscheduler.readthedocs.io/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Recharts Documentation](https://recharts.org/)

---

**Créé le** : 2025-11-03  
**Dernière mise à jour** : 2025-11-03  
**Auteur** : JobbingTrack Dev Team

