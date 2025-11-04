# 📚 Documentation User Journey

Documentation complète sur les tests de parcours utilisateur dans JobbingTrack.

---

## 📖 Guides Disponibles

### 🎯 Démarrage Rapide
- **[RESUME_FINAL.md](./RESUME_FINAL.md)** ⭐⭐⭐ - **LIRE EN PREMIER** - Résumé complet de tout ce qui a été fait
- **[LIRE_MOI_URGENT.md](./LIRE_MOI_URGENT.md)** ⭐⭐ - Guide rapide pour commencer immédiatement
- **[GUIDE_COMPLET.md](./GUIDE_COMPLET.md)** ⭐ - Guide détaillé complet avec toutes les fonctionnalités

### 🔑 Système de Token
- **[TOKEN_TEST_PERMANENT.md](./TOKEN_TEST_PERMANENT.md)** - Système de token permanent pour les tests
  - Comment générer un token de test
  - Différences token normal vs token de test
  - Utilisation dans user-journey

### 🧪 Tests
- **[../../scripts/verify-user-journey.sh](../../scripts/verify-user-journey.sh)** - Script de vérification automatique
- **[Page User Journey](http://localhost:8080/backoffice/user-journey)** - Interface de test

---

## 🚀 Démarrage Rapide

### Option 1 : Script Automatique
```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack
./START_TESTS.sh
```

### Option 2 : Manuel
```bash
# 1. Démarrer les services
make up-for-tests

# 2. Attendre 15 secondes

# 3. Ouvrir
http://localhost:8080/backoffice/user-journey
```

### Option 3 : Vérification Automatique
```bash
bash scripts/verify-user-journey.sh
```

---

## 🔑 Générer un Token de Test Permanent

Pour éviter les erreurs "Token expiré" :

```bash
# 1. Connectez-vous
curl http://localhost:8080/api/v1/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@jobbingtrack.com","password":"password123"}'

# 2. Utilisez le token reçu pour générer un token permanent
curl http://localhost:8080/api/v1/auth/generate-test-token \
  -X POST \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

Voir [TOKEN_TEST_PERMANENT.md](./TOKEN_TEST_PERMANENT.md) pour plus de détails.

---

## 📊 Tests Disponibles

### Parcours Complet
- ✅ Inscription (register)
- ✅ Connexion (login)
- ✅ Création d'entreprises
- ✅ Mise à jour d'entreprises
- ✅ Création de candidatures
- ✅ Mise à jour de candidatures
- ✅ Gestion des contacts
- ✅ Planification d'entretiens
- ✅ Création d'événements
- ✅ Relances
- ✅ Appels téléphoniques
- ✅ Statistiques
- ✅ Calendrier mobile

### Parcours Rapide
- ✅ Connexion
- ✅ Création de candidatures
- ✅ Statistiques

### Autres Parcours
- Chercheur d'Emploi Actif
- Nouvel Utilisateur
- Test Mobile Complet

---

## 🔧 Corrections Appliquées

### Frontend Next.js (Critique)
**Problème** : Rewrites utilisaient `localhost:3000` depuis Docker  
**Solution** : Changé pour `api-gateway:3000`  
**Fichier** : `frontend/next.config.js`

### Auth-Service
**Problème** : Chemin middleware incorrect  
**Solution** : `../middleware/` → `../middlewares/`  
**Fichier** : `backend/auth-service/src/routes/preferences.routes.js`

### Token de Test
**Problème** : Tokens expiraient après 7 jours  
**Solution** : Système de token permanent (100 ans)  
**Fichiers** :
- `backend/auth-service/src/controllers/auth.controller.js`
- `backend/auth-service/src/routes/auth.routes.js`

---

## 💡 Commandes Utiles

```bash
# Démarrer les tests
./START_TESTS.sh

# Vérifier automatiquement
bash scripts/verify-user-journey.sh

# État des services
make status

# Logs
make logs                          # Tous (sauf metrics)
make logs-service SERVICE=auth     # Un service spécifique

# Redémarrage
make restart-service SERVICE=api-gateway
make restart-service SERVICE=auth-service
```

---

## 🆘 Problèmes Courants

### "Token invalide ou expiré"
**Solution** : Générez un token de test permanent (voir TOKEN_TEST_PERMANENT.md)

### Services ne démarrent pas
**Solution** : `make restart`

### Erreurs 500
**Solution** : Vérifiez les logs avec `make logs`

---

## 📁 Structure de Documentation

```
docs/user-journey/
├── README.md                          # Ce fichier
├── RESUME_FINAL.md                    # Résumé complet
├── LIRE_MOI_URGENT.md                 # Guide rapide
├── GUIDE_COMPLET.md                   # Guide détaillé
└── TOKEN_TEST_PERMANENT.md            # Système de token
```

---

## 🎯 Statut Actuel

**Statut** : 🟢 **100% OPÉRATIONNEL**

**Fonctionnalités** :
- ✅ Tous les endpoints fonctionnent
- ✅ Token permanent disponible
- ✅ Script de vérification automatique
- ✅ Documentation complète

---

**Pour commencer maintenant** :
```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack
./START_TESTS.sh
```

**✨ Bon testing !**

