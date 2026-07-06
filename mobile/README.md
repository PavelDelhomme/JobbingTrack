# 📱 JobbingTrack Mobile - Flutter

[← Retour au README principal](../README.md) | [📚 Documentation](../docs/README.md) | [🧭 Navigation](../docs/navigation.md)

📖 **[Guide Mobile Flutter](../docs/mobile/guide/README.md)** - Documentation complète

Application mobile Flutter pour JobbingTrack.

### Dates et fuseaux horaires

Les API renvoient des horodatages **ISO 8601** (souvent en UTC). Pour l’affichage utilisateur, préférer **`DateTime.parse(iso).toLocal()`** ou le helper **`lib/utils/datetime_display.dart`** (`formatUserLocalDateTime`) afin d’afficher l’heure **locale de l’appareil**, cohérent avec le backoffice web (`formatLocalDateTime`).

---

## 🌐 URL de l'API (local vs production)

**En local** : le splash ne bloque plus. L'app essaie dans l'ordre :
- `127.0.0.1:5002` (appareil physique avec **adb reverse tcp:5002 tcp:5002**)
- `10.0.2.2:5002` (émulateur Android)
- `localhost:5002`

Puis elle affiche toujours l'écran de connexion. Si l'API ne répond pas, depuis l'écran de connexion vous pouvez **tapper sur « API: ... »** en bas pour saisir l'IP du PC (ex. 192.168.1.42).

**Appareil physique (S21, etc.)** — script tout-en-un :

```bash
bash scripts/mobile/setup-physical-device.sh
```

Le script attend l'appareil ADB, active `adb reverse` sur les ports API, build l'APK avec l'IP LAN du PC en fallback, installe et lance l'app.

Smoke UI / login (credentials depuis `.env`) :

```bash
node scripts/mobile/smoke-login-adb.js
```

**Rebuild obligatoire** après ces changements : `flutter build apk --debug` puis « Installer et lancer » depuis l'émulateur backoffice.

### Versionnement (`1.0.0+5` — qu'est-ce que c'est ?)

- **`1.0.0`** = version **semver** (patch `1.0.1`, mineur `1.1.0`, majeur `2.0.0`).
- **`+5`** = **numéro de build** (chaque APK ; toujours croissant). Ce n'est **pas** `1.0.5`.
- Guide complet : **[VERSIONNEMENT.md](../docs/mobile/VERSIONNEMENT.md)**.

**En production** :
```bash
flutter build apk --dart-define=API_BASE_URL=https://api.votredomaine.com
```

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
Voir les détails complets dans [`../docs/STATUS.md`](../docs/STATUS.md) - Section "Système de Monitoring et Analytics Mobile"

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
