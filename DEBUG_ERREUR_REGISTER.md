# 🔍 Debug - Erreur 500 sur /api/v1/auth/register

## ❌ Erreur Rencontrée

```
POST http://localhost:8080/api/v1/auth/register 500 (Internal Server Error)
```

## 🎯 Diagnostic Rapide

Cette erreur signifie que le **backend a un problème** lors du traitement de la requête d'inscription.

---

## 🔍 Étape 1 : Vérifier que les Services Tournent

```bash
# Voir l'état de tous les services
docker ps

# Vérifier spécifiquement auth-service
docker ps | grep auth-service
```

**Attendu** : Le service `auth-service` doit être "Up" et "healthy"

---

## 📋 Étape 2 : Voir les Logs du Service Auth

```bash
# Logs en temps réel de auth-service
docker logs -f auth-service

# OU via Make
make logs-auth
```

**Cherchez** :
- ❌ Erreurs de connexion à la base de données
- ❌ Erreurs Prisma
- ❌ Erreurs de validation
- ❌ Stack traces JavaScript/TypeScript

---

## 🔧 Étape 3 : Vérifier la Base de Données

```bash
# Voir les logs de PostgreSQL
docker logs postgres

# Se connecter à PostgreSQL
docker exec -it postgres psql -U postgres -d jobbingtrack

# Dans psql, vérifier les tables
\dt

# Vérifier la table users
\d users

# Sortir
\q
```

---

## 🐛 Causes Probables

### 1. ❌ Service Auth pas démarré
**Solution** :
```bash
docker-compose up -d auth-service
```

### 2. ❌ Base de données pas initialisée
**Solution** :
```bash
# Arrêter tout
make down

# Redémarrer avec migration
make up-for-tests
```

### 3. ❌ Erreur dans le schéma Prisma
**Solution** :
```bash
# Accéder au conteneur auth-service
docker exec -it auth-service sh

# Lancer la migration
npx prisma migrate deploy

# Sortir
exit
```

### 4. ❌ Variables d'environnement manquantes
**Solution** : Vérifier le fichier `.env` ou les variables dans `docker-compose.yml`

### 5. ❌ Port 8080 occupé
**Solution** :
```bash
# Trouver le processus qui utilise le port
sudo lsof -i :8080

# Ou tuer le processus
sudo kill -9 <PID>
```

---

## 🚀 Solution Rapide (Redémarrage Complet)

```bash
# 1. Tout arrêter
make down

# 2. Nettoyer les volumes (ATTENTION : efface les données)
docker-compose down -v

# 3. Redémarrer proprement
make up-for-tests

# 4. Attendre 15-20 secondes que tout soit prêt

# 5. Vérifier l'état
make health
```

---

## 📝 Commandes de Debug Utiles

```bash
# Voir tous les logs
make logs

# Logs d'un service spécifique
docker logs auth-service
docker logs postgres
docker logs api-gateway

# Logs en temps réel
docker logs -f auth-service

# Vérifier la santé des services
make health

# Redémarrer un service spécifique
docker-compose restart auth-service

# Voir les processus Docker
docker ps -a

# Voir les réseaux Docker
docker network ls

# Inspecter un conteneur
docker inspect auth-service
```

---

## 🧪 Tester Manuellement l'Endpoint

```bash
# Test avec curl
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "redacted@example.invalid",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

**Si ça marche** : Vous verrez un JSON avec l'utilisateur créé  
**Si ça échoue** : Vous verrez le message d'erreur exact

---

## 🔍 Vérifications Spécifiques

### Vérifier que l'API Gateway fonctionne

```bash
# Test de santé
curl http://localhost:8080/health

# Test de l'endpoint auth
curl http://localhost:8080/api/v1/auth/health
```

### Vérifier la connexion entre services

```bash
# Entrer dans le conteneur api-gateway
docker exec -it api-gateway sh

# Tester la connexion à auth-service
ping auth-service
# Ou
curl http://auth-service:3001/health

# Sortir
exit
```

---

## 📊 Checklist de Diagnostic

- [ ] Tous les services Docker sont "Up"
- [ ] Le service `auth-service` est "healthy"
- [ ] PostgreSQL est accessible
- [ ] Les tables existent dans la base de données
- [ ] Les logs ne montrent pas d'erreurs critiques
- [ ] Le port 8080 est bien utilisé par api-gateway
- [ ] Les variables d'environnement sont correctes
- [ ] Prisma est bien configuré

---

## 💡 Solution la Plus Rapide

**Si vous voulez juste que ça marche maintenant** :

```bash
# Tout redémarrer proprement
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack
make down
sleep 5
make up-for-tests

# Attendre 20 secondes
sleep 20

# Tester
curl http://localhost:8080/api/v1/auth/health

# Si OK, retourner sur la page
# http://localhost:8080/backoffice/user-journey
```

---

## 📋 Après le Fix

Une fois que ça marche, faites :

```bash
# 1. Vérifier que tout fonctionne
make health

# 2. Tester l'inscription manuellement
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "redacted@example.invalid",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'

# 3. Retourner sur la page de tests
# http://localhost:8080/backoffice/user-journey

# 4. Relancer le parcours
```

---

## 🆘 Si Rien ne Marche

**Envoyez-moi** :

1. **Les logs de auth-service** :
```bash
docker logs auth-service > logs-auth.txt
cat logs-auth.txt
```

2. **Les logs de PostgreSQL** :
```bash
docker logs postgres > logs-postgres.txt
cat logs-postgres.txt
```

3. **L'état des services** :
```bash
docker ps -a
```

4. **Le résultat de curl** :
```bash
curl -v -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "redacted@example.invalid",
    "password": "password123"
  }'
```

---

**Date** : 4 Novembre 2025  
**Prochaine étape** : Exécuter les commandes de diagnostic ci-dessus

