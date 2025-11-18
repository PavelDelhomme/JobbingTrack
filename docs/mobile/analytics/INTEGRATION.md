# 🔧 Guide d'Intégration - Analytics Mobile

[← Retour Analytics](README.md) | [📋 STATUS](../../../STATUS.md)

---

## 📑 Table des Matières

- [Prérequis](#-prérequis)
- [Installation Backend](#-installation-backend)
- [Installation SDK Flutter](#-installation-sdk-flutter)
- [Configuration](#-configuration)
- [Instrumentation des Modules](#-instrumentation-des-modules)
- [Tests](#-tests)
- [Déploiement](#-déploiement)

---

## ✅ Prérequis

- Node.js 20.x
- PostgreSQL 14+
- Flutter 3.x
- Docker & Docker Compose

---

## 🔧 Installation Backend

### 1. Créer le service

```bash
cd backend
mkdir mobile-analytics-service
cd mobile-analytics-service
npm init -y
```

### 2. Installer dépendances

```bash
npm install express @prisma/client cors helmet express-rate-limit
npm install -D prisma nodemon
```

### 3. Créer structure

```bash
mkdir -p src/{controllers,services,middlewares,routes,utils}
mkdir prisma
```

### 4. Créer schéma Prisma

Copier le schéma depuis [`README.md#composants-backend`](README.md#2-schéma-prisma-complet) dans `prisma/schema.prisma`

### 5. Configurer Prisma

```bash
# Créer .env
cat > .env << EOF
DATABASE_URL="postgresql://user:password@localhost:5432/jobbingtrack?schema=mobile_analytics"
PORT=3010
JWT_SECRET=your-secret-key
EOF

# Générer client Prisma
npx prisma generate

# Créer les tables
npx prisma db push
```

### 6. Créer le serveur

**Fichier** : `src/server.js`

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mobileRoutes = require('./routes/mobile.routes');

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // max 1000 requêtes par 15min
});
app.use('/api/v1/mobile/', limiter);

// Routes
app.use('/api/v1/mobile', mobileRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'mobile-analytics' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3010;
app.listen(PORT, () => {
  console.log(`Mobile Analytics Service running on port ${PORT}`);
});
```

### 7. Créer les routes

**Fichier** : `src/routes/mobile.routes.js`

```javascript
const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/events.controller');
const crashesController = require('../controllers/crashes.controller');
const performanceController = require('../controllers/performance.controller');
const sessionsController = require('../controllers/sessions.controller');
const analyticsController = require('../controllers/analytics.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Events
router.post('/events', authMiddleware.validateDevice, eventsController.createBatch);

// Crashes
router.post('/crashes', authMiddleware.validateDevice, crashesController.create);
router.get('/crashes', authMiddleware.requireAuth, crashesController.list);
router.put('/crashes/:id/resolve', authMiddleware.requireAuth, crashesController.resolve);

// Performance
router.post('/performance', authMiddleware.validateDevice, performanceController.createBatch);

// Sessions
router.post('/sessions', authMiddleware.validateDevice, sessionsController.create);
router.put('/sessions/:sessionId', authMiddleware.validateDevice, sessionsController.update);

// Analytics (dashboard)
router.get('/analytics', authMiddleware.requireAuth, analyticsController.getAnalytics);
router.get('/analytics/summary', authMiddleware.requireAuth, analyticsController.getSummary);
router.get('/analytics/trends', authMiddleware.requireAuth, analyticsController.getTrends);

module.exports = router;
```

### 8. Créer les controllers

**Fichier** : `src/controllers/events.controller.js`

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createBatch = async (req, res) => {
  try {
    const { events } = req.body;
    
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'Events array required' });
    }
    
    // Limiter batch size
    if (events.length > 500) {
      return res.status(400).json({ error: 'Batch too large (max 500)' });
    }
    
    // Préparer les données
    const eventsData = events.map(event => ({
      userId: event.userId,
      deviceId: event.deviceInfo?.deviceId,
      sessionId: event.sessionId,
      eventType: event.eventType,
      eventName: event.eventName,
      properties: event.properties || {},
      timestamp: new Date(event.timestamp),
      appVersion: event.deviceInfo?.appVersion,
      platform: event.deviceInfo?.platform,
      osVersion: event.deviceInfo?.osVersion,
      deviceModel: event.deviceInfo?.deviceModel,
      networkType: event.deviceInfo?.networkType,
    }));
    
    // Insertion batch
    const result = await prisma.mobileEvent.createMany({
      data: eventsData,
      skipDuplicates: true,
    });
    
    // Incrémenter compteurs de session
    if (events[0]?.sessionId) {
      await prisma.mobileSession.update({
        where: { sessionId: events[0].sessionId },
        data: {
          actions: { increment: events.length },
        },
      }).catch(() => {}); // Ignore si session n'existe pas encore
    }
    
    res.status(201).json({
      success: true,
      recorded: result.count,
    });
    
  } catch (error) {
    console.error('Error creating events batch:', error);
    res.status(500).json({ error: 'Failed to record events' });
  }
};
```

**Fichier** : `src/controllers/crashes.controller.js`

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.create = async (req, res) => {
  try {
    const { crashType, message, stackTrace, sessionId, timestamp, deviceInfo } = req.body;
    
    // Vérifier si crash similaire existe déjà
    const existing = await prisma.mobileCrash.findFirst({
      where: {
        message,
        appVersion: deviceInfo.appVersion,
        resolved: false,
      },
    });
    
    if (existing) {
      // Incrémenter occurrences
      await prisma.mobileCrash.update({
        where: { id: existing.id },
        data: {
          occurrences: { increment: 1 },
          lastSeen: new Date(),
        },
      });
      
      return res.status(201).json({
        success: true,
        crashId: existing.id,
        duplicate: true,
      });
    }
    
    // Créer nouveau crash
    const crash = await prisma.mobileCrash.create({
      data: {
        userId: req.userId,
        deviceId: deviceInfo.deviceId,
        sessionId,
        crashType,
        message,
        stackTrace,
        timestamp: new Date(timestamp),
        appVersion: deviceInfo.appVersion,
        platform: deviceInfo.platform,
        osVersion: deviceInfo.osVersion,
        deviceModel: deviceInfo.deviceModel,
      },
    });
    
    // Incrémenter compteur session
    if (sessionId) {
      await prisma.mobileSession.update({
        where: { sessionId },
        data: { crashes: { increment: 1 } },
      }).catch(() => {});
    }
    
    // TODO: Envoyer alerte si crash critique
    
    res.status(201).json({
      success: true,
      crashId: crash.id,
    });
    
  } catch (error) {
    console.error('Error reporting crash:', error);
    res.status(500).json({ error: 'Failed to report crash' });
  }
};

exports.list = async (req, res) => {
  try {
    const { resolved, platform, appVersion, limit = 100 } = req.query;
    
    const crashes = await prisma.mobileCrash.findMany({
      where: {
        ...(resolved !== undefined && { resolved: resolved === 'true' }),
        ...(platform && { platform }),
        ...(appVersion && { appVersion }),
      },
      orderBy: [
        { occurrences: 'desc' },
        { lastSeen: 'desc' },
      ],
      take: parseInt(limit),
    });
    
    res.json({ crashes });
    
  } catch (error) {
    console.error('Error listing crashes:', error);
    res.status(500).json({ error: 'Failed to list crashes' });
  }
};

exports.resolve = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const crash = await prisma.mobileCrash.update({
      where: { id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: req.userId,
        notes,
      },
    });
    
    res.json({ success: true, crash });
    
  } catch (error) {
    console.error('Error resolving crash:', error);
    res.status(500).json({ error: 'Failed to resolve crash' });
  }
};
```

### 9. Ajouter au docker-compose

**Fichier** : `backend/docker-compose.yml`

```yaml
services:
  # ... autres services
  
  mobile-analytics-service:
    build: ./mobile-analytics-service
    container_name: mobile-analytics-service
    ports:
      - "3010:3010"
    environment:
      - DATABASE_URL=postgresql://user:password@postgres:5432/jobbingtrack?schema=mobile_analytics
      - JWT_SECRET=${JWT_SECRET}
      - NODE_ENV=production
    depends_on:
      - postgres
    networks:
      - jobbingtrack-network
    restart: unless-stopped
```

### 10. Ajouter à l'API Gateway

**Fichier** : `backend/api-gateway/src/routes/index.js`

```javascript
// Mobile Analytics
app.use('/api/v1/mobile', createProxyMiddleware({
  target: 'http://mobile-analytics-service:3010',
  changeOrigin: true,
}));
```

---

## 📱 Installation SDK Flutter

### 1. Ajouter dépendances

**Fichier** : `mobile/pubspec.yaml`

```yaml
dependencies:
  # Analytics & Monitoring
  uuid: ^4.0.0
  device_info_plus: ^9.0.0
  package_info_plus: ^4.0.0
  connectivity_plus: ^4.0.0
  battery_plus: ^4.0.0
  sqflite: ^2.3.0  # Pour queue locale
  path_provider: ^2.1.0
```

### 2. Installer packages

```bash
cd mobile
flutter pub get
```

### 3. Créer structure SDK

```bash
mkdir -p lib/services/analytics
cd lib/services/analytics
```

### 4. Copier les fichiers SDK

Copier le code depuis [`README.md#sdk-flutter`](README.md#2-implementation-analyticsservice) :
- `analytics_service.dart`
- `batch_queue.dart`
- `performance_tracker.dart`

### 5. Initialiser dans main.dart

**Fichier** : `mobile/lib/main.dart`

```dart
import 'services/analytics/analytics_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialiser analytics
  final analytics = AnalyticsService();
  await analytics.initialize();
  
  // Configurer error handlers
  FlutterError.onError = (details) {
    analytics.reportCrash(details.exception, details.stack ?? StackTrace.current);
  };
  
  runZonedGuarded(
    () => runApp(MyApp()),
    (error, stackTrace) {
      analytics.reportCrash(error, stackTrace);
    },
  );
}

class MyApp extends StatelessWidget {
  final analytics = AnalyticsService();
  
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorObservers: [
        AnalyticsNavigatorObserver(analytics),
      ],
      // ...
    );
  }
}

// Observer pour tracking navigation
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

## ⚙️ Configuration

### 1. Variables d'environnement Backend

**Fichier** : `backend/mobile-analytics-service/.env`

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/jobbingtrack?schema=mobile_analytics

# Server
PORT=3010
NODE_ENV=development

# Auth
JWT_SECRET=your-secret-key

# Analytics Config
MAX_BATCH_SIZE=500
EVENT_RETENTION_DAYS=90
CRASH_RETENTION_DAYS=180
SESSION_RETENTION_DAYS=30

# Alerting
ENABLE_CRASH_ALERTS=true
CRASH_ALERT_THRESHOLD=10
ALERT_EMAIL=admin@example.com
```

### 2. Configuration Flutter

**Fichier** : `mobile/lib/services/analytics/analytics_config.dart`

```dart
class AnalyticsConfig {
  static const String apiBaseUrl = 'http://localhost:3000/api/v1';
  static const bool enabled = true;
  static const int batchSize = 100;
  static const int uploadIntervalSeconds = 30;
  static const int maxQueueSize = 1000;
  static const bool debugMode = true;
}
```

---

## 🎨 Instrumentation des Modules

### Module Applications

**Fichier** : `mobile/lib/providers/application_provider.dart`

```dart
class ApplicationProvider extends ChangeNotifier {
  final ApplicationService _service = ApplicationService();
  final AnalyticsService _analytics = AnalyticsService();
  
  Future<void> loadApplications() async {
    final tracker = PerformanceTracker('load_applications');
    tracker.start();
    
    try {
      _applications = await _service.getApplications();
      await tracker.stop();
      
      await _analytics.logEvent('applications_loaded', properties: {
        'count': _applications.length,
      });
      
      notifyListeners();
    } catch (e) {
      await _analytics.reportCrash(e, StackTrace.current);
      await tracker.stop();
      rethrow;
    }
  }
  
  Future<void> createApplication(ApplicationModel app) async {
    try {
      await _analytics.logEvent('application_create_attempt');
      
      final result = await _service.createApplication(app);
      
      await _analytics.logEvent('application_created', properties: {
        'companyId': app.companyId,
        'status': app.status,
      });
      
      await loadApplications();
    } catch (e) {
      await _analytics.logEvent('application_create_failed', properties: {
        'error': e.toString(),
      });
      rethrow;
    }
  }
}
```

### Tracking Global des Appels API

**Fichier** : `mobile/lib/services/api_service.dart`

```dart
class ApiService {
  final AnalyticsService _analytics = AnalyticsService();
  
  Future<dynamic> get(String endpoint) async {
    final tracker = PerformanceTracker('api_call', metadata: {
      'endpoint': endpoint,
      'method': 'GET',
    });
    tracker.start();
    
    try {
      final response = await http.get(Uri.parse('$baseUrl$endpoint'));
      await tracker.stop();
      
      if (response.statusCode >= 400) {
        await _analytics.logEvent('api_error', properties: {
          'endpoint': endpoint,
          'statusCode': response.statusCode,
        });
      }
      
      return jsonDecode(response.body);
    } catch (e) {
      await _analytics.reportCrash(e, StackTrace.current);
      await tracker.stop();
      rethrow;
    }
  }
}
```

---

## 🧪 Tests

### 1. Tester Backend

```bash
cd backend/mobile-analytics-service

# Tester health
curl http://localhost:3010/health

# Tester création session
curl -X POST http://localhost:3010/api/v1/mobile/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-123",
    "startTime": "2025-11-04T10:00:00Z",
    "deviceInfo": {
      "deviceId": "test-device",
      "appVersion": "1.0.0",
      "platform": "android",
      "osVersion": "Android 13"
    }
  }'

# Tester batch événements
curl -X POST http://localhost:3010/api/v1/mobile/events \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {
        "eventType": "screen_view",
        "eventName": "home_screen",
        "timestamp": "2025-11-04T10:01:00Z",
        "sessionId": "test-session-123",
        "deviceInfo": { ... }
      }
    ]
  }'
```

### 2. Tester SDK Flutter

```dart
// mobile/test/analytics_test.dart

import 'package:flutter_test/flutter_test.dart';
import 'package:jobbingtrack/services/analytics/analytics_service.dart';

void main() {
  late AnalyticsService analytics;
  
  setUp(() async {
    analytics = AnalyticsService();
    await analytics.initialize();
  });
  
  test('Should log event', () async {
    await analytics.logEvent('test_event', properties: {
      'key': 'value',
    });
    
    // Vérifier que l'événement est dans la queue
    expect(analytics.queueSize, greaterThan(0));
  });
  
  test('Should track performance', () async {
    await analytics.logPerformance('test_operation', 150);
    // Assertions...
  });
}
```

---

## 🚀 Déploiement

### 1. Build Backend

```bash
cd backend/mobile-analytics-service
docker build -t mobile-analytics-service .
```

### 2. Démarrer services

```bash
cd backend
docker-compose up -d mobile-analytics-service
```

### 3. Vérifier santé

```bash
curl http://localhost:3010/health
```

### 4. Build mobile

```bash
cd mobile
flutter build apk --release
# ou
flutter build ios --release
```

---

## 📝 Checklist d'Intégration

- [ ] Backend service créé et déployé
- [ ] Base de données initialisée
- [ ] Endpoints API testés
- [ ] SDK Flutter intégré
- [ ] Tous les modules instrumentés
- [ ] Navigation tracking activé
- [ ] API calls tracking activé
- [ ] Error handlers configurés
- [ ] Tests passent
- [ ] Dashboard frontend créé
- [ ] Documentation à jour
- [ ] Politique de confidentialité mise à jour

---

[← Retour Analytics](README.md) | [📋 STATUS](../../../STATUS.md)

