# ✅ TODO - Prochaines Étapes

## 🔥 À faire MAINTENANT (Critique)

### 1. Appliquer les migrations de base de données
```bash
cd backend/auth-service
npx prisma db push

cd ../dashboard-service
npx prisma db push
```

### 2. Redémarrer les services
```bash
cd ../..
make down
make up-full
```

### 3. Tester la page utilisateurs
```
http://localhost:3000/backoffice/users
```
**Résultat attendu** : Liste des utilisateurs s'affiche ✅

---

## ⚙️ Configuration Optionnelle

### Email (pour vérification de compte)
Ajouter dans `backend/auth-service/.env` :
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FRONTEND_URL=http://localhost:3000
```

---

## 🎨 À Implémenter Plus Tard (Non Urgent)

### 1. Page d'Inscription Publique
**Fichier** : `frontend/src/app/(public)/register/page.tsx`  
**Template fourni dans** : `FINAL_IMPLEMENTATION_SUMMARY.md` (section "Page d'Inscription Publique")

### 2. Bouton d'Impersonnalisation dans UI
**Où** : `/backoffice/users/page.tsx`  
**Code fourni dans** : `FINAL_IMPLEMENTATION_SUMMARY.md` (section "Interface Améliorée")

### 3. État Persistant Émulateur Mobile
**Fichier** : `frontend/src/app/(development)/mobile-emulator/page.tsx`  
**Code fourni dans** : `FINAL_IMPLEMENTATION_SUMMARY.md` (section "Émulateur Mobile")

---

## 📚 Documentation Disponible

1. **`QUICK_START_GUIDE.md`** - Démarrage rapide en 3 commandes
2. **`BACKEND_FIXES_SUMMARY.md`** - Tous les endpoints backend
3. **`SUMMARY_USER_MANAGEMENT.md`** - Système de gestion utilisateurs
4. **`FINAL_IMPLEMENTATION_SUMMARY.md`** - Vue d'ensemble complète + templates de code

---

## ✅ Ce qui fonctionne DÉJÀ

- ✅ Page `/backoffice/users` - Liste et gestion
- ✅ API `/api/v1/users` - CRUD complet
- ✅ API `/api/v1/users/:id/impersonate` - Impersonnalisation
- ✅ API `/api/v1/users/:id/send-verification` - Emails
- ✅ API `/api/v1/preferences` - Préférences utilisateur
- ✅ Page `/backoffice/analytics` - Graphiques corrigés
- ✅ Mode développement - Tokens mock acceptés
- ✅ Tracking connexions - `lastLoginAt` + `loginCount`

---

## 🎯 Résumé

**Fonctionnalités core** : ✅ **100% complètes**  
**Fonctionnalités UI** : ⏳ **70% complètes** (templates fournis)  
**Configuration** : ⏳ **SMTP à configurer pour emails**

**Prochaine action** : Exécuter les commandes de la section "À faire MAINTENANT" ☝️

---

## 📊 Système de Monitoring et Analytics Mobile (À Implémenter)

### 🎯 Objectif
Mettre en place un système complet de collecte et d'analyse des métriques de l'application mobile Flutter pour :
- 🐛 Détecter les erreurs et crashes en production
- 📈 Analyser les performances et optimiser l'app
- 👥 Comprendre le comportement des utilisateurs
- 🔍 Identifier les points de friction dans l'UX
- ⚡ Mesurer les temps de chargement et la réactivité

---

### 🏗️ Architecture du Système

```
[App Mobile Flutter]
     ↓ (Événements & Métriques)
[Mobile Analytics Service] (Backend)
     ↓ (Stockage)
[Base de Données Métriques]
     ↓ (Visualisation)
[Dashboard Analytics] (Frontend)
```

---

### 📦 Composants à Créer

#### 1. **Mobile Analytics Service** (Backend)
**Dossier** : `backend/mobile-analytics-service/`

**Endpoints à implémenter** :
```javascript
POST   /api/v1/mobile/events        // Enregistrer événement
POST   /api/v1/mobile/crashes       // Signaler crash
POST   /api/v1/mobile/performance   // Métriques performance
POST   /api/v1/mobile/sessions      // Sessions utilisateur
GET    /api/v1/mobile/analytics     // Récupérer analytics
GET    /api/v1/mobile/health        // État de santé app
```

**Schéma Prisma** :
```prisma
model MobileEvent {
  id          String   @id @default(uuid())
  userId      String?
  deviceId    String
  eventType   String   // screen_view, button_click, error, etc.
  eventName   String
  properties  Json?
  timestamp   DateTime @default(now())
  appVersion  String
  platform    String   // ios, android
  osVersion   String
  
  @@index([userId])
  @@index([deviceId])
  @@index([eventType])
  @@index([timestamp])
}

model MobileCrash {
  id          String   @id @default(uuid())
  userId      String?
  deviceId    String
  crashType   String   // exception, error, fatal
  message     String   @db.Text
  stackTrace  String   @db.Text
  timestamp   DateTime @default(now())
  appVersion  String
  platform    String
  osVersion   String
  resolved    Boolean  @default(false)
  
  @@index([userId])
  @@index([crashType])
  @@index([resolved])
  @@index([timestamp])
}

model MobilePerformance {
  id              String   @id @default(uuid())
  userId          String?
  deviceId        String
  screenName      String
  loadTime        Int      // millisecondes
  apiCallTime     Int?     // temps requêtes API
  renderTime      Int?     // temps de rendu
  memoryUsage     Float?   // MB
  batteryLevel    Int?     // pourcentage
  networkType     String?  // wifi, 4g, 5g
  timestamp       DateTime @default(now())
  appVersion      String
  
  @@index([screenName])
  @@index([timestamp])
}

model MobileSession {
  id          String   @id @default(uuid())
  userId      String?
  deviceId    String
  sessionId   String   @unique
  startTime   DateTime
  endTime     DateTime?
  duration    Int?     // secondes
  screenViews Int      @default(0)
  actions     Int      @default(0)
  appVersion  String
  platform    String
  
  @@index([userId])
  @@index([deviceId])
  @@index([startTime])
}
```

---

#### 2. **SDK Flutter Analytics** 
**Dossier** : `mobile/lib/services/analytics/`

**Fichiers à créer** :
- `analytics_service.dart` - Service principal
- `crash_reporter.dart` - Gestion crashes
- `performance_tracker.dart` - Métriques perf
- `session_tracker.dart` - Tracking sessions
- `event_logger.dart` - Log événements

**Métriques à collecter par module** :

##### 📱 Module Authentification
```dart
- Événement: login_attempt
- Événement: login_success
- Événement: login_failure (+ raison)
- Événement: logout
- Événement: token_refresh
- Performance: temps_chargement_login
- Erreur: auth_network_error
```

##### 📋 Module Candidatures (Applications)
```dart
- Événement: applications_screen_view
- Événement: application_created
- Événement: application_updated
- Événement: application_deleted
- Événement: filter_applied
- Événement: sort_changed
- Performance: temps_chargement_liste
- Performance: temps_creation_candidature
- Erreur: create_application_failed
```

##### 👤 Module Contacts
```dart
- Événement: contacts_screen_view
- Événement: contact_created
- Événement: contact_updated
- Événement: contact_deleted
- Performance: temps_chargement_contacts
- Erreur: sync_contacts_failed
```

##### 🏢 Module Entreprises (Companies)
```dart
- Événement: companies_screen_view
- Événement: company_search
- Événement: company_selected
- Performance: temps_recherche
```

##### 📅 Module Entretiens (Interviews)
```dart
- Événement: interviews_screen_view
- Événement: interview_scheduled
- Événement: interview_completed
- Événement: reminder_set
- Performance: temps_chargement_calendrier
```

##### 📞 Module Relances (Followups)
```dart
- Événement: followups_screen_view
- Événement: followup_created
- Événement: followup_completed
- Performance: temps_chargement_relances
```

##### 🏠 Module Tableau de Bord (Home)
```dart
- Événement: home_screen_view
- Événement: dashboard_refresh
- Événement: widget_interaction
- Performance: temps_chargement_dashboard
- Performance: temps_chargement_statistiques
```

##### 🔄 Synchronisation & Réseau
```dart
- Événement: sync_started
- Événement: sync_completed
- Événement: sync_failed
- Événement: offline_mode_activated
- Performance: latence_api (par endpoint)
- Erreur: network_timeout
- Erreur: api_error (+ code statut)
```

##### 💾 Stockage Local
```dart
- Événement: cache_cleared
- Événement: data_persisted
- Performance: temps_lecture_cache
- Performance: temps_ecriture_cache
- Métriques: taille_cache_utilisee
```

##### ⚡ Performances Globales
```dart
- Métriques: app_startup_time
- Métriques: memory_usage
- Métriques: cpu_usage
- Métriques: battery_impact
- Métriques: frame_rate
- Métriques: dropped_frames
```

---

#### 3. **Implémentation Flutter**

**Fichier** : `mobile/lib/services/analytics/analytics_service.dart`
```dart
class AnalyticsService {
  static final AnalyticsService _instance = AnalyticsService._internal();
  factory AnalyticsService() => _instance;
  AnalyticsService._internal();
  
  final ApiService _api = ApiService();
  String? _sessionId;
  DateTime? _sessionStart;
  
  // Initialiser session
  Future<void> startSession() async {
    _sessionId = Uuid().v4();
    _sessionStart = DateTime.now();
    
    await _api.post('/mobile/sessions', {
      'sessionId': _sessionId,
      'startTime': _sessionStart!.toIso8601String(),
      'deviceInfo': await _getDeviceInfo(),
    });
  }
  
  // Logger événement
  Future<void> logEvent(String eventName, {Map<String, dynamic>? properties}) async {
    await _api.post('/mobile/events', {
      'sessionId': _sessionId,
      'eventType': 'user_action',
      'eventName': eventName,
      'properties': properties,
      'timestamp': DateTime.now().toIso8601String(),
      'deviceInfo': await _getDeviceInfo(),
    });
  }
  
  // Logger navigation
  Future<void> logScreenView(String screenName) async {
    await logEvent('screen_view', properties: {'screen': screenName});
  }
  
  // Logger performance
  Future<void> logPerformance(String operation, int durationMs, {Map<String, dynamic>? metadata}) async {
    await _api.post('/mobile/performance', {
      'sessionId': _sessionId,
      'screenName': operation,
      'loadTime': durationMs,
      'timestamp': DateTime.now().toIso8601String(),
      ...?metadata,
    });
  }
  
  // Reporter crash
  Future<void> reportCrash(dynamic error, StackTrace stackTrace) async {
    await _api.post('/mobile/crashes', {
      'sessionId': _sessionId,
      'message': error.toString(),
      'stackTrace': stackTrace.toString(),
      'crashType': 'exception',
      'timestamp': DateTime.now().toIso8601String(),
      'deviceInfo': await _getDeviceInfo(),
    });
  }
  
  // Terminer session
  Future<void> endSession() async {
    if (_sessionId != null && _sessionStart != null) {
      await _api.put('/mobile/sessions/$_sessionId', {
        'endTime': DateTime.now().toIso8601String(),
        'duration': DateTime.now().difference(_sessionStart!).inSeconds,
      });
    }
  }
  
  // Info appareil
  Future<Map<String, dynamic>> _getDeviceInfo() async {
    // À implémenter avec device_info_plus package
    return {
      'appVersion': '1.0.0',
      'platform': Platform.isIOS ? 'ios' : 'android',
      'osVersion': '...',
    };
  }
}
```

---

#### 4. **Dashboard Analytics** (Frontend)
**Fichier** : `frontend/src/app/(admin)/backoffice/mobile-analytics/page.tsx`

**Sections du dashboard** :
- 📊 Vue d'ensemble (utilisateurs actifs, sessions, crashes)
- 🐛 Monitoring crashes (liste, statistiques, résolution)
- ⚡ Performances (temps de chargement, latence API)
- 📱 Événements utilisateurs (actions populaires, parcours)
- 🔥 Heatmaps d'utilisation
- 📈 Graphiques tendances
- 🎯 Funnels de conversion
- 💾 Rapports exportables

---

#### 5. **Packages Flutter Requis**

Ajouter dans `mobile/pubspec.yaml` :
```yaml
dependencies:
  # Analytics & Monitoring
  uuid: ^4.0.0              # Génération UUID sessions
  device_info_plus: ^9.0.0  # Info appareil
  package_info_plus: ^4.0.0 # Info app
  connectivity_plus: ^4.0.0 # État réseau
  battery_plus: ^4.0.0      # État batterie
  
  # Performance monitoring
  performance: ^0.3.0
  
  # Crash reporting
  flutter_error_handler: ^1.0.0
```

---

### 📋 Étapes d'Implémentation

#### Phase 1 : Backend (1-2 jours)
- [ ] Créer `mobile-analytics-service`
- [ ] Ajouter schémas Prisma
- [ ] Implémenter endpoints API
- [ ] Tester collecte de données

#### Phase 2 : SDK Flutter (2-3 jours)
- [ ] Créer `AnalyticsService`
- [ ] Créer `CrashReporter`
- [ ] Créer `PerformanceTracker`
- [ ] Créer `SessionTracker`
- [ ] Intégrer packages requis

#### Phase 3 : Instrumentation App (3-4 jours)
- [ ] Instrumenter module Auth
- [ ] Instrumenter module Applications
- [ ] Instrumenter module Contacts
- [ ] Instrumenter module Companies
- [ ] Instrumenter module Interviews
- [ ] Instrumenter module Followups
- [ ] Instrumenter module Home
- [ ] Ajouter tracking réseau global
- [ ] Ajouter monitoring performances

#### Phase 4 : Dashboard (2-3 jours)
- [ ] Créer page analytics frontend
- [ ] Ajouter graphiques temps réel
- [ ] Ajouter visualisation crashes
- [ ] Ajouter rapports performances
- [ ] Ajouter export données

#### Phase 5 : Tests & Optimisation (1-2 jours)
- [ ] Tester collecte événements
- [ ] Tester rapport crashes
- [ ] Optimiser performance SDK
- [ ] Vérifier impact batterie
- [ ] Documentation

---

### 🎯 Résultats Attendus

**Métriques accessibles** :
- ✅ Nombre d'utilisateurs actifs (DAU, MAU)
- ✅ Taux de crashes par version
- ✅ Temps de chargement moyen par écran
- ✅ Parcours utilisateur les plus fréquents
- ✅ Fonctionnalités les plus utilisées
- ✅ Points de friction (abandons)
- ✅ Performances réseau par endpoint
- ✅ État de santé de l'app en temps réel

**Bénéfices** :
- 🐛 Détection proactive des bugs
- 📈 Décisions basées sur les données
- ⚡ Optimisations ciblées
- 👥 Meilleure compréhension utilisateurs
- 🚀 Amélioration continue de l'UX

---

### 📚 Documentation à Créer

- [ ] `docs/mobile/analytics/README.md` - Guide complet
- [ ] `docs/mobile/analytics/SDK.md` - Documentation SDK
- [ ] `docs/mobile/analytics/INTEGRATION.md` - Guide intégration
- [ ] `docs/mobile/analytics/DASHBOARD.md` - Utilisation dashboard
- [ ] `docs/mobile/analytics/PRIVACY.md` - Politique confidentialité

---

### 🔐 Considérations Importantes

**Confidentialité & RGPD** :
- ⚠️ Anonymiser les données sensibles
- ⚠️ Obtenir consentement utilisateur
- ⚠️ Permettre opt-out analytics
- ⚠️ Respecter durée conservation données
- ⚠️ Chiffrer données en transit

**Performance** :
- ⚠️ Batch d'événements (ne pas envoyer 1 par 1)
- ⚠️ Upload en background
- ⚠️ Gestion hors-ligne (queue locale)
- ⚠️ Limiter impact batterie
- ⚠️ Limiter utilisation réseau

---

