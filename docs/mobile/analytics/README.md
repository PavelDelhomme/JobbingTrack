# 📊 Système de Monitoring et Analytics Mobile

[← Retour Documentation Mobile](../guide/README.md) | [🏠 Documentation Principale](../../README.md) | [📋 TODO](../../../TODO_NEXT_STEPS.md)

---

## 📑 Table des Matières

- [Vue d'Ensemble](#-vue-densemble)
- [Architecture](#-architecture)
- [Composants Backend](#-composants-backend)
- [SDK Flutter](#-sdk-flutter)
- [Instrumentation](#-instrumentation)
- [Dashboard Frontend](#-dashboard-frontend)
- [Métriques Collectées](#-métriques-collectées)
- [Sécurité et Confidentialité](#-sécurité-et-confidentialité)
- [Plan d'Implémentation](#-plan-dimplémentation)
- [Maintenance et Évolution](#-maintenance-et-évolution)

---

## 🎯 Vue d'Ensemble

### Objectifs

Le système de monitoring et analytics mobile permet de :

1. **🐛 Détection d'Erreurs**
   - Capturer les crashes et exceptions
   - Tracer les erreurs réseau
   - Identifier les bugs en production
   - Prioriser les corrections

2. **📈 Analyse de Performance**
   - Mesurer les temps de chargement
   - Suivre la latence des API
   - Monitorer l'utilisation mémoire
   - Détecter les régressions de performance

3. **👥 Comportement Utilisateur**
   - Tracer les parcours utilisateurs
   - Identifier les fonctionnalités populaires
   - Découvrir les points de friction
   - Optimiser l'UX

4. **⚡ Optimisation**
   - Prioriser les améliorations
   - Valider l'impact des changements
   - Suivre l'adoption des fonctionnalités
   - Améliorer la rétention

---

## 🏗️ Architecture

### Schéma Global

```
┌─────────────────────────────────────────────┐
│         Application Mobile Flutter          │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │      Analytics SDK (Singleton)       │  │
│  │  - Event Logger                      │  │
│  │  - Performance Tracker               │  │
│  │  - Crash Reporter                    │  │
│  │  - Session Manager                   │  │
│  └──────────────────────────────────────┘  │
│               │                              │
│               │ (Events Buffer)              │
│               ▼                              │
│  ┌──────────────────────────────────────┐  │
│  │       Local Queue (Offline)          │  │
│  │  - IndexedDB / SQLite                │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                │
                │ HTTP/HTTPS (Batch)
                ▼
┌─────────────────────────────────────────────┐
│    Backend - mobile-analytics-service       │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │         API Endpoints                │  │
│  │  POST /api/v1/mobile/events          │  │
│  │  POST /api/v1/mobile/crashes         │  │
│  │  POST /api/v1/mobile/performance     │  │
│  │  POST /api/v1/mobile/sessions        │  │
│  │  GET  /api/v1/mobile/analytics       │  │
│  └──────────────────────────────────────┘  │
│               │                              │
│               ▼                              │
│  ┌──────────────────────────────────────┐  │
│  │     Business Logic Layer             │  │
│  │  - Validation                        │  │
│  │  - Aggregation                       │  │
│  │  - Alerting                          │  │
│  └──────────────────────────────────────┘  │
│               │                              │
│               ▼                              │
│  ┌──────────────────────────────────────┐  │
│  │     PostgreSQL Database              │  │
│  │  - MobileEvent                       │  │
│  │  - MobileCrash                       │  │
│  │  - MobilePerformance                 │  │
│  │  - MobileSession                     │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                │
                │ REST API
                ▼
┌─────────────────────────────────────────────┐
│    Frontend - Dashboard Analytics           │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │    /backoffice/mobile-analytics      │  │
│  │  - Vue d'ensemble                    │  │
│  │  - Monitoring Crashes                │  │
│  │  - Analyse Performance               │  │
│  │  - Parcours Utilisateurs             │  │
│  │  - Rapports Exportables              │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Flux de Données

```
1. Événement dans l'App
        ↓
2. SDK Analytics capture
        ↓
3. Ajout à la Queue Locale (buffer)
        ↓
4. Batch toutes les 30s ou 100 événements
        ↓
5. Upload vers Backend (avec retry)
        ↓
6. Validation et Stockage BDD
        ↓
7. Agrégation temps réel
        ↓
8. Affichage dans Dashboard
```

---

## 🔧 Composants Backend

### 1. Structure du Service

```
backend/mobile-analytics-service/
├── src/
│   ├── controllers/
│   │   ├── events.controller.js
│   │   ├── crashes.controller.js
│   │   ├── performance.controller.js
│   │   ├── sessions.controller.js
│   │   └── analytics.controller.js
│   ├── services/
│   │   ├── eventService.js
│   │   ├── crashService.js
│   │   ├── performanceService.js
│   │   ├── sessionService.js
│   │   ├── aggregationService.js
│   │   └── alertingService.js
│   ├── models/
│   │   └── (Prisma generated)
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   ├── validation.middleware.js
│   │   └── rateLimit.middleware.js
│   ├── routes/
│   │   └── mobile.routes.js
│   ├── utils/
│   │   ├── batchProcessor.js
│   │   └── metricsCalculator.js
│   └── server.js
├── prisma/
│   └── schema.prisma
├── package.json
└── Dockerfile
```

### 2. Schéma Prisma Complet

```prisma
// backend/mobile-analytics-service/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Événements utilisateur
model MobileEvent {
  id          String   @id @default(uuid())
  userId      String?
  deviceId    String
  sessionId   String?
  eventType   String   // screen_view, button_click, user_action, etc.
  eventName   String
  properties  Json?    // Données additionnelles
  timestamp   DateTime @default(now())
  appVersion  String
  platform    String   // ios, android
  osVersion   String
  deviceModel String?
  networkType String?  // wifi, 4g, 5g, offline
  
  session     MobileSession? @relation(fields: [sessionId], references: [sessionId])
  
  @@index([userId])
  @@index([deviceId])
  @@index([sessionId])
  @@index([eventType])
  @@index([eventName])
  @@index([timestamp])
  @@index([platform])
  @@map("mobile_events")
}

// Crashes et erreurs
model MobileCrash {
  id          String   @id @default(uuid())
  userId      String?
  deviceId    String
  sessionId   String?
  crashType   String   // exception, error, fatal, anr
  message     String   @db.Text
  stackTrace  String   @db.Text
  timestamp   DateTime @default(now())
  appVersion  String
  platform    String
  osVersion   String
  deviceModel String?
  resolved    Boolean  @default(false)
  resolvedAt  DateTime?
  resolvedBy  String?
  notes       String?  @db.Text
  occurrences Int      @default(1)
  lastSeen    DateTime @default(now())
  
  session     MobileSession? @relation(fields: [sessionId], references: [sessionId])
  
  @@index([userId])
  @@index([deviceId])
  @@index([crashType])
  @@index([resolved])
  @@index([timestamp])
  @@index([appVersion])
  @@index([platform])
  @@map("mobile_crashes")
}

// Métriques de performance
model MobilePerformance {
  id              String   @id @default(uuid())
  userId          String?
  deviceId        String
  sessionId       String?
  screenName      String
  metricType      String   // screen_load, api_call, render, memory
  loadTime        Int?     // millisecondes
  apiCallTime     Int?     // temps requêtes API
  renderTime      Int?     // temps de rendu
  memoryUsage     Float?   // MB
  cpuUsage        Float?   // pourcentage
  batteryLevel    Int?     // pourcentage
  batteryDelta    Int?     // consommation depuis dernier mesure
  networkLatency  Int?     // ms
  networkType     String?  // wifi, 4g, 5g
  timestamp       DateTime @default(now())
  appVersion      String
  platform        String
  deviceModel     String?
  
  session         MobileSession? @relation(fields: [sessionId], references: [sessionId])
  
  @@index([screenName])
  @@index([metricType])
  @@index([timestamp])
  @@index([appVersion])
  @@map("mobile_performance")
}

// Sessions utilisateur
model MobileSession {
  id              String    @id @default(uuid())
  userId          String?
  deviceId        String
  sessionId       String    @unique
  startTime       DateTime
  endTime         DateTime?
  duration        Int?      // secondes
  screenViews     Int       @default(0)
  actions         Int       @default(0)
  crashes         Int       @default(0)
  appVersion      String
  platform        String
  osVersion       String
  deviceModel     String?
  isActive        Boolean   @default(true)
  
  events          MobileEvent[]
  crashReports    MobileCrash[]
  performances    MobilePerformance[]
  
  @@index([userId])
  @@index([deviceId])
  @@index([sessionId])
  @@index([startTime])
  @@index([isActive])
  @@map("mobile_sessions")
}

// Métriques agrégées (pour performance dashboard)
model MobileMetricsDaily {
  id                      String   @id @default(uuid())
  date                    DateTime
  platform                String
  appVersion              String
  totalSessions           Int      @default(0)
  totalUsers              Int      @default(0)
  totalEvents             Int      @default(0)
  totalCrashes            Int      @default(0)
  avgSessionDuration      Float?
  avgScreenLoadTime       Float?
  avgApiCallTime          Float?
  crashRate               Float?   // crashes/sessions
  
  @@unique([date, platform, appVersion])
  @@index([date])
  @@map("mobile_metrics_daily")
}
```

### 3. Endpoints API

#### POST /api/v1/mobile/events (Batch)
```javascript
// Enregistrer plusieurs événements
Request:
{
  "events": [
    {
      "eventType": "screen_view",
      "eventName": "applications_screen",
      "properties": { "filter": "pending" },
      "timestamp": "2025-11-04T10:30:00Z",
      "sessionId": "uuid-session",
      "deviceInfo": { ... }
    },
    ...
  ]
}

Response: 201 Created
{
  "success": true,
  "recorded": 15,
  "message": "Events recorded successfully"
}
```

#### POST /api/v1/mobile/crashes
```javascript
// Reporter un crash
Request:
{
  "crashType": "exception",
  "message": "Failed to load applications",
  "stackTrace": "...",
  "sessionId": "uuid-session",
  "timestamp": "2025-11-04T10:30:00Z",
  "deviceInfo": { ... }
}

Response: 201 Created
{
  "success": true,
  "crashId": "uuid-crash",
  "message": "Crash reported"
}
```

#### POST /api/v1/mobile/performance (Batch)
```javascript
// Enregistrer métriques performance
Request:
{
  "metrics": [
    {
      "screenName": "applications_screen",
      "metricType": "screen_load",
      "loadTime": 1200,
      "sessionId": "uuid-session",
      "timestamp": "2025-11-04T10:30:00Z",
      "deviceInfo": { ... }
    },
    ...
  ]
}

Response: 201 Created
```

#### POST /api/v1/mobile/sessions
```javascript
// Créer nouvelle session
Request:
{
  "sessionId": "uuid-session",
  "startTime": "2025-11-04T10:00:00Z",
  "deviceInfo": { ... }
}

Response: 201 Created
```

#### PUT /api/v1/mobile/sessions/:sessionId
```javascript
// Terminer session
Request:
{
  "endTime": "2025-11-04T11:00:00Z",
  "duration": 3600,
  "screenViews": 12,
  "actions": 45
}

Response: 200 OK
```

#### GET /api/v1/mobile/analytics
```javascript
// Récupérer analytics
Query params:
  - startDate
  - endDate
  - platform (ios/android)
  - appVersion
  - metric (crashes/performance/events)

Response:
{
  "summary": {
    "totalSessions": 1250,
    "totalUsers": 450,
    "avgSessionDuration": 320,
    "crashRate": 0.02
  },
  "metrics": [...],
  "trends": [...]
}
```

---

## 📱 SDK Flutter

### 1. Structure du SDK

```
mobile/lib/services/analytics/
├── analytics_service.dart        # Service principal (Singleton)
├── crash_reporter.dart           # Gestion des crashes
├── performance_tracker.dart      # Tracking performance
├── session_manager.dart          # Gestion sessions
├── event_logger.dart             # Log événements
├── batch_queue.dart              # Queue locale + batch
├── device_info_helper.dart       # Info appareil
└── analytics_config.dart         # Configuration
```

### 2. Implementation AnalyticsService

```dart
// mobile/lib/services/analytics/analytics_service.dart

import 'dart:async';
import 'dart:io';
import 'package:uuid/uuid.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../api_service.dart';
import 'batch_queue.dart';

class AnalyticsService {
  static final AnalyticsService _instance = AnalyticsService._internal();
  factory AnalyticsService() => _instance;
  AnalyticsService._internal();
  
  final ApiService _api = ApiService();
  final BatchQueue _queue = BatchQueue();
  final DeviceInfoPlugin _deviceInfo = DeviceInfoPlugin();
  final Connectivity _connectivity = Connectivity();
  
  String? _sessionId;
  DateTime? _sessionStart;
  String? _deviceId;
  String? _appVersion;
  String? _platform;
  String? _osVersion;
  String? _deviceModel;
  bool _initialized = false;
  bool _enabled = true;
  
  int _screenViewCount = 0;
  int _actionCount = 0;
  
  Timer? _uploadTimer;
  
  /// Initialiser le service analytics
  Future<void> initialize() async {
    if (_initialized) return;
    
    try {
      await _loadDeviceInfo();
      await startSession();
      _startUploadTimer();
      _setupErrorHandlers();
      _initialized = true;
      
      print('[Analytics] Initialized successfully');
    } catch (e) {
      print('[Analytics] Initialization error: $e');
    }
  }
  
  /// Charger informations appareil
  Future<void> _loadDeviceInfo() async {
    final packageInfo = await PackageInfo.fromPlatform();
    _appVersion = packageInfo.version;
    
    if (Platform.isAndroid) {
      final androidInfo = await _deviceInfo.androidInfo;
      _platform = 'android';
      _osVersion = 'Android ${androidInfo.version.release}';
      _deviceModel = androidInfo.model;
      _deviceId = androidInfo.id;
    } else if (Platform.isIOS) {
      final iosInfo = await _deviceInfo.iosInfo;
      _platform = 'ios';
      _osVersion = 'iOS ${iosInfo.systemVersion}';
      _deviceModel = iosInfo.model;
      _deviceId = iosInfo.identifierForVendor;
    }
  }
  
  /// Démarrer une nouvelle session
  Future<void> startSession() async {
    _sessionId = Uuid().v4();
    _sessionStart = DateTime.now();
    _screenViewCount = 0;
    _actionCount = 0;
    
    try {
      await _api.post('/mobile/sessions', {
        'sessionId': _sessionId,
        'startTime': _sessionStart!.toIso8601String(),
        'deviceInfo': _getDeviceInfo(),
      });
      
      print('[Analytics] Session started: $_sessionId');
    } catch (e) {
      print('[Analytics] Failed to start session: $e');
    }
  }
  
  /// Terminer la session courante
  Future<void> endSession() async {
    if (_sessionId == null || _sessionStart == null) return;
    
    try {
      final duration = DateTime.now().difference(_sessionStart!).inSeconds;
      
      await _api.put('/mobile/sessions/$_sessionId', {
        'endTime': DateTime.now().toIso8601String(),
        'duration': duration,
        'screenViews': _screenViewCount,
        'actions': _actionCount,
      });
      
      print('[Analytics] Session ended: $_sessionId (${duration}s)');
      
      // Envoyer les événements restants
      await _queue.flush();
      
    } catch (e) {
      print('[Analytics] Failed to end session: $e');
    }
  }
  
  /// Logger un événement utilisateur
  Future<void> logEvent(
    String eventName, {
    Map<String, dynamic>? properties,
  }) async {
    if (!_enabled || !_initialized) return;
    
    _actionCount++;
    
    final event = {
      'eventType': 'user_action',
      'eventName': eventName,
      'properties': properties,
      'timestamp': DateTime.now().toIso8601String(),
      'sessionId': _sessionId,
      'deviceInfo': _getDeviceInfo(),
    };
    
    _queue.add(event);
    print('[Analytics] Event logged: $eventName');
  }
  
  /// Logger une vue d'écran
  Future<void> logScreenView(String screenName) async {
    _screenViewCount++;
    await logEvent('screen_view', properties: {
      'screen': screenName,
      'sequence': _screenViewCount,
    });
  }
  
  /// Logger une métrique de performance
  Future<void> logPerformance(
    String operation,
    int durationMs, {
    String? metricType,
    Map<String, dynamic>? metadata,
  }) async {
    if (!_enabled || !_initialized) return;
    
    final metric = {
      'screenName': operation,
      'metricType': metricType ?? 'operation',
      'loadTime': durationMs,
      'timestamp': DateTime.now().toIso8601String(),
      'sessionId': _sessionId,
      'deviceInfo': _getDeviceInfo(),
      ...?metadata,
    };
    
    _queue.add(metric, queueType: 'performance');
    print('[Analytics] Performance logged: $operation ${durationMs}ms');
  }
  
  /// Reporter un crash
  Future<void> reportCrash(
    dynamic error,
    StackTrace stackTrace, {
    String? crashType,
  }) async {
    if (!_enabled) return;
    
    try {
      await _api.post('/mobile/crashes', {
        'sessionId': _sessionId,
        'crashType': crashType ?? 'exception',
        'message': error.toString(),
        'stackTrace': stackTrace.toString(),
        'timestamp': DateTime.now().toIso8601String(),
        'deviceInfo': _getDeviceInfo(),
      });
      
      print('[Analytics] Crash reported: $error');
    } catch (e) {
      print('[Analytics] Failed to report crash: $e');
    }
  }
  
  /// Timer pour upload batch
  void _startUploadTimer() {
    _uploadTimer?.cancel();
    _uploadTimer = Timer.periodic(Duration(seconds: 30), (timer) {
      _uploadBatch();
    });
  }
  
  /// Upload batch d'événements
  Future<void> _uploadBatch() async {
    try {
      final events = await _queue.getBatch(maxSize: 100);
      if (events.isEmpty) return;
      
      await _api.post('/mobile/events', {'events': events});
      await _queue.removeBatch(events.length);
      
      print('[Analytics] Batch uploaded: ${events.length} events');
    } catch (e) {
      print('[Analytics] Batch upload failed: $e');
    }
  }
  
  /// Configurer handlers d'erreurs globaux
  void _setupErrorHandlers() {
    FlutterError.onError = (FlutterErrorDetails details) {
      reportCrash(details.exception, details.stack ?? StackTrace.current,
          crashType: 'flutter_error');
    };
    
    // Erreurs non Flutter
    runZonedGuarded(() {
      // App code runs here
    }, (error, stackTrace) {
      reportCrash(error, stackTrace, crashType: 'unhandled_error');
    });
  }
  
  /// Obtenir info appareil
  Map<String, dynamic> _getDeviceInfo() async {
    final networkType = await _getNetworkType();
    
    return {
      'deviceId': _deviceId,
      'appVersion': _appVersion,
      'platform': _platform,
      'osVersion': _osVersion,
      'deviceModel': _deviceModel,
      'networkType': networkType,
    };
  }
  
  /// Obtenir type de réseau
  Future<String> _getNetworkType() async {
    try {
      final result = await _connectivity.checkConnectivity();
      switch (result) {
        case ConnectivityResult.wifi:
          return 'wifi';
        case ConnectivityResult.mobile:
          return 'mobile';
        case ConnectivityResult.none:
          return 'offline';
        default:
          return 'unknown';
      }
    } catch (e) {
      return 'unknown';
    }
  }
  
  /// Activer/désactiver analytics
  void setEnabled(bool enabled) {
    _enabled = enabled;
    print('[Analytics] ${enabled ? 'Enabled' : 'Disabled'}');
  }
  
  /// Dispose
  void dispose() {
    _uploadTimer?.cancel();
    endSession();
  }
}
```

### 3. Performance Tracker Helper

```dart
// mobile/lib/services/analytics/performance_tracker.dart

import 'analytics_service.dart';

class PerformanceTracker {
  final String operation;
  final Stopwatch _stopwatch = Stopwatch();
  final Map<String, dynamic>? metadata;
  
  PerformanceTracker(this.operation, {this.metadata});
  
  void start() {
    _stopwatch.start();
  }
  
  Future<void> stop() async {
    _stopwatch.stop();
    final duration = _stopwatch.elapsedMilliseconds;
    
    await AnalyticsService().logPerformance(
      operation,
      duration,
      metadata: metadata,
    );
  }
}

// Usage:
// final tracker = PerformanceTracker('load_applications');
// tracker.start();
// await loadApplications();
// await tracker.stop();
```

---

## 🎨 Instrumentation

### Exemple : Module Authentification

```dart
// mobile/lib/providers/auth_provider.dart

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  final AnalyticsService _analytics = AnalyticsService();
  
  Future<void> login(String email, String password) async {
    final tracker = PerformanceTracker('login_flow');
    tracker.start();
    
    try {
      await _analytics.logEvent('login_attempt', properties: {
        'method': 'email',
      });
      
      final result = await _authService.login(email, password);
      
      await _analytics.logEvent('login_success', properties: {
        'userId': result.userId,
      });
      
      await tracker.stop();
      
      notifyListeners();
    } catch (e) {
      await _analytics.logEvent('login_failure', properties: {
        'reason': e.toString(),
      });
      
      await _analytics.reportCrash(e, StackTrace.current);
      await tracker.stop();
      
      rethrow;
    }
  }
}
```

### Exemple : Tracking Navigation

```dart
// mobile/lib/main.dart

class MyApp extends StatelessWidget {
  final _analytics = AnalyticsService();
  
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorObservers: [
        AnalyticsNavigatorObserver(_analytics),
      ],
      // ...
    );
  }
}

class AnalyticsNavigatorObserver extends NavigatorObserver {
  final AnalyticsService analytics;
  
  AnalyticsNavigatorObserver(this.analytics);
  
  @override
  void didPush(Route route, Route? previousRoute) {
    super.didPush(route, previousRoute);
    if (route.settings.name != null) {
      analytics.logScreenView(route.settings.name!);
    }
  }
}
```

---

## 📊 Dashboard Frontend

**Fichier** : `frontend/src/app/(admin)/backoffice/mobile-analytics/page.tsx`

### Sections principales :

1. **Vue d'Ensemble** - Métriques clés
2. **Monitoring Crashes** - Liste et détails
3. **Performance** - Graphiques par écran
4. **Événements** - Actions utilisateurs
5. **Sessions** - Durées et parcours
6. **Export** - Téléchargement données

---

## 🔐 Sécurité et Confidentialité

### RGPD et Confidentialité

1. **Consentement Utilisateur**
   - Demander permission au premier lancement
   - Option opt-out dans paramètres
   - Respecter le choix utilisateur

2. **Anonymisation**
   - Pas de données personnelles sensibles
   - Hash des IDs utilisateur
   - Pas de tracking cross-app

3. **Rétention des Données**
   - Événements : 90 jours
   - Crashes : 180 jours
   - Sessions : 30 jours
   - Métriques agrégées : 1 an

4. **Chiffrement**
   - HTTPS obligatoire
   - Chiffrement BDD au repos

---

## 📋 Plan d'Implémentation

Voir [`TODO_NEXT_STEPS.md`](../../../TODO_NEXT_STEPS.md) pour le plan détaillé.

---

## 🔄 Maintenance et Évolution

### Monitoring du Système Analytics

- Alertes si taux d'erreur > 5%
- Monitoring latence upload
- Vérification taille queue locale

### Évolutions Futures

- Heatmaps d'utilisation
- A/B testing intégré
- Session replay
- Funnels de conversion
- Alertes temps réel (Slack/Email)

---

[← Retour Documentation Mobile](../guide/README.md) | [🏠 Documentation Principale](../../README.md)

