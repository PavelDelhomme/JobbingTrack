# 🚀 Quick Fix - Erreurs 500 sur /api/v1/companies et /api/v1/applications

## ⚡ Solution Rapide

Si vous avez des erreurs 500 sur `/api/v1/companies` et `/api/v1/applications`, exécutez ces commandes dans l'ordre :

```bash
# 1. Créer toutes les tables Prisma
make db-push-all

# 2. Redémarrer les services concernés
docker-compose restart company-service application-service

# 3. Attendre quelques secondes que les services redémarrent
sleep 5

# 4. Vérifier que les services sont bien démarrés
docker ps | grep -E "company-service|application-service"
```

## 🔍 Vérification

Pour vérifier que tout fonctionne :

```bash
# 1. Se connecter et récupérer le token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@jobbingtrack.com","password":"password123"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))")

# 2. Tester /api/v1/companies
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/companies | python3 -m json.tool

# 3. Tester /api/v1/applications
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/applications | python3 -m json.tool
```

## 📝 Explication

Les erreurs 500 sont causées par des tables Prisma manquantes. Les fallbacks P2021 ont été ajoutés, mais ils nécessitent que les services soient redémarrés pour charger le nouveau code.

**Important** : Même avec les fallbacks, il est recommandé d'exécuter `make db-push-all` pour créer toutes les tables et éviter les erreurs.

## 🔄 Workflow Complet

```bash
# Option 1 : Utiliser make up-full (recommandé)
make up-full  # Exécute automatiquement db-push-all si nécessaire

# Option 2 : Manuellement
make db-push-all
docker-compose restart company-service application-service
```

