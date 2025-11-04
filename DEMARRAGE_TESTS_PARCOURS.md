# 🧪 Guide de Démarrage - Tests de Parcours Utilisateur

[🏠 README](README.md) | [📋 TODO](TODO_NEXT_STEPS.md)

---

## ❌ Problème : Erreurs 500 lors des Tests

Si vous voyez des erreurs comme :
```
POST http://localhost:8080/api/v1/auth/register 500 (Internal Server Error)
POST http://localhost:8080/api/v1/applications 500 (Internal Server Error)
POST http://localhost:8080/api/v1/contacts 500 (Internal Server Error)
...
```

**Cause** : Les services backend ne sont pas démarrés ! ❌

---

## ✅ Solution : Démarrer les Services Backend

### 🚀 Méthode Rapide (Recommandée)

**Une seule commande pour démarrer tous les services de test** :

```bash
make up-for-tests
```

Cette commande démarre **UNIQUEMENT** les services nécessaires pour les tests :
- ✅ PostgreSQL (base de données)
- ✅ Redis (cache)
- ✅ API Gateway
- ✅ Auth Service (authentification)
- ✅ Dashboard Service (statistiques)
- ✅ Application Service (candidatures)
- ✅ Contact Service (contacts)
- ✅ Interview Service (entretiens)
- ✅ Event Service (événements calendrier)
- ✅ Followup Service (relances)
- ✅ Call Service (appels)

### ⏱️ Temps d'Attente

**Attendez 10-15 secondes** après la commande pour que tous les services soient prêts !

---

## 🎯 Étapes Complètes

### 1️⃣ Arrêter les services existants (si nécessaire)

```bash
make down
```

### 2️⃣ Démarrer les services de test

```bash
make up-for-tests
```

**Attendez que vous voyiez** :
```
✅ SERVICES DE TEST DÉMARRÉS !
```

### 3️⃣ Attendre 10-15 secondes

Les services prennent quelques secondes pour démarrer complètement.

### 4️⃣ Vérifier que tout fonctionne

```bash
make health
```

Ou visitez : http://localhost:3000/health

### 5️⃣ Tester les parcours !

```bash
# Ouvrir dans votre navigateur
http://localhost:8080/backoffice/user-journey
```

**Identifiants** :
- Email: `admin@jobbingtrack.test`
- Password: `password123`

---

## 🔍 Vérifier l'État des Services

### Voir tous les conteneurs actifs

```bash
docker ps
```

Vous devriez voir :
- `postgres`
- `redis`
- `api-gateway`
- `auth-service`
- `dashboard-service`
- `application-service`
- `contact-service`
- `interview-service`
- `event-service`
- `followup-service`
- `call-service`

### Voir les logs

```bash
# Tous les logs
make logs

# Logs d'un service spécifique
make logs-service SERVICE=api-gateway
make logs-service SERVICE=auth-service
make logs-service SERVICE=application-service
```

### Vérifier la santé des services

```bash
make health
```

---

## 🐛 Problèmes Courants

### Problème 1 : Port déjà utilisé

**Erreur** :
```
Error: Port 3000 is already in use
```

**Solution** :
```bash
# Libérer les ports
make down

# Ou forcer l'arrêt
docker-compose down --remove-orphans

# Puis redémarrer
make up-for-tests
```

### Problème 2 : Services ne démarrent pas

**Solution** :
```bash
# Nettoyer complètement
make down
docker system prune -f

# Redémarrer
make up-for-tests
```

### Problème 3 : Base de données non initialisée

**Solution** :
```bash
# Arrêter tout
make down

# Démarrer seulement la BDD
docker-compose up -d postgres

# Attendre 5 secondes
sleep 5

# Démarrer le reste
make up-for-tests
```

### Problème 4 : Toujours des erreurs 500

**Vérifier les logs** :
```bash
# Logs API Gateway
make logs-service SERVICE=api-gateway

# Logs Auth Service
make logs-service SERVICE=auth-service

# Logs Application Service
make logs-service SERVICE=application-service
```

**Redémarrer un service spécifique** :
```bash
make restart-service SERVICE=application-service
```

---

## 📊 Comprendre les Services

### Quel service gère quoi ?

| Service | Fonction | Test de Parcours Utilisateur |
|---------|----------|------------------------------|
| **postgres** | Base de données | ✅ Stockage de toutes les données |
| **redis** | Cache | ✅ Sessions et cache |
| **api-gateway** | Point d'entrée | ✅ Routage de toutes les requêtes |
| **auth-service** | Authentification | ✅ Inscription, Connexion |
| **application-service** | Candidatures | ✅ Créer/Mettre à jour candidatures |
| **contact-service** | Contacts | ✅ Créer/Gérer contacts |
| **interview-service** | Entretiens | ✅ Planifier entretiens |
| **event-service** | Événements | ✅ Créer événements calendrier |
| **followup-service** | Relances | ✅ Créer relances |
| **call-service** | Appels | ✅ Enregistrer appels |
| **dashboard-service** | Statistiques | ✅ Voir statistiques |

---

## 🎯 Workflow Complet

### Démarrage Complet (Première Fois)

```bash
# 1. Arrêter tout
make down

# 2. Démarrer services de test
make up-for-tests

# 3. Attendre 15 secondes
sleep 15

# 4. Vérifier
make health

# 5. Tester !
# Ouvrir : http://localhost:8080/backoffice/user-journey
```

### Démarrage Rapide (Quotidien)

```bash
# Si les services sont déjà configurés
make up-for-tests

# Attendre 10 secondes
sleep 10

# Tester !
```

### Arrêt

```bash
# Arrêter tous les services
make down
```

---

## 🚀 Autres Commandes Utiles

```bash
# Démarrer TOUS les services (complet)
make up-full

# Démarrer services essentiels
make up

# Démarrer avec mobile
make up-with-mobile

# Redémarrer un service
make restart-service SERVICE=application-service

# Voir le statut
make status

# Voir les conteneurs
make ps
```

---

## ✅ Checklist de Vérification

Avant de lancer les tests, vérifiez que :

- [ ] `make up-for-tests` a été exécuté
- [ ] Vous avez attendu 10-15 secondes
- [ ] `docker ps` montre au moins 11 conteneurs actifs
- [ ] `make health` ne montre pas d'erreurs
- [ ] http://localhost:3000/health renvoie OK
- [ ] Le frontend est accessible : http://localhost:8080

**Si tout est ✅, vous pouvez tester les parcours !**

---

## 🎓 Résumé Ultra-Rapide

```bash
# 1. DÉMARRER
make up-for-tests

# 2. ATTENDRE
sleep 15

# 3. VÉRIFIER
make health

# 4. TESTER
# http://localhost:8080/backoffice/user-journey

# 5. ARRÊTER (quand vous avez fini)
make down
```

---

## 🆘 Besoin d'Aide ?

### Erreurs Persistantes ?

1. **Vérifier les logs** : `make logs`
2. **Vérifier les ports** : `netstat -tulpn | grep 3000`
3. **Nettoyer Docker** : `docker system prune -af`
4. **Redémarrer Docker** : `sudo systemctl restart docker`

### Documentation

- 📖 Guide Tests : `docs/development/GUIDE_TESTS_PARCOURS.md`
- 📖 Troubleshooting : `docs/troubleshooting/guide/README.md`
- 📖 Makefile : `docs/development/makefile/README.md`

---

**🎉 Maintenant vous pouvez tester sans erreurs 500 ! 🚀**

---

**Version** : 1.0.0  
**Date** : 4 Novembre 2025  
**Statut** : ✅ Solution Complète

---

[🏠 README](README.md) | [📋 TODO](TODO_NEXT_STEPS.md) | [📚 Documentation](docs/INDEX_DOCUMENTATION.md)

