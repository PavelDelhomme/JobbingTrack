# ✅ SOLUTION - Erreur 500 sur /api/v1/auth/register

## 🔍 Problème Identifié

```
The table `public.security_logs` does not exist in the current database.
```

**Cause** : La table `security_logs` n'existe pas, donc :
1. Le `security-service` est "unhealthy"
2. Le `auth-service` ne peut pas logger les événements de sécurité
3. L'inscription échoue avec une erreur 500

---

## 🔧 Solution Rapide

### Option 1 : Exécuter les Migrations Prisma

```bash
# 1. Accéder au conteneur du security-service
docker exec -it jobbingtrack-security-service sh

# 2. Exécuter les migrations
npx prisma migrate deploy

# 3. (Alternative) Générer le client et pousser le schéma
npx prisma generate
npx prisma db push

# 4. Sortir
exit

# 5. Redémarrer le service
docker-compose restart security-service

# 6. Attendre 5 secondes
sleep 5

# 7. Vérifier l'état
docker ps | grep security-service
```

### Option 2 : Tout Redémarrer Proprement (RECOMMANDÉ)

```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack

# 1. Tout arrêter
make down

# 2. Nettoyer les volumes (ATTENTION : efface toutes les données)
docker-compose down -v

# 3. Redémarrer proprement
make up-for-tests

# 4. Attendre que tout soit prêt (20 secondes)
sleep 20

# 5. Vérifier l'état
make health
```

---

## 📋 Étapes Détaillées (Option 1 - Sans Perdre les Données)

### Étape 1 : Créer la Table Manquante

```bash
# Entrer dans le conteneur security-service
docker exec -it jobbingtrack-security-service sh

# Dans le conteneur, exécuter :
npx prisma migrate deploy

# Si ça ne marche pas, essayer :
npx prisma db push --accept-data-loss

# Sortir
exit
```

### Étape 2 : Redémarrer le Service

```bash
# Redémarrer security-service
docker-compose restart security-service

# Attendre qu'il soit prêt
sleep 5

# Vérifier qu'il est "healthy"
docker ps | grep security-service
```

### Étape 3 : Tester l'Inscription

```bash
# Tester avec curl
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "redacted@example.invalid",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

**Attendu** : Vous devez voir un JSON avec `"success": true`

---

## 🚀 Solution Ultra-Rapide (Recommandée)

Si vous voulez juste que ça marche **maintenant** :

```bash
# Copier/coller ces commandes d'un coup
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack && \
make down && \
docker-compose down -v && \
make up-for-tests && \
sleep 25 && \
echo "✅ Services prêts ! Testez maintenant : http://localhost:8080/backoffice/user-journey"
```

**⏱️ Temps d'attente** : ~30 secondes

---

## 🧪 Vérification

### 1. Vérifier que la table existe

```bash
# Se connecter à PostgreSQL
docker exec -it jobbingtrack-postgres psql -U postgres -d jobbingtrack

# Vérifier les tables
\dt

# Chercher security_logs
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'security_logs';

# Voir la structure de la table
\d security_logs

# Sortir
\q
```

### 2. Vérifier que security-service est healthy

```bash
# Vérifier l'état
docker ps | grep security-service

# Doit afficher : Up XX minutes (healthy)
```

### 3. Tester l'endpoint de register

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "redacted@example.invalid",
    "password": "test123456",
    "firstName": "Nouveau",
    "lastName": "Utilisateur"
  }'
```

### 4. Retester depuis le frontend

```
1. Ouvrir : http://localhost:8080/backoffice/user-journey
2. Cliquer sur "Lancer le parcours"
3. L'étape "register" doit passer au ✅ vert
```

---

## 📊 Commandes de Debug

```bash
# Voir les logs du security-service
docker logs jobbingtrack-security-service

# Voir les logs de auth-service
docker logs jobbingtrack-auth-service

# Voir l'état de tous les services
docker ps

# Vérifier la santé
make health

# Voir tous les logs en temps réel
make logs
```

---

## 💡 Pourquoi Cette Erreur ?

Le `auth-service` essaie d'enregistrer chaque événement d'authentification (inscription, connexion, etc.) dans une table de logs de sécurité via le `security-service`.

```javascript
// Dans auth.controller.js ligne 92
await sendSecurityLog('info', 'authentication', 'registration_success', ...);
```

Si la table `security_logs` n'existe pas :
1. Le `security-service` ne peut pas stocker le log
2. Il renvoie une erreur
3. Le `auth-service` reçoit l'erreur
4. L'inscription échoue avec une 500

---

## 🔧 Créer Manuellement la Table (Si Prisma Ne Marche Pas)

```sql
-- Se connecter à PostgreSQL
docker exec -it jobbingtrack-postgres psql -U postgres -d jobbingtrack

-- Créer la table
CREATE TABLE IF NOT EXISTS "security_logs" (
  "id" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "level" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "sourceIP" TEXT,
  "userAgent" TEXT,
  "userId" TEXT,
  "endpoint" TEXT,
  "method" TEXT,
  "statusCode" INTEGER,
  "responseTime" INTEGER,
  "country" TEXT,
  "city" TEXT,
  "riskScore" INTEGER DEFAULT 0,
  "isBlocked" BOOLEAN DEFAULT false,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "security_logs_pkey" PRIMARY KEY ("id")
);

-- Créer les index
CREATE INDEX "security_logs_timestamp_idx" ON "security_logs"("timestamp");
CREATE INDEX "security_logs_level_idx" ON "security_logs"("level");
CREATE INDEX "security_logs_category_idx" ON "security_logs"("category");
CREATE INDEX "security_logs_userId_idx" ON "security_logs"("userId");

-- Sortir
\q
```

Puis :
```bash
# Redémarrer security-service
docker-compose restart security-service
```

---

## ✅ Checklist

- [ ] Table `security_logs` créée dans PostgreSQL
- [ ] Security-service redémarré
- [ ] Security-service est "healthy" (pas "unhealthy")
- [ ] Test curl de `/register` réussit
- [ ] Test depuis le frontend réussit
- [ ] Page Parcours Utilisateur fonctionne

---

## 🎉 Une Fois que C'est Réglé

```bash
# Lancer les tests de parcours
# http://localhost:8080/backoffice/user-journey

# Vous devriez voir :
# ✅ Étape 1 : Register - Succès
# ✅ Étape 2 : Login - Succès
# ✅ Étape 3 : Create Applications - Succès
# ... etc
```

---

**Date** : 4 Novembre 2025  
**Temps de fix** : ~2 minutes (avec Option 2)  
**Statut** : 🔧 Prêt à fixer

