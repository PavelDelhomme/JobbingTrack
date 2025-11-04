# 🚀 Guide de Démarrage - Services de Sécurité

## Problèmes identifiés et corrigés

### 1. Erreur 404 sur `/api/v1/security/logs`
**Cause**: Le security-service n'était pas démarré
**Solution**: Démarrer le security-service sur le port 3017

### 2. Erreur 500 sur `/api/v1/persistence/security/summary`
**Cause**: Mauvaise URL appelée (metrics-aggregator au lieu de security-service)
**Solution**: Correction dans `analytics.service.ts` pour appeler le bon service

## 📋 Pré-requis

1. **PostgreSQL** doit être en cours d'exécution
2. **Toutes les bases de données** doivent être créées
3. **API Gateway** doit être démarré (port 3000)

## 🔧 Démarrage du Security Service

### Méthode 1: Docker (Recommandé)

```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack/backend

# Démarrer tous les services
docker-compose up -d

# Vérifier que security-service est démarré
docker ps | grep security-service

# Voir les logs du security-service
docker logs -f security-service
```

### Méthode 2: Démarrage local

```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack/backend/security-service

# Installer les dépendances (si ce n'est pas déjà fait)
npm install

# Créer la base de données PostgreSQL
createdb security_db

# Configurer les variables d'environnement
cat > .env << EOF
PORT=3017
DATABASE_URL="postgresql://user:password@localhost:5432/security_db"
NODE_ENV=development
EOF

# Initialiser Prisma
npx prisma generate
npx prisma migrate dev

# Démarrer le service
npm start
```

## ✅ Vérifications

### 1. Vérifier que les services sont démarrés

```bash
# API Gateway (Port 3000)
curl http://localhost:3000/health

# Security Service (Port 3017)
curl http://localhost:3017/health

# Metrics Aggregator (Port 3014)
curl http://localhost:8014/health
```

### 2. Tester les routes de sécurité via l'API Gateway

```bash
# Récupérer les logs de sécurité
curl http://localhost:3000/api/v1/security/logs?limit=10

# Récupérer les statistiques de sécurité
curl http://localhost:3000/api/v1/security/stats?days=7

# Récupérer les métriques de sécurité
curl http://localhost:3000/api/v1/security/metrics?days=7
```

### 3. Tester depuis le frontend

1. Ouvrir le navigateur: `http://localhost:8080`
2. Aller dans **Backoffice** > **Sécurité & Logs** > **Logs de Sécurité**
3. Aller dans **Backoffice** > **Sécurité & Logs** > **Analyse de Sécurité**

## 🐛 Dépannage

### Erreur: "Cannot connect to PostgreSQL"

```bash
# Vérifier que PostgreSQL est démarré
systemctl status postgresql

# Ou sur macOS
brew services list

# Démarrer PostgreSQL si nécessaire
systemctl start postgresql
# Ou sur macOS
brew services start postgresql
```

### Erreur: "Table security_logs does not exist"

```bash
cd backend/security-service
npx prisma migrate dev
```

### Erreur: "Port 3017 already in use"

```bash
# Trouver le processus utilisant le port
lsof -i :3017

# Tuer le processus
kill -9 <PID>
```

### Le security-service ne démarre pas

```bash
# Vérifier les logs
cd backend/security-service
npm start

# Si erreur de dépendances
rm -rf node_modules package-lock.json
npm install
```

## 📊 Générer des données de test

Une fois le security-service démarré, vous pouvez générer des données de test :

```bash
# Via l'API
curl -X POST http://localhost:3000/api/v1/security/generate-dev-data

# Ou démarrer la génération continue (toutes les 5 minutes)
curl -X POST http://localhost:3000/api/v1/security/generate-continuous \
  -H "Content-Type: application/json" \
  -d '{"intervalMinutes": 5}'
```

## 🔍 Vérifier que tout fonctionne

### 1. Console du navigateur

Ouvrir la console (F12) et vérifier qu'il n'y a plus d'erreurs 404 ou 500.

### 2. Logs du backend

```bash
# API Gateway
docker logs api-gateway | tail -n 50

# Security Service
docker logs security-service | tail -n 50
```

### 3. Base de données

```bash
# Vérifier que des logs sont enregistrés
psql -U user -d security_db -c "SELECT COUNT(*) FROM security_logs;"

# Voir les derniers logs
psql -U user -d security_db -c "SELECT * FROM security_logs ORDER BY timestamp DESC LIMIT 10;"
```

## 📝 Routes disponibles

### Security Service (via API Gateway)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/v1/security/logs` | Récupérer les logs de sécurité |
| POST | `/api/v1/security/logs` | Créer un log de sécurité |
| GET | `/api/v1/security/metrics` | Métriques de sécurité |
| GET | `/api/v1/security/stats` | Statistiques détaillées |
| GET | `/api/v1/security/trends` | Tendances par heure |
| GET | `/api/v1/security/alerts` | Alertes de sécurité |
| POST | `/api/v1/security/analyze` | Déclencher analyse |

## 🔐 Authentification

Les routes de sécurité sont protégées par le middleware d'authentification. Assurez-vous d'être connecté dans le frontend avant d'accéder aux pages de sécurité.

## 📱 URLs Frontend

- **Logs de Sécurité**: `http://localhost:8080/backoffice/security/logs`
- **Analyse de Sécurité**: `http://localhost:8080/backoffice/security/analysis`
- **Recherche Optimisée**: `http://localhost:8080/backoffice/search`

## 🎯 Prochaines étapes

1. Démarrer le security-service
2. Vérifier les logs dans la console
3. Tester les pages frontend
4. Générer des données de test si nécessaire
5. Vérifier que les logs apparaissent en temps réel

---

**Note**: Si vous rencontrez toujours des erreurs après avoir suivi ce guide, vérifiez les logs détaillés de chaque service et consultez le fichier `SYSTEME_SECURITE_README.md` pour plus de détails.

