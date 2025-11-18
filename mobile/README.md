# 📱 JobbingTrack Mobile - Flutter

[← Retour au README principal](../README.md) | [📚 Documentation](../docs/README.md) | [🧭 Navigation](../docs/navigation.md)

📖 **[Guide Mobile Flutter](../docs/mobile/guide/README.md)** - Documentation complète

Application mobile Flutter pour JobbingTrack.

---

## 📊 Système de Monitoring et Analytics (En Développement)

### 🎯 Objectif
Un système complet de collecte et d'analyse des métriques pour :
- 🐛 Détecter les erreurs et crashes en production
- 📈 Analyser les performances de l'application
- 👥 Comprendre le comportement des utilisateurs
- 🔍 Identifier les points de friction dans l'UX
- ⚡ Mesurer et optimiser les temps de chargement

### 📦 Modules Instrumentés

| Module | Métriques Collectées |
|--------|---------------------|
| 🔐 **Authentification** | Login/logout, échecs, temps de chargement |
| 📋 **Candidatures** | Création, édition, suppression, filtres, performances |
| 👤 **Contacts** | CRUD, synchronisation, performances |
| 🏢 **Entreprises** | Recherche, sélection, temps de réponse |
| 📅 **Entretiens** | Planification, rappels, performances calendrier |
| 📞 **Relances** | Création, complétion, tracking |
| 🏠 **Dashboard** | Navigation, interactions, temps de chargement |
| 🔄 **Réseau** | Latence API, timeouts, erreurs réseau |
| 💾 **Cache** | Lecture/écriture, taille utilisée |

### 🎨 Fonctionnalités du SDK

```dart
// Tracking événements
analytics.logEvent('application_created', properties: {...});

// Monitoring performances
analytics.logPerformance('load_applications', durationMs);

// Tracking navigation
analytics.logScreenView('ApplicationsScreen');

// Reporting crashes
analytics.reportCrash(error, stackTrace);

// Sessions utilisateur
analytics.startSession();
analytics.endSession();
```

### 📊 Dashboard Analytics Backend
- Vue d'ensemble : utilisateurs actifs, sessions, crashes
- Monitoring des crashes : détection et résolution
- Performances : temps de chargement par écran
- Événements : actions populaires, parcours utilisateurs
- Graphiques : tendances temporelles
- Export : rapports et données brutes

### 🔐 Confidentialité & RGPD
- ✅ Anonymisation des données sensibles
- ✅ Consentement utilisateur
- ✅ Option opt-out disponible
- ✅ Chiffrement des données en transit
- ✅ Respect des durées de conservation

### 📋 Plan d'Implémentation
Voir les détails complets dans [`../STATUS.md`](../STATUS.md) - Section "Système de Monitoring et Analytics Mobile"

**Phases** :
1. Backend : Service mobile-analytics (1-2 jours)
2. SDK Flutter : Services analytics (2-3 jours)
3. Instrumentation : Tous les modules (3-4 jours)
4. Dashboard : Interface visualisation (2-3 jours)
5. Tests & Optimisation (1-2 jours)

**Durée estimée** : 9-14 jours

---

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Lab: Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Cookbook: Useful Flutter samples](https://docs.flutter.dev/cookbook)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.
