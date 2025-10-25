# 📡 Endpoints API - JobbingTrack

Liste exhaustive de tous les endpoints disponibles dans l'API JobbingTrack v4.1.

[← Retour au README principal](../../README.md)

## 🎯 Vue d'ensemble

Cette section liste tous les endpoints disponibles par service avec leurs méthodes HTTP, paramètres et codes de réponse.

## 🔗 API Gateway Health

### Endpoints système
```http
GET /health
GET /metrics
GET /ready
GET /version
```

## 🔐 Authentification (Port 3001)

### Sessions
```http
POST   /auth/login
POST   /auth/register
POST   /auth/logout
GET    /auth/verify
POST   /auth/refresh
POST   /auth/forgot-password
POST   /auth/reset-password
```

### Utilisateurs
```http
GET    /auth/users
GET    /auth/users/{id}
POST   /auth/users
PUT    /auth/users/{id}
DELETE /auth/users/{id}
```

## 📋 Applications (Port 3002)

### CRUD Applications
```http
GET    /applications
GET    /applications/{id}
POST   /applications
PUT    /applications/{id}
DELETE /applications/{id}
```

### Actions
```http
GET    /applications/{id}/status
PUT    /applications/{id}/status
GET    /applications/{id}/history
POST   /applications/{id}/archive
POST   /applications/{id}/restore
```

### Recherche et filtres
```http
GET    /applications/search
GET    /applications/export
GET    /applications/statistics
```

## 🏢 Entreprises (Port 3003)

### CRUD Companies
```http
GET    /companies
GET    /companies/{id}
POST   /companies
PUT    /companies/{id}
DELETE /companies/{id}
```

### Recherche
```http
GET    /companies/search
GET    /companies/{id}/contacts
GET    /companies/{id}/applications
```

## 👥 Contacts (Port 3004)

### CRUD Contacts
```http
GET    /contacts
GET    /contacts/{id}
POST   /contacts
PUT    /contacts/{id}
DELETE /contacts/{id}
```

### Relations
```http
GET    /contacts/{id}/companies
GET    /contacts/{id}/applications
GET    /contacts/{id}/interviews
GET    /contacts/{id}/calls
GET    /contacts/{id}/events
GET    /contacts/{id}/history
```

## 🎤 Entretiens (Port 3005)

### CRUD Interviews
```http
GET    /interviews
GET    /interviews/{id}
POST   /interviews
PUT    /interviews/{id}
DELETE /interviews/{id}
```

### Planning
```http
GET    /interviews/upcoming
GET    /interviews/today
GET    /interviews/calendar
POST   /interviews/{id}/reschedule
POST   /interviews/{id}/cancel
```

### Notes et feedback
```http
POST   /interviews/{id}/notes
GET    /interviews/{id}/feedback
PUT    /interviews/{id}/rating
```

## 📞 Appels (Port 3006)

### CRUD Calls
```http
GET    /calls
GET    /calls/{id}
POST   /calls
PUT    /calls/{id}
DELETE /calls/{id}
```

### Historique
```http
GET    /calls/history
GET    /calls/scheduled
GET    /calls/missed
POST   /calls/{id}/complete
```

## 📅 Événements (Port 3007)

### CRUD Events
```http
GET    /events
GET    /events/{id}
POST   /events
PUT    /events/{id}
DELETE /events/{id}
```

### Calendrier
```http
GET    /events/calendar
GET    /events/upcoming
GET    /events/today
GET    /events/month/{year}/{month}
```

## 🔄 Suivi (Port 3008)

### CRUD Followups
```http
GET    /followups
GET    /followups/{id}
POST   /followups
PUT    /followups/{id}
DELETE /followups/{id}
```

### Actions
```http
POST   /followups/{id}/complete
POST   /followups/{id}/postpone
GET    /followups/due
GET    /followups/overdue
```

## 👤 Profils (Port 3009)

### Profil utilisateur
```http
GET    /profiles/me
PUT    /profiles/me
POST   /profiles/avatar
DELETE /profiles/avatar
```

### Préférences
```http
GET    /profiles/preferences
PUT    /profiles/preferences
GET    /profiles/settings
PUT    /profiles/settings
```

## 🔔 Notifications (Port 3010)

### CRUD Notifications
```http
GET    /notifications
GET    /notifications/{id}
PUT    /notifications/{id}/read
DELETE /notifications/{id}
```

### Paramètres
```http
GET    /notifications/settings
PUT    /notifications/settings
POST   /notifications/test
```

## ⚙️ Workflows (Port 3011)

### CRUD Workflows
```http
GET    /workflows
GET    /workflows/{id}
POST   /workflows
PUT    /workflows/{id}
DELETE /workflows/{id}
```

### Exécution
```http
POST   /workflows/{id}/execute
GET    /workflows/{id}/runs
GET    /workflows/{id}/logs
```

## 📊 Dashboard (Port 3012)

### Analytics
```http
GET    /dashboard/overview
GET    /dashboard/analytics
GET    /dashboard/metrics
GET    /dashboard/statistics
```

### Rapports
```http
GET    /dashboard/reports
POST   /dashboard/reports
GET    /dashboard/reports/{id}
```

### Export
```http
POST   /dashboard/export
GET    /dashboard/export/{id}
```

## 🔒 Sécurité (Port 3013)

### Audit
```http
GET    /security/audit
GET    /security/audit/{id}
POST   /security/audit/search
```

### Alertes
```http
GET    /security/alerts
POST   /security/alerts
PUT    /security/alerts/{id}
DELETE /security/alerts/{id}
```

### Sessions
```http
GET    /security/sessions
DELETE /security/sessions/{id}
POST   /security/sessions/revoke-all
```

## 📈 Métriques système (Port 3018)

### Métriques
```http
GET    /system-metrics
GET    /system-metrics/{service}
GET    /system-metrics/history
GET    /system-metrics/performance
```

### Alertes
```http
GET    /system-metrics/alerts
POST   /system-metrics/alerts
PUT    /system-metrics/alerts/{id}
DELETE /system-metrics/alerts/{id}
```

## 🚀 Déploiement (Port 3016)

### Status
```http
GET    /deployment/status
GET    /deployment/services
GET    /deployment/health
```

### Actions
```http
POST   /deployment/deploy
POST   /deployment/rollback
POST   /deployment/restart
POST   /deployment/stop
POST   /deployment/start
```

### Historique
```http
GET    /deployment/history
GET    /deployment/history/{id}
GET    /deployment/logs
```

## 🐳 Docker Stats (Port 3015)

### Statistiques
```http
GET    /docker-stats
GET    /docker-stats/containers
GET    /docker-stats/images
GET    /docker-stats/volumes
GET    /docker-stats/networks
```

### Monitoring
```http
GET    /docker-stats/monitoring
GET    /docker-stats/resources
GET    /docker-stats/performance
```

---

## 📋 Codes de réponse HTTP

### Réponses de succès
- **200 OK** : Requête réussie
- **201 Created** : Ressource créée
- **204 No Content** : Succès sans contenu

### Erreurs client
- **400 Bad Request** : Requête malformée
- **401 Unauthorized** : Authentification requise
- **403 Forbidden** : Accès refusé
- **404 Not Found** : Ressource introuvable
- **409 Conflict** : Conflit de données
- **422 Unprocessable Entity** : Validation échouée
- **429 Too Many Requests** : Limite atteinte

### Erreurs serveur
- **500 Internal Server Error** : Erreur serveur
- **502 Bad Gateway** : Service indisponible
- **503 Service Unavailable** : Maintenance
- **504 Gateway Timeout** : Timeout

---

## 🔧 Filtres et paramètres

### Pagination
```
?page=1&limit=20&sort=createdAt&order=desc
```

### Filtres
```
?status=applied&companyId=123&dateFrom=2025-01-01&dateTo=2025-12-31
```

### Recherche
```
?search=term&q=query&fields=name,description
```

---

## 📚 Ressources

- [API Reference complète](api-reference.md) - Guide détaillé
- [Architecture](../core/architecture.md) - Vue technique
- [Postman Collection](https://api.jobbingtrack.com/postman)
- [OpenAPI Specification](https://api.jobbingtrack.com/openapi.json)

---

**Version**: 4.1 - Endpoints complets
**Dernière mise à jour**: Octobre 2025
