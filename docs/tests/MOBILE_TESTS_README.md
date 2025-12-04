# 📱 Tests Mobile Playwright - JobbingTrack

## 🎯 Vue d'Ensemble

Système complet de tests E2E pour l'application mobile JobbingTrack utilisant Playwright avec simulation d'appareils mobiles (iPhone, Android).

---

## 🚀 Démarrage Rapide

### Interface CLI Interactive (Recommandé)

```bash
# Depuis la racine du projet
cd frontend
npm run test:e2e:mobile:cli

# Ou directement
./frontend/scripts/test-mobile-cli.js
```

### Script Bash Interactif

```bash
./frontend/scripts/test-mobile-interactive.sh
```

### Commandes NPM

```bash
# Tous les tests mobile
npm run test:e2e:mobile:all

# Tests spécifiques
npm run test:e2e:mobile:interactive
```

---

## 📋 Tests Disponibles

### 1. 🔐 Authentification Mobile
- **Fichier**: `tests/e2e/mobile/mobile-auth.spec.ts`
- **Tests**:
  - Inscription mobile
  - Connexion mobile
  - Déconnexion mobile
  - Réinitialisation mot de passe

### 2. 📋 Gestion Candidatures
- **Fichier**: `tests/e2e/mobile/mobile-applications.spec.ts`
- **Tests**:
  - Liste des candidatures
  - Création de candidature
  - Modification de candidature
  - Filtres et recherche

### 3. 👥 Gestion Contacts
- **Fichier**: `tests/e2e/mobile/mobile-contacts.spec.ts`
- **Tests**:
  - Liste des contacts
  - Création de contact
  - Modification de contact

### 4. 📞 Gestion Appels
- **Fichier**: `tests/e2e/mobile/mobile-calls.spec.ts`
- **Tests**:
  - Création d'appel
  - Liste des appels
  - Historique des appels

### 5. 📅 Gestion Entretiens
- **Fichier**: `tests/e2e/mobile/mobile-interviews.spec.ts`
- **Tests**:
  - Création d'entretien
  - Calendrier des entretiens
  - Modification d'entretien

### 6. 🔔 Gestion Relances
- **Fichier**: `tests/e2e/mobile/mobile-followups.spec.ts`
- **Tests**:
  - Création de relance
  - Liste des relances
  - Suivi des relances

### 7. 🔔 Notifications
- **Fichier**: `tests/e2e/mobile/mobile-notifications.spec.ts`
- **Tests**:
  - Affichage des notifications
  - Permissions notifications
  - Interaction avec notifications

### 8. 📊 Parcours Complet
- **Fichier**: `tests/e2e/mobile/mobile-complete-journey.spec.ts`
- **Tests**:
  - Parcours utilisateur complet (15 tests)
  - Tous les scénarios de bout en bout
  - Performance et UX mobile

---

## 📱 Appareils Supportés

### iPhone
- ✅ iPhone 13 Pro (390x844)
- ✅ iPhone SE (375x667)
- ✅ iPhone 12 Pro Max (428x926)

### Android
- ✅ Pixel 5 (393x851)
- ✅ Galaxy S21 (360x800)

### Modes
- ✅ Portrait
- ✅ Landscape (iPhone 13 Pro)

---

## 🎮 Interface CLI Interactive

### Menu Principal

```
📱 MENU PRINCIPAL - Tests Mobile
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 🧪 Tous les tests mobile (complet)
2. 🔐 Tests Authentification
3. 📋 Tests Candidatures
4. 👥 Tests Contacts
5. 📞 Tests Appels
6. 📅 Tests Entretiens
7. 🔔 Tests Relances
8. 🔔 Tests Notifications
9. 📊 Tests Dashboard mobile
10. 🎨 Tests UX/UI mobile
11. ⚡ Tests Performance
12. 📱 Tests sur différents appareils
13. 🎬 Mode UI interactif (Playwright UI)
14. 🐛 Mode Debug (step by step)
15. 📸 Captures d'écran uniquement
16. 📊 Voir le rapport HTML
0. ❌ Quitter
```

### Fonctionnalités

- **Mode UI Interactif** : Interface graphique Playwright pour voir les tests en temps réel
- **Mode Debug** : Exécution step-by-step pour déboguer
- **Sélection d'appareil** : Tester sur différents appareils mobiles
- **Captures d'écran** : Génération automatique de captures
- **Rapports HTML** : Rapports détaillés avec vidéos et screenshots

---

## ⚙️ Configuration

### Fichier de Configuration

`frontend/playwright.mobile.config.ts`

### Variables d'Environnement

```bash
# URL du frontend
export FRONTEND_URL=http://localhost:5003

# URL de l'API Gateway
export API_GATEWAY_URL=http://localhost:5002
```

### Caractéristiques Mobile Simulées

- ✅ Viewport mobile (375x667 par défaut)
- ✅ Touch events (hasTouch: true)
- ✅ User-Agent mobile
- ✅ Permissions (geolocation, notifications)
- ✅ Device scale factor
- ✅ Orientation portrait/paysage

---

## 🧪 Exécution des Tests

### Tous les Tests

```bash
cd frontend
npm run test:e2e:mobile:all
```

### Test Spécifique

```bash
cd frontend
npx playwright test tests/e2e/mobile/mobile-auth.spec.ts --config=playwright.mobile.config.ts
```

### Sur un Appareil Spécifique

```bash
cd frontend
npx playwright test tests/e2e/mobile --config=playwright.mobile.config.ts --project="iPhone 13 Pro"
```

### Mode UI Interactif

```bash
cd frontend
npx playwright test tests/e2e/mobile --config=playwright.mobile.config.ts --ui
```

### Mode Debug

```bash
cd frontend
npx playwright test tests/e2e/mobile --config=playwright.mobile.config.ts --debug
```

---

## 📊 Rapports

### Rapport HTML

```bash
cd frontend
npx playwright show-report playwright-report-mobile
```

### Rapport JSON

```bash
cat frontend/test-results-mobile.json
```

### Captures d'Écran

Les captures sont sauvegardées dans :
- `frontend/test-results/` (screenshots)
- `frontend/test-results/` (vidéos)

---

## 🎯 Scénarios Testés

### Parcours Utilisateur Complet

1. ✅ **Inscription** - Création de compte mobile
2. ✅ **Connexion** - Authentification mobile
3. ✅ **Création Entreprise** - Nouvelle entreprise
4. ✅ **Création Candidature** - Nouvelle candidature
5. ✅ **Création Contact** - Nouveau contact
6. ✅ **Création Appel** - Nouvel appel
7. ✅ **Création Entretien** - Nouvel entretien
8. ✅ **Création Relance** - Nouvelle relance
9. ✅ **Notifications** - Affichage et interaction
10. ✅ **Recherche** - Fonctionnalité de recherche
11. ✅ **Dashboard** - Affichage mobile
12. ✅ **Navigation** - Menu hamburger
13. ✅ **Gestes Tactiles** - Swipe et tap
14. ✅ **Synchronisation Offline** - Mode hors ligne
15. ✅ **Captures d'écran** - Vérification visuelle

---

## 🔧 Développement

### Structure des Fichiers

```
frontend/
├── playwright.mobile.config.ts          # Configuration mobile
├── tests/
│   └── e2e/
│       └── mobile/
│           ├── mobile-complete-journey.spec.ts
│           ├── mobile-auth.spec.ts
│           ├── mobile-applications.spec.ts
│           ├── mobile-contacts.spec.ts
│           ├── mobile-calls.spec.ts
│           ├── mobile-interviews.spec.ts
│           ├── mobile-followups.spec.ts
│           └── mobile-notifications.spec.ts
└── scripts/
    ├── test-mobile-interactive.sh       # Script bash interactif
    └── test-mobile-cli.js               # Interface CLI Node.js
```

### Ajouter un Nouveau Test

1. Créer un fichier dans `tests/e2e/mobile/`
2. Importer les helpers nécessaires
3. Utiliser les fonctions helper pour la connexion
4. Ajouter le test au menu CLI

---

## 📚 Documentation

- **Configuration Playwright** : `playwright.mobile.config.ts`
- **Tests complets** : `tests/e2e/mobile/mobile-complete-journey.spec.ts`
- **Scripts** : `scripts/test-mobile-interactive.sh` et `scripts/test-mobile-cli.js`

---

## ✅ Checklist des Tests

- [x] Inscription mobile
- [x] Connexion mobile
- [x] Création candidature
- [x] Création contact
- [x] Création appel
- [x] Création entretien
- [x] Création relance
- [x] Notifications
- [x] Navigation mobile
- [x] Gestes tactiles
- [x] Performance mobile
- [x] Responsive design

---

**Date de création** : 2025-12-04  
**Version** : 1.0.0  
**Statut** : ✅ Opérationnel

