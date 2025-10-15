# 🚨 Guide de Déploiement - Système de Détection d'Intrusion

## Vue d'ensemble

Ce guide explique comment déployer et utiliser le système de détection d'intrusion temps réel de JobbingTrack qui remplace les valeurs statiques par des données authentiques basées sur l'activité réelle.

## 🔧 Configuration Requise

### Prérequis
- Node.js 18+
- Redis (avec mot de passe configuré)
- Docker et Docker Compose
- iptables (pour le firewall)

### Variables d'environnement
```bash
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=votre-mot-de-passe-redis

# Sécurité API Gateway
WAF_ENABLED=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60
ADMIN_WHITELIST_IPS=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16
```

## 📦 Déploiement

### 1. Configuration des middlewares de sécurité

Les middlewares sont automatiquement intégrés dans `server.js` dans l'ordre suivant :

```javascript
// 1. Détection d'intrusion (analyse toutes les requêtes)
app.use(intrusionDetection);

// 2. WAF (Web Application Firewall)
app.use(wafCheck);

// 3. Rate limiting général
app.use(rateLimit({...}));
```

### 2. Démarrage des services

```bash
# Démarrer l'infrastructure complète
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack
docker-compose up -d

# Vérifier que tous les services sont démarrés
docker-compose ps
```

### 3. Configuration du firewall

```bash
# Appliquer les règles de firewall sécurisées
sudo chmod +x scripts/security/firewall-setup.sh
sudo scripts/security/firewall-setup.sh
```

### 4. Configuration du monitoring de sécurité

```bash
# Configurer Prometheus, Grafana et les alertes
sudo chmod +x scripts/security/security-monitoring-setup.sh
sudo scripts/security/security-monitoring-setup.sh
```

## 🛡️ Fonctionnalités du Système

### Détection d'Intrusion Temps Réel

#### Patterns Détectés
- **Énumération d'utilisateurs** : Tentatives de connexion avec admin/root/test
- **Force brute** : Multiples tentatives de connexion depuis la même IP
- **Injection SQL/XSS** : Requêtes malformées avec caractères suspects
- **Path Traversal** : Tentatives d'accès à des fichiers système
- **Scans de vulnérabilités** : Outils comme sqlmap, nmap, etc.
- **Accès non autorisé** : Tentatives d'accès aux endpoints admin/sensibles
- **Attaques DoS** : Requêtes volumineuses ou avec patterns répétés

#### Actions Automatiques
- **Sévérité CRITIQUE** : Blocage IP immédiat (1h) + réponse 403
- **Sévérité ÉLEVÉE** : Headers d'avertissement + logging
- **Sévérité MOYENNE** : Logging uniquement
- **Sévérité FAIBLE** : Pas d'action (monitoring seulement)

### Métriques Temps Réel

#### Stockage Redis
```javascript
// Exemples de clés Redis générées
intrusion:brute_force:daily:2024-01-15     // Compteur quotidien
intrusion:critical:daily:2024-01-15       // Par sévérité
intrusion:ip:192.168.1.100                // Par IP (TTL 24h)
intrusion:details:1705323456789:192.168.1.100  // Détails (TTL 7j)
```

#### Métriques Prometheus
```prometheus
# Métriques disponibles
security_attacks_total{attack_type="SQL_INJECTION",severity="critical"}
intrusion_attempts_total{method="brute_force",endpoint="/api/v1/auth/login"}
waf_blocks_total{rule_name="SQL_INJECTION",severity="high"}
active_connections_current{protocol="http",endpoint="api_gateway"}
blocked_ips_current
security_score_current
```

## 🧪 Tests et Validation

### Script de Test Complet

```bash
# Lancer tous les tests de détection d'intrusion
chmod +x scripts/security/test-intrusion-detection.sh
./scripts/security/test-intrusion-detection.sh
```

**Tests inclus :**
- Énumération d'utilisateurs
- Attaque par force brute
- Injection SQL/XSS
- Path Traversal
- Scans de vulnérabilités
- Headers suspects
- Attaques DoS

### Vérification Manuelle

```bash
# 1. Vérifier les logs de sécurité
journalctl -u jobbingtrack-api-gateway -f | grep -E "(INTRUSION|WAF|Rate limit)"

# 2. Consulter les statistiques temps réel
curl http://localhost:3000/api/v1/admin/security/metrics

# 3. Voir les métriques Prometheus
curl http://localhost:9090/api/v1/query?query=intrusion_attempts_total

# 4. Dashboard Grafana
# http://localhost:3001 (admin/jobbingtrack-grafana-2025)
```

## 📊 Monitoring et Alertes

### Dashboards Disponibles

#### 1. Sécurité - Vue d'ensemble
- Taux d'attaques (5min)
- Tentatives d'intrusion (1h)
- Échecs d'authentification
- Hits de rate limiting

#### 2. Performances système
- Utilisation CPU/Mémoire
- Connexions actives
- Score de sécurité dynamique

#### 3. Disponibilité des services
- Status des services backend
- Temps de réponse moyens
- Erreurs par service

### Alertes Configurées

#### Niveau CRITIQUE
- Taux d'attaques > 10/sec pendant 2min
- Service indisponible pendant 1min

#### Niveau HAUT
- Tentatives d'intrusion > 50 en 10min
- Activité réseau suspecte > 50/sec

#### Niveau WARNING
- Échecs d'authentification > 20/sec
- Rate limiting > 100 hits/sec
- CPU > 80% pendant 5min

## 🔧 Maintenance

### Nettoyage des Données

```bash
# Nettoyer les données d'intrusion anciennes (>7 jours)
redis-cli DEL $(redis-cli KEYS "intrusion:details:*")

# Nettoyer les compteurs IP (>24h)
redis-cli DEL $(redis-cli KEYS "intrusion:ip:*")
```

### Sauvegarde des Métriques

```bash
# Exporter les métriques Prometheus
curl http://localhost:9090/api/v1/admin/tsdb/snapshot > /backup/prometheus-snapshot.json

# Sauvegarder les données Grafana
docker run --volumes-from jobbingtrack_grafana_1 -v $(pwd):/backup alpine tar czf /backup/grafana-backup.tar.gz /var/lib/grafana
```

### Mise à Jour

```bash
# Mettre à jour les règles de détection
# Modifier /backend/api-gateway/src/middleware/intrusionDetector.js

# Redémarrer les services
docker-compose restart api-gateway

# Tester les nouvelles règles
./scripts/security/test-intrusion-detection.sh
```

## 🚨 Réponse aux Incidents

### Procédure en cas d'Intrusion Détectée

1. **Vérification** : Consulter les détails dans les logs et Grafana
2. **Analyse** : Identifier le type d'attaque et l'IP source
3. **Isolation** : L'IP est automatiquement bloquée si nécessaire
4. **Investigation** : Analyser les détails stockés dans Redis
5. **Réponse** : Ajuster les règles si nécessaire
6. **Documentation** : Enregistrer l'incident

### Escalade

- **Intrusions critiques** : Blocage IP automatique + alerte immédiate
- **Attaques coordonnées** : Analyse des patterns et ajustement des règles
- **Faux positifs** : Ajustement des seuils de confiance

## 📋 Métriques Clés à Surveiller

| Métrique | Seuil d'alerte | Action |
|----------|----------------|---------|
| `intrusion_attempts_total` | >50/10min | Investigation |
| `waf_blocks_total` | >100/10min | Revue des règles |
| `rate_limit_hits_total` | >100/sec | Ajustement limites |
| `security_score_current` | <70 | Revue sécurité |
| `blocked_ips_current` | >10 | Investigation réseau |

## 🔗 Intégrations

### Avec le système existant
- ✅ Compatible avec tous les services backend existants
- ✅ Utilise Redis déjà configuré
- ✅ Intégré avec le système de logging existant
- ✅ Compatible avec Docker Compose existant

### Avec les outils externes
- **Slack/Discord** : Webhooks pour alertes critiques
- **Email** : Notifications pour incidents majeurs
- **SIEM** : Export des logs vers outils d'analyse externes
- **Forensic** : Conservation des détails d'attaque pour analyse

---

## 🎯 Résumé

Le système de détection d'intrusion de JobbingTrack offre :

✅ **Détection temps réel** de 6+ types d'attaques différents
✅ **Réponse automatique** avec blocage IP et alertes
✅ **Métriques précises** basées sur l'activité réelle
✅ **Monitoring complet** via Prometheus/Grafana
✅ **Intégration transparente** avec l'infrastructure existante

Les données statiques ont été remplacées par un système intelligent qui capture et analyse réellement les tentatives d'intrusion, fournissant ainsi des métriques authentiques et actionnables pour la sécurité de votre plateforme.
