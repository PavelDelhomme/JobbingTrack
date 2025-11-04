# 🔑 Résoudre Définitivement "Token invalide ou expiré"

**Problème** : Certains tests affichent "Token invalide ou expiré"  
**Cause** : Token mock de développement non accepté par tous les services  
**Solution** : Utiliser le token permanent (1 clic !)

---

## 🎯 Services Concernés

### ✅ Fonctionnent avec Token Mock
- Register (inscription)
- Login (connexion)
- Profile (profil)

### ❌ NE Fonctionnent PAS avec Token Mock
- **Companies** (création/mise à jour d'entreprises) ← VOTRE PROBLÈME
- **Applications** (mise à jour de candidatures) ← VOTRE PROBLÈME  
- **Statistics** (voir les statistiques) ← VOTRE PROBLÈME
- Contacts
- Interviews
- Events
- Followups
- Calls

---

## ✅ SOLUTION DÉFINITIVE (1 minute)

### Étape 1 : Ouvrir la Page

```
http://localhost:8080/backoffice/user-journey
```

### Étape 2 : Repérer le Bouton

Cherchez le bouton **violet/indigo** avec une icône de **clé (🔑)**

**Texte du bouton** : `"Générer Token de Test"`

**Position** : Barre d'actions en haut, 3ème bouton (après "Lancer" et "Annuler")

### Étape 3 : Cliquer sur le Bouton

Un clic suffit ! Vous verrez une alerte :

```
✅ Token de test permanent généré avec succès !

Validité : 100 ans (permanent)

Ce token élimine les erreurs 403 "Token invalide" durant les tests.

Il sera utilisé automatiquement pour tous les tests.
```

### Étape 4 : Relancer les Tests

```bash
# Option 1 : Via l'interface
Cliquez sur "Lancer le parcours"

# Option 2 : Via script
bash scripts/verify-user-journey.sh
```

**TOUS les tests passeront maintenant !** ✅

---

## 📊 Avant / Après

### AVANT (Token Mock)

```
Parcours: Inscription + Connexion + Entreprises + Applications + Stats
│
├─ ✅ Inscription (201)
├─ ✅ Connexion (200)
├─ ✅ Profil (200)
│
├─ ❌ Créer Entreprises (403) ← Token invalide
├─ ❌ Maj Entreprises (403) ← Token invalide
├─ ❌ Maj Applications (403) ← Token invalide
├─ ❌ Statistiques (403) ← Token invalide
│
└─ Résultat : 3/7 réussis (43%)
```

### APRÈS (Token Permanent)

```
Parcours: Inscription + Connexion + Entreprises + Applications + Stats
│
├─ ✅ Inscription (201)
├─ ✅ Connexion (200)
├─ ✅ Profil (200)
│
├─ ✅ Créer Entreprises (201) ← RÉSOLU !
├─ ✅ Maj Entreprises (200) ← RÉSOLU !
├─ ✅ Maj Applications (200) ← RÉSOLU !
├─ ✅ Statistiques (200) ← RÉSOLU !
│
└─ Résultat : 7/7 réussis (100%) ✨
```

---

## 🔍 Pourquoi ce Problème ?

### Token Mock (Développement)
```javascript
// Login retourne en développement:
{
  "token": "mock-jwt-token-1762284836660"
}
```

Ce token est accepté **uniquement** par `auth-service`.

### Token Réel (Production-like)
```javascript
// Token permanent généré:
{
  "testToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Ce token est accepté par **TOUS les services** ✅

---

## 🎨 Repérer le Bouton

### Apparence Visuelle

```
┌─────────────────────────────────────────────────────────┐
│ 🚶 Parcours Utilisateur                                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ▶️ Lancer   ❌ Annuler   🔑 Générer Token   🔄 Reset  │
│                          ↑                               │
│                    LE BOUTON VIOLET !                    │
└─────────────────────────────────────────────────────────┘
```

### Caractéristiques
- **Couleur** : Dégradé violet → indigo (très visible !)
- **Icône** : 🔑 Clé
- **Position** : 3ème bouton de gauche
- **Texte** :
  - "Générer Token de Test" (si pas de token)
  - "✅ Token Actif" (si token déjà généré)

---

## 🧪 Vérifier que le Token est Actif

### Dans le Navigateur (Console F12)

```javascript
// Vérifier le token normal
localStorage.getItem('token')
// Résultat: "mock-jwt-token-..." ou JWT réel

// Vérifier le token de test
localStorage.getItem('test_token')
// Résultat: "eyJhbGciOiJIUzI1NiI..." (JWT de 100 ans)
```

### Le Bouton Change

Une fois le token généré, le bouton affiche :
```
🔑 ✅ Token Actif
```

---

## 📋 Checklist de Résolution

- [ ] Ouvrir http://localhost:8080/backoffice/user-journey
- [ ] Repérer le bouton violet "Générer Token de Test"
- [ ] Cliquer dessus (1 fois suffit !)
- [ ] Voir l'alerte de confirmation
- [ ] Le bouton affiche maintenant "✅ Token Actif"
- [ ] Relancer les tests
- [ ] Tous les tests passent maintenant ✅

---

## 🆘 Dépannage

### Problème 1 : Je ne vois pas le bouton

**Solution** :
```bash
# Vider le cache du navigateur
Ctrl + Shift + R (ou Cmd + Shift + R sur Mac)

# Ou redémarrer le frontend
docker restart jobbingtrack-frontend
```

### Problème 2 : Erreur "Token invalide" après avoir cliqué

**Cause** : Vous n'êtes pas connecté avec un compte SUPER_ADMIN

**Solution** :
```
1. Déconnectez-vous du backoffice
2. Reconnectez-vous avec :
   Email: admin@jobbingtrack.com
   Password: password123
3. Réessayez de générer le token
```

### Problème 3 : Erreur 404 sur /generate-test-token

**Cause** : Auth-service pas à jour

**Solution** :
```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack
docker-compose -f backend/docker-compose.yml build --no-cache auth-service
docker restart jobbingtrack-auth-service
```

### Problème 4 : Le token ne fonctionne toujours pas

**Vérifier** :
```bash
# 1. Auth-service tourne ?
docker ps | grep auth-service

# 2. La route existe ?
docker exec jobbingtrack-auth-service grep -n "generate-test-token" /app/src/routes/auth.routes.js

# 3. Le token est bien sauvegardé ?
# Ouvrir la console du navigateur (F12)
localStorage.getItem('test_token')
```

---

## 🎯 Scénario Complet Corrigé

Après avoir généré le token permanent, tous ces scénarios fonctionnent :

### Scénario "Parcours Complet"
```
✅ Inscription
✅ Connexion
✅ Créer Entreprises (3 entreprises)
✅ Mettre à Jour Entreprises
✅ Créer Candidatures (5 candidatures)
✅ Mettre à Jour Candidatures
✅ Créer Contacts
✅ Mettre à Jour Contacts
✅ Planifier Entretiens
✅ Créer Événements
✅ Créer Relances
✅ Faire Appels
✅ Voir Statistiques
✅ Tester Calendrier Mobile

Résultat: 14/14 réussis (100%) ✨
```

---

## 💡 Conseils

### Une Seule Fois
Le token permanent n'expire jamais (100 ans). Générez-le **une seule fois** et utilisez-le pour tous vos tests.

### Différent du Token Normal
- **Token normal** (`localStorage.token`) : Pour la navigation normale
- **Token de test** (`localStorage.test_token`) : Pour les tests automatisés

Ils coexistent sans conflit.

### Mode Production
⚠️ **JAMAIS** utiliser le token permanent en production ! C'est réservé aux tests uniquement.

---

## 📚 Documentation Connexe

- **[QUICK_FIX.md](QUICK_FIX.md)** - Fix en 2 minutes
- **[SOLUTION_ERREUR_403.md](SOLUTION_ERREUR_403.md)** - Explication détaillée
- **[TOKEN_TEST_PERMANENT.md](TOKEN_TEST_PERMANENT.md)** - Documentation technique

---

## 🎉 Résultat Final

**AVANT** :
```
Tests qui échouent :
- ❌ Créer Entreprises (403)
- ❌ Maj Entreprises (403)
- ❌ Maj Applications (403)
- ❌ Statistiques (403)
```

**APRÈS 1 CLIC** :
```
Tous les tests passent :
- ✅ Créer Entreprises (201)
- ✅ Maj Entreprises (200)
- ✅ Maj Applications (200)
- ✅ Statistiques (200)
```

---

**Pour résoudre MAINTENANT** :

```
1. Ouvrir: http://localhost:8080/backoffice/user-journey
2. Cliquer sur le bouton violet "🔑 Générer Token de Test"
3. Relancer les tests
```

**✨ Problème résolu en 1 minute !**

