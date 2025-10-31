# 🚀 Commandes Utiles - JobbingTrack

## 📊 Métriques & Monitoring

### Vérifier la santé des services

```bash
# Service métriques
curl http://localhost:3014/api/v1/health

# Service auth
curl http://localhost:3001/health

# API Gateway
curl http://localhost:3000/health
```

### Récupérer les métriques

```bash
# Statistiques de persistance
curl http://localhost:3014/api/v1/persistence/stats | jq

# Historique système (10 derniers points)
curl http://localhost:3014/api/v1/persistence/system/metrics?limit=10 | jq

# Métriques d'un conteneur spécifique
curl http://localhost:3014/api/v1/persistence/containers/jobbingtrack-auth-service/metrics?limit=10 | jq

# Disponibilité d'un service (dernières 24h)
curl http://localhost:3014/api/v1/persistence/services/auth-service/availability?hours=24 | jq
```

### Logs des conteneurs

```bash
# Logs depuis la base de données (historique)
curl "http://localhost:3014/api/v1/persistence/containers/jobbingtrack-auth-service/logs?limit=50" | jq

# Logs en temps réel depuis Docker
curl "http://localhost:3014/api/v1/persistence/containers/jobbingtrack-auth-service/logs/live?tail=100" | jq

# Recherche dans les logs
curl "http://localhost:3014/api/v1/persistence/containers/jobbingtrack-auth-service/logs?search=error&limit=20" | jq

# Filtrer par niveau (ERROR, WARN, INFO, etc.)
curl "http://localhost:3014/api/v1/persistence/containers/jobbingtrack-auth-service/logs?level=ERROR&limit=20" | jq
```

### Métriques de sécurité

```bash
# Résumé de sécurité (dernières 24h)
curl http://localhost:3014/api/v1/persistence/security/summary?hours=24 | jq

# Métriques détaillées
curl http://localhost:3014/api/v1/persistence/security/metrics?hours=24 | jq
```

### Inspection de conteneur

```bash
# Détails complets d'un conteneur
curl http://localhost:3014/api/v1/persistence/containers/jobbingtrack-auth-service/inspect | jq

# Stats temps réel
curl http://localhost:3014/api/v1/persistence/containers/jobbingtrack-auth-service/stats | jq
```

---

## 🔐 Reset de Mot de Passe

### Tester le reset

```bash
# Utiliser le script de test
./scripts/test-reset-password.sh redacted@example.invalid

# Ou manuellement
curl -X POST http://localhost:3001/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"redacted@example.invalid"}'
```

### Vérifier le token

```bash
# Remplacer TOKEN par le token reçu par email
curl http://localhost:3001/api/v1/auth/reset-password/TOKEN
```

### Réinitialiser le mot de passe

```bash
curl -X POST http://localhost:3001/api/v1/auth/reset-password/TOKEN \
  -H "Content-Type: application/json" \
  -d '{"password":"NouveauMotDePasse123"}'
```

---

## 🗄️ Base de Données

### Migrations Prisma

```bash
# Service metrics-aggregator
cd backend/metrics-aggregator-service
npx prisma migrate dev
npx prisma generate

# Appliquer en production
npx prisma migrate deploy
```

### Consulter les données

```bash
# Ouvrir Prisma Studio
cd backend/metrics-aggregator-service
npx prisma studio
```

### Nettoyage manuel

```bash
# Nettoyer les données de plus de 30 jours
curl -X POST http://localhost:3014/api/v1/persistence/cleanup \
  -H "Content-Type: application/json" \
  -d '{"daysToKeep":30}'
```

---

## 🐳 Docker

### Logs des services

```bash
# Logs du service métriques
docker logs -f jobbingtrack-metrics-aggregator-service

# Logs du service auth
docker logs -f jobbingtrack-auth-service

# Logs du frontend
docker logs -f jobbingtrack-frontend

# Tous les logs JobbingTrack
docker logs -f $(docker ps --filter "name=jobbingtrack-" -q)
```

### Redémarrer les services

```bash
# Service métriques
docker-compose restart metrics-aggregator-service

# Service auth
docker-compose restart auth-service

# Frontend
docker-compose restart frontend

# Tous les services
docker-compose restart
```

### Reconstruire les services

```bash
# Service métriques (après modifications)
docker-compose build metrics-aggregator-service
docker-compose up -d metrics-aggregator-service

# Service auth (après modifications)
docker-compose build auth-service
docker-compose up -d auth-service
```

---

## 📧 MailHog (Tests locaux)

### Démarrer MailHog

```bash
# Ajouter au docker-compose.yml puis:
docker-compose up -d mailhog
```

### Accéder à l'interface

```
Interface Web: http://localhost:8025
SMTP Port: 1025
```

### Test d'envoi

```bash
# Envoyer un email de test
curl -X POST http://localhost:3001/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"redacted@example.invalid"}'

# Vérifier dans MailHog: http://localhost:8025
```

---

## 🔍 Debugging

### Vérifier la connectivité

```bash
# Depuis l'hôte vers les services
curl http://localhost:3014/api/v1/health
curl http://localhost:3001/health

# Depuis un conteneur vers un autre
docker exec jobbingtrack-auth-service curl http://metrics-aggregator-service:3014/api/v1/health
```

### Inspecter les variables d'environnement

```bash
# Service auth
docker exec jobbingtrack-auth-service env | grep SMTP

# Service metrics
docker exec jobbingtrack-metrics-aggregator-service env | grep DATABASE
```

### Tester la connexion SMTP

```bash
# Depuis le conteneur auth
docker exec -it jobbingtrack-auth-service node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
transporter.verify((error, success) => {
  console.log(error ? 'SMTP Error: ' + error : 'SMTP OK');
});
"
```

---

## 📊 Monitoring

### WebSocket (temps réel)

```javascript
// Dans la console du navigateur
const socket = io('http://localhost:3014');
socket.on('metrics-update', (data) => {
  console.log('Métriques:', data);
});
```

### Exporter les métriques

```bash
# Dernières 24h en JSON
curl "http://localhost:3014/api/v1/persistence/system/metrics?limit=288" > metrics_24h.json

# Logs des dernières 24h
curl "http://localhost:3014/api/v1/persistence/containers/jobbingtrack-auth-service/logs?limit=10000" > logs_24h.json
```

---

## 🧪 Tests

### Test complet du reset de mot de passe

```bash
./scripts/test-reset-password.sh redacted@example.invalid
```

### Test des métriques

```bash
# Créer du trafic
for i in {1..100}; do
  curl http://localhost:3001/health &
done

# Attendre 10 secondes
sleep 10

# Vérifier les métriques
curl http://localhost:3014/api/v1/persistence/stats | jq
```

---

## 🆘 Problèmes Courants

### Emails non reçus

1. Vérifier les logs : `docker logs jobbingtrack-auth-service`
2. Vérifier la config SMTP : `docker exec jobbingtrack-auth-service env | grep SMTP`
3. Tester avec MailHog
4. Vérifier le dossier spam

### Métriques non enregistrées

1. Vérifier les logs : `docker logs jobbingtrack-metrics-aggregator-service`
2. Vérifier Prisma : `cd backend/metrics-aggregator-service && npx prisma studio`
3. Vérifier la connexion DB : `docker exec jobbingtrack-metrics-aggregator-service env | grep DATABASE`

### Page de reset ne fonctionne pas

1. Vérifier que le frontend est démarré
2. Vérifier la route Next.js : `/reset-password/[token]`
3. Vérifier les logs du navigateur (console)
4. Vérifier que le token est valide (pas expiré)

---

## 📚 Documentation

- [Configuration SMTP](backend/auth-service/SMTP_CONFIGURATION.md)
- [Guide complet](AMELIORATIONS_METRIQUES_ET_RESET_PASSWORD.md)
- [Architecture](docs/architecture/)
- [API Documentation](docs/api/)

---

**Besoin d'aide ?** Consultez les logs et la documentation ci-dessus !

