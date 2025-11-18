# 🔐 Confidentialité et Conformité RGPD - Analytics Mobile

[← Retour Analytics](README.md) | [📋 STATUS](../../../STATUS.md)

---

## 📑 Table des Matières

- [Principes de Base](#-principes-de-base)
- [Données Collectées](#-données-collectées)
- [Consentement Utilisateur](#-consentement-utilisateur)
- [Anonymisation](#-anonymisation)
- [Rétention des Données](#-rétention-des-données)
- [Droits des Utilisateurs](#-droits-des-utilisateurs)
- [Sécurité](#-sécurité)
- [Conformité RGPD](#-conformité-rgpd)
- [Implémentation Technique](#-implémentation-technique)

---

## 🎯 Principes de Base

### Transparence
- **Informer clairement** les utilisateurs sur les données collectées
- **Expliquer les finalités** de la collecte
- **Rendre accessible** la politique de confidentialité

### Minimisation
- **Collecter uniquement** les données nécessaires
- **Pas de données sensibles** (religion, santé, opinions politiques, etc.)
- **Anonymiser** autant que possible

### Sécurité
- **Chiffrement** des données en transit (HTTPS)
- **Chiffrement** des données au repos
- **Contrôle d'accès** strict au dashboard

### Consentement
- **Opt-in explicite** pour l'analytics
- **Possibilité de refuser** sans impacter les fonctionnalités de base
- **Révocable à tout moment**

---

## 📊 Données Collectées

### ✅ Données Collectées

#### Données Techniques
```javascript
{
  // Appareil (anonymisé)
  "deviceId": "hash-anonyme",        // Hash de l'ID appareil
  "deviceModel": "Samsung Galaxy S21",
  "platform": "android",
  "osVersion": "Android 13",
  
  // Application
  "appVersion": "1.0.0",
  "networkType": "wifi",
  
  // Performance
  "loadTime": 1200,                  // millisecondes
  "memoryUsage": 145.5,              // MB
  "batteryLevel": 85,                // %
  
  // Utilisation
  "screenName": "applications_screen",
  "eventName": "application_created",
  "timestamp": "2025-11-04T10:30:00Z"
}
```

#### Données d'Utilisation
- Écrans visités
- Actions effectuées (création, édition, suppression)
- Durée des sessions
- Parcours de navigation

#### Données de Performance
- Temps de chargement des écrans
- Latence des appels API
- Crashes et erreurs

### ❌ Données NON Collectées

**Nous ne collectons JAMAIS** :
- ❌ Nom complet de l'utilisateur
- ❌ Adresse email complète
- ❌ Numéro de téléphone
- ❌ Adresse physique
- ❌ Données de candidatures (contenu)
- ❌ Données des CV
- ❌ Informations bancaires
- ❌ Mots de passe
- ❌ Photos ou fichiers
- ❌ Contacts personnels
- ❌ Géolocalisation précise
- ❌ Données biométriques

---

## ✋ Consentement Utilisateur

### Implémentation du Consentement

#### 1. Premier Lancement

**Écran de Bienvenue avec Opt-in**

```dart
// mobile/lib/screens/analytics_consent_screen.dart

class AnalyticsConsentScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Padding(
        padding: EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.analytics, size: 64, color: Colors.blue),
            SizedBox(height: 24),
            Text(
              'Améliorer votre expérience',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 16),
            Text(
              'Nous collectons des données anonymes d\'utilisation pour améliorer l\'application.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16),
            ),
            SizedBox(height: 24),
            
            // Liste des bénéfices
            _ConsentItem(
              icon: Icons.bug_report,
              title: 'Détection de bugs',
              description: 'Identifier et corriger rapidement les problèmes',
            ),
            _ConsentItem(
              icon: Icons.speed,
              title: 'Amélioration des performances',
              description: 'Optimiser la vitesse et la réactivité',
            ),
            _ConsentItem(
              icon: Icons.lightbulb,
              title: 'Nouvelles fonctionnalités',
              description: 'Développer les fonctions les plus utiles',
            ),
            
            SizedBox(height: 32),
            
            // Boutons d'action
            ElevatedButton(
              onPressed: () => _acceptAnalytics(context),
              child: Text('Accepter et continuer'),
            ),
            SizedBox(height: 8),
            TextButton(
              onPressed: () => _refuseAnalytics(context),
              child: Text('Non merci'),
            ),
            
            SizedBox(height: 16),
            TextButton(
              onPressed: () => _showPrivacyPolicy(context),
              child: Text(
                'En savoir plus sur nos pratiques',
                style: TextStyle(decoration: TextDecoration.underline),
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  void _acceptAnalytics(BuildContext context) async {
    await SharedPreferences.getInstance().then((prefs) {
      prefs.setBool('analytics_consent', true);
    });
    AnalyticsService().setEnabled(true);
    await AnalyticsService().initialize();
    Navigator.of(context).pushReplacementNamed('/home');
  }
  
  void _refuseAnalytics(BuildContext context) async {
    await SharedPreferences.getInstance().then((prefs) {
      prefs.setBool('analytics_consent', false);
    });
    AnalyticsService().setEnabled(false);
    Navigator.of(context).pushReplacementNamed('/home');
  }
  
  void _showPrivacyPolicy(BuildContext context) {
    // Afficher politique de confidentialité
  }
}

class _ConsentItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;
  
  const _ConsentItem({
    required this.icon,
    required this.title,
    required this.description,
  });
  
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, color: Colors.blue),
          SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontWeight: FontWeight.bold)),
                Text(description, style: TextStyle(fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
```

#### 2. Paramètres de l'Application

**Toggle dans Paramètres**

```dart
// mobile/lib/screens/settings_screen.dart

class SettingsScreen extends StatefulWidget {
  @override
  _SettingsScreenState createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _analyticsEnabled = true;
  
  @override
  void initState() {
    super.initState();
    _loadAnalyticsPreference();
  }
  
  Future<void> _loadAnalyticsPreference() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _analyticsEnabled = prefs.getBool('analytics_consent') ?? false;
    });
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Paramètres')),
      body: ListView(
        children: [
          SwitchListTile(
            title: Text('Données d\'utilisation'),
            subtitle: Text(
              'Partager des données anonymes pour améliorer l\'application'
            ),
            value: _analyticsEnabled,
            onChanged: (value) async {
              setState(() => _analyticsEnabled = value);
              
              final prefs = await SharedPreferences.getInstance();
              await prefs.setBool('analytics_consent', value);
              
              AnalyticsService().setEnabled(value);
              
              if (value) {
                await AnalyticsService().initialize();
              } else {
                AnalyticsService().dispose();
              }
              
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    value
                        ? 'Collecte de données activée'
                        : 'Collecte de données désactivée'
                  ),
                ),
              );
            },
          ),
          ListTile(
            title: Text('Politique de confidentialité'),
            trailing: Icon(Icons.arrow_forward_ios),
            onTap: () => _showPrivacyPolicy(),
          ),
          ListTile(
            title: Text('Supprimer mes données'),
            trailing: Icon(Icons.delete_outline),
            onTap: () => _requestDataDeletion(),
          ),
        ],
      ),
    );
  }
  
  void _showPrivacyPolicy() {
    // Afficher politique complète
  }
  
  void _requestDataDeletion() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Supprimer mes données'),
        content: Text(
          'Êtes-vous sûr de vouloir supprimer toutes vos données d\'utilisation ? '
          'Cette action est irréversible.'
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text('Supprimer'),
          ),
        ],
      ),
    );
    
    if (confirm == true) {
      // Appeler API de suppression
      await ApiService().delete('/mobile/user-data');
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Vos données ont été supprimées')),
      );
    }
  }
}
```

---

## 🔒 Anonymisation

### Techniques d'Anonymisation

#### 1. Hash des Identifiants

```dart
// mobile/lib/services/analytics/anonymizer.dart

import 'package:crypto/crypto.dart';
import 'dart:convert';

class Anonymizer {
  /// Hasher l'ID utilisateur
  static String hashUserId(String userId) {
    final bytes = utf8.encode(userId + 'salt-secret-key');
    return sha256.convert(bytes).toString().substring(0, 16);
  }
  
  /// Hasher l'ID appareil
  static String hashDeviceId(String deviceId) {
    final bytes = utf8.encode(deviceId + 'device-salt');
    return sha256.convert(bytes).toString().substring(0, 16);
  }
  
  /// Anonymiser email (garder domaine uniquement)
  static String anonymizeEmail(String email) {
    final parts = email.split('@');
    if (parts.length != 2) return 'unknown@unknown.com';
    return '***@${parts[1]}';
  }
  
  /// Nettoyer stacktrace des données sensibles
  static String sanitizeStackTrace(String stackTrace) {
    return stackTrace
      .replaceAll(RegExp(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'), '***@***.***')
      .replaceAll(RegExp(r'\b\d{10,}\b'), '**********')
      .replaceAll(RegExp(r'/Users/[^/]+/'), '/Users/***/');
  }
}
```

#### 2. Utilisation dans le SDK

```dart
// mobile/lib/services/analytics/analytics_service.dart

Map<String, dynamic> _getDeviceInfo() async {
  return {
    'deviceId': Anonymizer.hashDeviceId(_deviceId ?? 'unknown'),
    'userId': _userId != null ? Anonymizer.hashUserId(_userId!) : null,
    'appVersion': _appVersion,
    'platform': _platform,
    'osVersion': _osVersion,
    'deviceModel': _deviceModel,
    'networkType': await _getNetworkType(),
  };
}

Future<void> reportCrash(dynamic error, StackTrace stackTrace) async {
  final sanitizedStack = Anonymizer.sanitizeStackTrace(stackTrace.toString());
  
  await _api.post('/mobile/crashes', {
    'message': error.toString(),
    'stackTrace': sanitizedStack,
    // ...
  });
}
```

---

## ⏰ Rétention des Données

### Durées de Conservation

```javascript
// backend/mobile-analytics-service/src/services/retentionService.js

const RETENTION_POLICIES = {
  events: 90,        // 90 jours
  crashes: 180,      // 180 jours
  performance: 90,   // 90 jours
  sessions: 30,      // 30 jours
  aggregates: 365,   // 1 an
};

class RetentionService {
  // Exécuter quotidiennement via cron
  async cleanupOldData() {
    const now = new Date();
    
    // Supprimer événements > 90 jours
    await prisma.mobileEvent.deleteMany({
      where: {
        timestamp: {
          lt: new Date(now.getTime() - RETENTION_POLICIES.events * 24 * 60 * 60 * 1000)
        }
      }
    });
    
    // Supprimer crashes résolus > 180 jours
    await prisma.mobileCrash.deleteMany({
      where: {
        resolved: true,
        resolvedAt: {
          lt: new Date(now.getTime() - RETENTION_POLICIES.crashes * 24 * 60 * 60 * 1000)
        }
      }
    });
    
    // Supprimer sessions > 30 jours
    await prisma.mobileSession.deleteMany({
      where: {
        startTime: {
          lt: new Date(now.getTime() - RETENTION_POLICIES.sessions * 24 * 60 * 60 * 1000)
        }
      }
    });
    
    console.log('[RetentionService] Cleanup completed');
  }
}

module.exports = new RetentionService();
```

### Cron Job

```javascript
// backend/mobile-analytics-service/src/server.js

const cron = require('node-cron');
const retentionService = require('./services/retentionService');

// Exécuter chaque jour à 2h du matin
cron.schedule('0 2 * * *', async () => {
  console.log('[Cron] Running data retention cleanup...');
  await retentionService.cleanupOldData();
});
```

---

## 👤 Droits des Utilisateurs

### Implémentation des Droits RGPD

#### 1. Droit d'Accès

**Endpoint** : `GET /api/v1/mobile/user-data`

```javascript
// backend/mobile-analytics-service/src/controllers/privacy.controller.js

exports.getUserData = async (req, res) => {
  const userId = req.userId;
  
  try {
    // Récupérer toutes les données de l'utilisateur
    const [events, crashes, sessions, performance] = await Promise.all([
      prisma.mobileEvent.findMany({ where: { userId } }),
      prisma.mobileCrash.findMany({ where: { userId } }),
      prisma.mobileSession.findMany({ where: { userId } }),
      prisma.mobilePerformance.findMany({ where: { userId } }),
    ]);
    
    res.json({
      events,
      crashes,
      sessions,
      performance,
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error retrieving user data:', error);
    res.status(500).json({ error: 'Failed to retrieve data' });
  }
};
```

#### 2. Droit à l'Effacement

**Endpoint** : `DELETE /api/v1/mobile/user-data`

```javascript
exports.deleteUserData = async (req, res) => {
  const userId = req.userId;
  
  try {
    // Supprimer toutes les données
    await Promise.all([
      prisma.mobileEvent.deleteMany({ where: { userId } }),
      prisma.mobileCrash.deleteMany({ where: { userId } }),
      prisma.mobileSession.deleteMany({ where: { userId } }),
      prisma.mobilePerformance.deleteMany({ where: { userId } }),
    ]);
    
    console.log(`[Privacy] Deleted all data for user ${userId}`);
    
    res.json({
      success: true,
      message: 'All user data deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user data:', error);
    res.status(500).json({ error: 'Failed to delete data' });
  }
};
```

#### 3. Droit de Rectification

**Endpoint** : `PUT /api/v1/mobile/user-data/preferences`

```javascript
exports.updatePreferences = async (req, res) => {
  const userId = req.userId;
  const { analyticsEnabled } = req.body;
  
  try {
    // Mettre à jour préférences utilisateur
    await prisma.userPreferences.upsert({
      where: { userId },
      update: { analyticsEnabled },
      create: { userId, analyticsEnabled },
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update preferences' });
  }
};
```

---

## 🔐 Sécurité

### Mesures de Sécurité

#### 1. Chiffrement en Transit (HTTPS)

```javascript
// backend/mobile-analytics-service/src/server.js

const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('ssl/private.key'),
  cert: fs.readFileSync('ssl/certificate.crt'),
};

https.createServer(options, app).listen(PORT);
```

#### 2. Chiffrement au Repos

```yaml
# PostgreSQL avec chiffrement
# docker-compose.yml

services:
  postgres:
    command: postgres -c ssl=on -c ssl_cert_file=/var/lib/postgresql/server.crt
```

#### 3. Contrôle d'Accès

```javascript
// backend/mobile-analytics-service/src/middlewares/auth.middleware.js

exports.requireAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.role = decoded.role;
    
    // Seuls les admins peuvent accéder au dashboard
    if (req.path.includes('/analytics') && req.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

---

## ✅ Conformité RGPD

### Checklist de Conformité

- [ ] **Base légale** : Consentement explicite obtenu
- [ ] **Transparence** : Politique de confidentialité claire et accessible
- [ ] **Minimisation** : Seules les données nécessaires sont collectées
- [ ] **Finalité** : Utilisation limitée à l'amélioration du service
- [ ] **Durée** : Rétention limitée et automatisée
- [ ] **Sécurité** : Chiffrement et contrôle d'accès
- [ ] **Droits** : Accès, rectification, effacement implémentés
- [ ] **Responsabilité** : Documentation et traçabilité
- [ ] **Transferts** : Données hébergées en UE (si applicable)
- [ ] **DPO** : Désignation d'un délégué à la protection des données (si nécessaire)

### Registre des Traitements

**Nom du traitement** : Analytics Mobile JobbingTrack  
**Finalité** : Amélioration de l'application mobile  
**Base légale** : Consentement (Art. 6.1.a RGPD)  
**Catégories de données** : Données techniques et d'utilisation  
**Destinataires** : Équipe technique interne  
**Durée de conservation** : 30 à 180 jours selon type  
**Mesures de sécurité** : Chiffrement, anonymisation, contrôle d'accès  

---

## 💻 Implémentation Technique

### Fichier de Configuration

```dart
// mobile/lib/config/privacy_config.dart

class PrivacyConfig {
  static const String privacyPolicyUrl = 'https://jobbingtrack.com/privacy';
  static const String termsUrl = 'https://jobbingtrack.com/terms';
  static const String supportEmail = 'support@jobbingtrack.com';
  
  static const Map<String, int> retentionDays = {
    'events': 90,
    'crashes': 180,
    'sessions': 30,
  };
  
  static const List<String> collectedData = [
    'Informations techniques de l\'appareil',
    'Données d\'utilisation de l\'application',
    'Métriques de performance',
    'Rapports d\'erreurs',
  ];
  
  static const List<String> notCollectedData = [
    'Données personnelles identifiables',
    'Contenu des candidatures',
    'Coordonnées de contacts',
    'Données sensibles (santé, religion, etc.)',
  ];
}
```

---

[← Retour Analytics](README.md) | [📋 STATUS](../../../STATUS.md)

