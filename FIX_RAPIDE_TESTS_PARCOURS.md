# 🔧 FIX RAPIDE - Tests Parcours Utilisateur

## 🎯 Problème

Les tests échouent avec l'erreur :
```
❌ Unexpected token 'I', "Internal S"... is not valid JSON
```

**Cause** : Le code essaie de parser du HTML (Internal Server Error) comme du JSON.

---

## ✅ Solution en Cours

Je suis en train de corriger le fichier `frontend/src/app/(admin)/backoffice/user-journey/page.tsx` pour :

1. ✅ Ajouter une fonction `handleFetchResponse()` qui gère correctement les erreurs
2. ✅ Ajouter les tests de création/mise à jour d'entreprises (companies)
3. 🔄 Corriger tous les appels fetch pour utiliser cette fonction
4. ✅ Afficher des messages d'erreur détaillés

---

## 🚀 Pour Tester Maintenant

### Étape 1 : Redémarrer les Services

```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack

# Redémarrer les services nécessaires
make up-for-tests

# Attendre 20 secondes
sleep 20
```

### Étape 2 : Vérifier que les Services Répondent

```bash
# Tester l'API Gateway
curl http://localhost:8080/health

# Tester Auth Service
curl http://localhost:8080/api/v1/auth/health

# Si ça ne marche pas, redémarrer auth-service
docker-compose restart auth-service
sleep 5
```

### Étape 3 : Ouvrir la Page de Test

```
http://localhost:8080/backoffice/user-journey
```

---

## 📊 Ce Qui a Été Ajouté

### Nouvelles Étapes de Test

1. ✅ **Créer Entreprises** - Créer 3 entreprises de test
2. ✅ **Mettre à Jour Entreprises** - Modifier 2 entreprises
3. 🔄 **Mettre à Jour Entretiens** (en cours)
4. 🔄 **Mettre à Jour Événements** (en cours)
5. 🔄 **Mettre à Jour Relances** (en cours)

### Meilleure Gestion des Erreurs

```typescript
// Avant
result = await fetch(...);
const data = await result.json(); // ❌ Crash si erreur HTML

// Maintenant
const response = await fetch(...);
result = await handleFetchResponse(response); // ✅ Gère les erreurs
```

La fonction `handleFetchResponse` :
- ✅ Vérifie le Content-Type
- ✅ Parse le JSON seulement si c'est du JSON
- ✅ Lance une erreur claire avec le message d'erreur
- ✅ Affiche les 100 premiers caractères si erreur HTML

---

## 🔍 Diagnostic des Erreurs

### Si "Internal Server Error"

**Causes possibles** :
1. Service backend pas démarré
2. Base de données pas accessible
3. Problème dans le code du service

**Solution** :
```bash
# Voir les logs du service qui pose problème
docker logs jobbingtrack-auth-service
docker logs jobbingtrack-application-service
docker logs jobbingtrack-company-service

# Redémarrer le service
docker-compose restart <nom-du-service>
```

### Si "Unexpected token 'I'"

**Cause** : Le service renvoie du HTML au lieu de JSON (erreur 500)

**Solution** : Utiliser `handleFetchResponse()` pour mieux gérer l'erreur

---

## 📋 Checklist Avant de Tester

- [ ] Tous les services démarrés : `docker ps`
- [ ] Aucun service "unhealthy" 
- [ ] Auth service répond : `curl http://localhost:8080/api/v1/auth/health`
- [ ] Frontend accessible : `http://localhost:8080`
- [ ] Identifiants corrects :
  - Email: `admin@jobbingtrack.test`
  - Password: `password123`

---

## 🛠️ Si Ça Ne Marche Toujours Pas

### Option 1 : Redémarrage Complet

```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack

# Tout arrêter
make down

# Nettoyer (⚠️ EFFACE LES DONNÉES)
docker-compose down -v

# Redémarrer
make up-for-tests

# Attendre 30 secondes
sleep 30

# Tester
curl http://localhost:8080/health
```

### Option 2 : Rebuild Auth Service

```bash
# Le auth-service a des modifications qui nécessitent un rebuild
docker-compose build --no-cache auth-service

# Redémarrer
docker-compose up -d auth-service

# Attendre
sleep 10
```

---

## 🎯 Après le Fix

Une fois que tout fonctionne, vous devriez voir :

```
✅ Étape 1/14 : Inscription - Réussi (1.2s)
✅ Étape 2/14 : Connexion - Réussi (0.8s)
✅ Étape 3/14 : Créer Entreprises - Réussi (2.1s)
✅ Étape 4/14 : Mettre à Jour Entreprises - Réussi (1.5s)
✅ Étape 5/14 : Créer Candidatures - Réussi (3.2s)
...
```

---

## 💡 Commandes Utiles

```bash
# Voir l'état des services
docker ps

# Logs en temps réel d'un service
docker logs -f jobbingtrack-auth-service

# Redémarrer un service spécifique
docker-compose restart <service-name>

# Voir tous les logs
make logs

# Health check complet
make health
```

---

## 📞 Problèmes Spécifiques

### Si Register Échoue
```bash
# Le auth-service doit être rebuild avec le fix
docker-compose build --no-cache auth-service
docker-compose up -d auth-service
```

### Si Companies Échoue
```bash
# Vérifier le company-service
docker logs jobbingtrack-company-service
docker-compose restart company-service
```

### Si Applications Échoue
```bash
# Vérifier le application-service
docker logs jobbingtrack-application-service
docker-compose restart application-service
```

---

**Date** : 4 Novembre 2025  
**Statut** : 🔄 Corrections en cours  
**Prochaine étape** : Terminer les corrections du fichier page.tsx

