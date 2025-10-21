## 🧭 Navigation Centrale

### 📖 **Documentation du Projet**
- **[Accueil](https://github.com/PavelDelhomme/JobbingTrack/blob/main/README.md)** | **[Documentation Centralisée](../README.md)**

### 🚀 **Démarrage Rapide**
- **[Guide Installation](https://github.com/PavelDelhomme/JobbingTrack/blob/main/GUIDE-DEMARRAGE-RAPIDE.md)** | **[Guide Développement](https://github.com/PavelDelhomme/JobbingTrack/blob/main/docs/guides/getting-started.md)**

### 📡 **API & Intégration**
- **[Documentation API](https://github.com/PavelDelhomme/JobbingTrack/blob/main/docs/api/v1/endpoints.md)** | **[API Technique](https://github.com/PavelDelhomme/JobbingTrack/blob/main/docs/technical/api.md)**

### 🚀 **Déploiement**
- **[Guide Déploiement](https://github.com/PavelDelhomme/JobbingTrack/blob/main/docs/deployment/GUIDE-PORTAINER.md)** | **[Déploiement Technique](https://github.com/PavelDelhomme/JobbingTrack/blob/main/docs/technical/deployment.md)**

### 🛠️ **Outils Développement**
- **[Scripts et Makefiles](https://github.com/PavelDelhomme/JobbingTrack/blob/main/docs/scripts/makefiles.md)** | **[Documentation Technique](../technical/README.md)**

### 🔧 **Documentation Technique**
- **[Architecture](https://github.com/PavelDelhomme/JobbingTrack/blob/main/docs/technical/architecture.md)** | **[Base de Données](https://github.com/PavelDelhomme/JobbingTrack/blob/main/docs/technical/database.md)** | **[Sécurité](https://github.com/PavelDelhomme/JobbingTrack/blob/main/docs/technical/security.md)** | **[Performance](https://github.com/PavelDelhomme/JobbingTrack/blob/main/docs/technical/performance.md)**

---

# 👑 Guide d'Administration JobbingTrack

Guide complet pour les administrateurs de la plateforme JobbingTrack.

## 📋 Vue d'Ensemble

En tant qu'administrateur, vous avez accès à toutes les fonctionnalités de gestion et de supervision de la plateforme.

## 🔐 Gestion des Utilisateurs

### Accès Administrateur

1. **Connexion** avec un compte administrateur
2. **Accès** au panneau d'administration : `/backoffice/users`
3. **Gestion** des rôles et permissions

### Rôles et Permissions

| Rôle | Niveau | Permissions |
|------|--------|-------------|
| **USER** | Utilisateur standard | Accès à ses propres données |
| **ADMIN** | Administrateur | Gestion utilisateurs + statistiques |
| **SUPER_ADMIN** | Super administrateur | Accès complet à tous les modules |

### Gestion des Utilisateurs

#### Lister les Utilisateurs
```http
GET /api/v1/auth/users
Authorization: Bearer <admin_token>
```

#### Créer un Utilisateur
```http
POST /api/v1/auth/register
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "email": "newuser@company.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "USER"
}
```

#### Modifier un Utilisateur
```http
PUT /api/v1/auth/users/{userId}
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "role": "ADMIN",
  "isActive": true
}
```

## 📊 Surveillance et Analytics

### Dashboard Administrateur

#### KPIs Globaux
- **Nombre total d'utilisateurs**
- **Candidatures actives**
- **Taux de conversion**
- **Temps de réponse moyen**

#### Métriques par Période
```http
GET /api/v1/dashboard/stats?period=WEEKLY
Authorization: Bearer <admin_token>
```

### Logs et Audit

#### Consultation des Logs
```http
GET /api/v1/admin/logs/{serviceName}?lines=100
Authorization: Bearer <admin_token>
```

#### Activité Utilisateur
```http
GET /api/v1/admin/audit?userId={userId}&limit=50
Authorization: Bearer <admin_token>
```

## 🛠️ Gestion des Services

### Contrôle des Microservices

#### Redémarrer un Service
```http
POST /api/v1/admin/services/restart
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "serviceName": "application-service"
}
```

#### État des Services
```http
GET /api/v1/admin/services/status
Authorization: Bearer <admin_token>
```

### Maintenance Base de Données

#### Migrations
```bash
# Appliquer les migrations
make migrate

# Vérifier l'état des migrations
docker-compose exec auth-service npx prisma migrate status
```

#### Backup et Restauration
```bash
# Créer une sauvegarde
make backup

# Restaurer depuis une sauvegarde
./scripts/database/restore-backup.sh backup_20250101.sql
```

## 🔒 Sécurité et Conformité

### Gestion de la Sécurité

#### Audit de Sécurité
```bash
# Scanner les vulnérabilités
./scripts/security/security-audit.sh

# Vérifier les configurations
./scripts/security/config-check.sh
```

#### Gestion des Sessions
- **Limite de sessions** par utilisateur
- **Expiration automatique** des sessions inactives
- **Déconnexion forcée** en cas de suspicion

### Conformité RGPD

#### Droits des Utilisateurs
- **Export des données** : `/api/v1/users/export`
- **Suppression de compte** : `/api/v1/users/delete`
- **Rectification** : Mise à jour des données personnelles

#### Conservation des Données
```javascript
// Configuration de rétention
const dataRetention = {
  applications: 365 * 2,    // 2 ans
  user_profiles: 365 * 5,   // 5 ans après dernière activité
  audit_logs: 365 * 7,      // 7 ans (obligation légale)
  deleted_data: 30          // 30 jours avant suppression définitive
};
```

## 📈 Performance et Optimisation

### Monitoring Performance

#### Métriques Clés
- **Temps de réponse** moyen par endpoint
- **Utilisation CPU/Mémoire** par service
- **Taux d'erreur** et codes HTTP
- **Cache hit ratio** Redis

#### Optimisation
```bash
# Analyser les performances
./scripts/performance/analyze-bundle.sh

# Optimiser les images
./scripts/performance/optimize-images.sh

# Test de charge
./scripts/performance/load-test.sh
```

### Scalabilité

#### Auto-scaling
```yaml
# Configuration Kubernetes HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## 🔧 Configuration Avancée

### Variables d'Environnement Admin

#### Sécurité Renforcée
```bash
# JWT avec expiration courte pour admin
ADMIN_JWT_SECRET=super-secret-admin-key
ADMIN_JWT_EXPIRY=1h

# Rate limiting strict pour admin
ADMIN_RATE_LIMIT=10

# Audit activé pour admin
ADMIN_AUDIT_ENABLED=true
```

#### Monitoring Avancé
```bash
# Prometheus
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090

# Grafana
GRAFANA_ENABLED=true
GRAFANA_PORT=3001

# Tracing
JAEGER_ENABLED=true
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
```

### Configuration Docker Compose Admin

```yaml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports: ["9090:9090"]
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports: ["3001:3000"]
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports: ["14268:14268", "16686:16686"]
```

## 📋 Checklist Administrative

### Maintenance Quotidienne
- [ ] Vérifier les logs d'erreur
- [ ] Contrôler les métriques de performance
- [ ] Vérifier l'état des sauvegardes
- [ ] Surveiller l'utilisation des ressources

### Maintenance Hebdomadaire
- [ ] Analyse des métriques de sécurité
- [ ] Mise à jour des dépendances
- [ ] Test des sauvegardes
- [ ] Audit des permissions utilisateurs

### Maintenance Mensuelle
- [ ] Analyse des performances globales
- [ ] Mise à jour des certificats SSL
- [ ] Audit de conformité RGPD
- [ ] Planification des améliorations

## 🚨 Gestion des Incidents

### Procédure d'Incident

#### 1. Détection
- Monitoring automatique des métriques
- Alertes Slack/Email en cas d'anomalie
- Logs structurés pour le debugging

#### 2. Évaluation
```bash
# Évaluation de la sévérité
./scripts/incident/evaluate-incident.sh <incident_id>

# Analyse des impacts
./scripts/incident/impact-analysis.sh <incident_id>
```

#### 3. Containment
```bash
# Isolation de l'incident
./scripts/incident/contain-incident.sh <incident_id>

# Notification des équipes
./scripts/incident/notify-teams.sh <incident_id>
```

#### 4. Recovery
```bash
# Plan de récupération
./scripts/incident/recovery-plan.sh <incident_id>

# Restauration des services
./scripts/incident/restore-services.sh <incident_id>
```

## 📊 Rapports et Analytics

### Rapports Administrateur

#### Rapport d'Utilisation
```http
GET /api/v1/admin/reports/usage?period=MONTHLY
Authorization: Bearer <admin_token>
```

#### Rapport de Sécurité
```http
GET /api/v1/admin/reports/security?days=30
Authorization: Bearer <admin_token>
```

#### Rapport de Performance
```http
GET /api/v1/admin/reports/performance?metric=response_time
Authorization: Bearer <admin_token>
```

### Exports et Backups

#### Export Complet
```bash
# Export de toutes les données
./scripts/admin/export-all-data.sh

# Export par utilisateur
./scripts/admin/export-user-data.sh <user_id>
```

#### Backup Automatique
```bash
# Configuration cron
crontab -e
# Ajouter: 0 2 * * * /path/to/JobbingTrack/scripts/admin/automated-backup.sh
```

## 🎓 Formation Administrateur

### Modules de Formation

#### 1. Sécurité et Conformité
- Gestion des utilisateurs et permissions
- Audit et logging de sécurité
- Conformité RGPD et protection des données

#### 2. Performance et Monitoring
- Métriques et tableaux de bord
- Optimisation des performances
- Gestion des incidents

#### 3. Maintenance et Déploiement
- Déploiement en production
- Mises à jour et migrations
- Backup et restauration

### Ressources d'Apprentissage
- **[Documentation API](./../api/v1/README.md)**
- **[Guide Déploiement](./../deployment/production.md)**
- **[Guide Sécurité](./https://github.com/PavelDelhomme/JobbingTrack/blob/main/docs/technical/security.md)**

## 🆘 Support et Aide

### Contacts Support
- **Email** : admin@jobbingtrack.com
- **Issues GitHub** : https://github.com/PavelDelhomme/JobbingTrack/issues
- **Documentation** : https://github.com/PavelDelhomme/JobbingTrack/wiki

### Escalade d'Incident
1. **Niveau 1** : Auto-résolution avec `make fix`
2. **Niveau 2** : Support technique standard
3. **Niveau 3** : Équipe de développement

---

**👑 Administration JobbingTrack** - Gestion complète et sécurisée de votre plateforme de candidatures.
