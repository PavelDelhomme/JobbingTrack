# 📱 Mobile - Application React Native

Application mobile native développée avec React Native et Expo pour un accès mobile à JobbingTrack.

## 📁 Structure

```
mobile/
├── src/                      # Code source principal
│   ├── components/          # Composants réutilisables
│   ├── screens/             # Écrans de l'application
│   ├── navigation/          # Configuration navigation
│   ├── services/            # Services API et stockage
│   ├── store/               # Gestion d'état (Redux/Zustand)
│   ├── utils/               # Utilitaires et helpers
│   └── types/               # Définitions TypeScript
├── assets/                  # Images, icônes, polices
├── app.json                 # Configuration Expo
└── package.json             # Dépendances et scripts
```

## 🚀 Démarrage Rapide

### Prérequis
```bash
# Node.js 18+
# Expo CLI installé globalement
npm install -g @expo/cli

# Ou avec npx
npx @expo/cli install
```

### Installation et Lancement
```bash
# Installation des dépendances
npm install

# Démarrage en mode développement
npx expo start

# Build de production
npx expo build:android
npx expo build:ios
```

## 🎯 Fonctionnalités

### ✅ Implémenté
- **Navigation native** : Stack, Tab et Drawer optimisés
- **Authentification biométrique** : Face ID / Touch ID / Empreinte
- **Synchronisation offline** : SQLite + résolution de conflits
- **Notifications push** : Firebase (Android) + APNs (iOS)

### 🔄 En Développement
- **Interface utilisateur** adaptée mobile
- **Gestion des contacts** natifs
- **Camera et galerie** intégrées
- ** Géolocalisation** pour événements

## 📱 Plates-formes Supportées

### Android
- **API Level 21+** (Android 5.0+)
- **Play Store** : Publication optimisée
- **Notifications push** : Firebase Cloud Messaging
- **Optimisations** : Réduction taille APK

### iOS
- **iOS 12+** avec support moderne
- **App Store** : Guidelines respectées
- **Notifications push** : Apple Push Notification Service
- **Optimisations** : Taille app réduite

## 🔧 Technologies Utilisées

### Core
- **React Native 0.72** : Framework mobile moderne
- **Expo SDK 49** : Outils de développement avancés
- **TypeScript** : Sécurité de type complète

### Navigation
- **React Navigation 6** : Navigation déclarative
- **Deep Linking** : Gestion des liens externes
- **Animations fluides** : Transitions natives

### État et Données
- **Redux Toolkit** : Gestion d'état prédictible
- **SQLite** : Base de données locale performante
- **MMKV** : Stockage rapide et sécurisé

### Authentification
- **Biométrie native** : Sécurité renforcée
- **JWT automatique** : Gestion transparente des tokens
- **Secure Storage** : Chiffrement des données sensibles

## 📊 Architecture Mobile

### Structure des Écrans
```
screens/
├── Auth/                    # Authentification et onboarding
│   ├── LoginScreen.tsx
│   ├── RegisterScreen.tsx
│   └── OnboardingScreen.tsx
├── Main/                    # Navigation principale
│   ├── HomeTab.tsx         # Onglet principal
│   ├── ApplicationsTab.tsx # Gestion candidatures
│   ├── CompaniesTab.tsx    # Base entreprises
│   └── ProfileTab.tsx      # Profil utilisateur
└── Modals/                  # Modales et overlays
    └── ApplicationModal.tsx
```

### Services
```
services/
├── api/                     # Client API backend
├── storage/                 # Gestion stockage local
├── sync/                    # Synchronisation offline
└── notifications/           # Gestion notifications
```

## 🚀 Fonctionnalités Avancées

### Mode Hors Ligne
- **Queue intelligente** : Actions en attente de connexion
- **Résolution de conflits** : Gestion des données concurrentes
- **Synchronisation automatique** : Background sync
- **Cache optimisé** : Réduction consommation réseau

### Notifications Push
```typescript
// Configuration Firebase/APNs
import * as Notifications from 'expo-notifications'

// Gestion des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})
```

### Géolocalisation
```typescript
import * as Location from 'expo-location'

// Demande de permissions
const { status } = await Location.requestForegroundPermissionsAsync()

// Récupération position
const location = await Location.getCurrentPositionAsync({})
```

## 🧪 Tests

### Tests Unitaires
```bash
# Tests Jest
npm run test

# Tests avec coverage
npm run test:coverage
```

### Tests d'Intégration
```bash
# Tests Detox (e2e)
npm run test:e2e

# Tests sur simulateur
npm run test:ios
npm run test:android
```

## 📦 Déploiement

### Build de Production
```bash
# Android
npx expo build:android

# iOS (nécessite compte développeur Apple)
npx expo build:ios

# Version EAS Build (recommandé)
npx eas build --platform all
```

### Publication Stores
```bash
# Google Play Store
npx eas submit --platform android

# Apple App Store
npx eas submit --platform ios
```

## 🔒 Sécurité Mobile

### Authentification Biométrique
```typescript
import * as LocalAuthentication from 'expo-local-authentication'

// Vérification disponibilité
const compatible = await LocalAuthentication.hasHardwareAsync()

// Authentification
const result = await LocalAuthentication.authenticateAsync({
  promptMessage: 'Authentifiez-vous pour accéder à JobbingTrack',
  fallbackLabel: 'Utiliser le code PIN'
})
```

### Stockage Sécurisé
```typescript
import * as SecureStore from 'expo-secure-store'

// Sauvegarde sécurisée
await SecureStore.setItemAsync('authToken', token)

// Récupération
const token = await SecureStore.getItemAsync('authToken')
```

## 🎨 Design System Mobile

### Composants UI
- **React Native Elements** : Composants de base cohérents
- **Expo Vector Icons** : Icônes vectorielles optimisées
- **Animations Lottie** : Animations fluides
- **Thème sombre/clair** : Support automatique

### Responsive Design
- **Dimensions adaptatives** : Écrans de toutes tailles
- **Orientations** : Portrait et paysage
- **Tablettes** : Interface adaptée
- **Accessibility** : Support complet

## 📚 Documentation

Voir le [README principal](../../README.md) pour :
- Architecture complète du projet
- Guide de déploiement en production
- Intégration avec les services backend
