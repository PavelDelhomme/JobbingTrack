# 📊 Documentation Monitoring JobbingTrack

## 🎯 Vue d'Ensemble

Système de monitoring complet pour JobbingTrack incluant:
- **Stack Monitoring** : Prometheus, Grafana, Loki, cAdvisor
- **Metrics Aggregator** : Service Node.js de collecte de métriques
- **Script Shell** : Analyse complète du système
- **Dashboard Frontend** : Analytics & Monitoring en temps réel

## 📚 Documentation Disponible

### Guides Utilisateur

1. **[README-MONITORING.md](./README-MONITORING.md)** ⭐ **START HERE**
   - Démarrage rapide
   - Checklist quotidienne
   - Commandes essentielles
   - Changelog des améliorations

2. **[QUICK-START-MONITORING.md](./QUICK-START-MONITORING.md)**
   - Comprendre les métriques (2 min)
   - Comment lire les résultats
   - Explication CPU, Load Average, Uptime
   - Tableau de comparaison Hôte vs Conteneurs

3. **[MONITORING-GUIDE.md](./MONITORING-GUIDE.md)**
   - Documentation complète (20 min)
   - Toutes les métriques expliquées
   - Troubleshooting détaillé
   - Guide de maintenance

4. **[MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md)**
   - Changements récents
   - Migration des commandes
   - Structure des fichiers
   - Prochaines étapes

## 🚀 Démarrage Rapide

```bash
# 1. Démarrer la stack monitoring
make monitoring-up

# 2. Lancer une analyse complète
make monitoring-stats

# 3. Sauvegarder un rapport
make monitoring-stats-save
```

## 📁 Structure des Fichiers

```
JobbingTrack/
├── docs/monitoring/              # 📖 Documentation
│   ├── INDEX.md                  # Ce fichier
│   ├── README-MONITORING.md      # Point d'entrée principal
│   ├── QUICK-START-MONITORING.md
│   ├── MONITORING-GUIDE.md
│   └── MIGRATION-GUIDE.md
│
├── scripts/monitoring/           # 🔧 Scripts
│   ├── monitoring.sh             # Script principal d'analyse
│   ├── clean-monitoring.sh
│   ├── start-metrics.sh
│   └── test-metrics.sh
│
├── data/monitoring/              # 💾 Données locales (gitignored)
│   ├── logs/                     # Logs de monitoring
│   ├── metrics/                  # Métriques collectées
│   └── history/                  # Historique des rapports
│
├── backend/metrics-aggregator-service/  # 🎯 Service d'agrégation
│   └── src/
│       ├── routes/
│       │   ├── metrics.routes.js
│       │   ├── logs.routes.js
│       │   └── persistence.routes.js
│       └── services/
│           ├── metricsHistory.service.js
│           └── persistence.service.js
│
└── frontend/src/app/(admin)/backoffice/analytics/  # 🖥️ Dashboard
    └── page.tsx
```

## 🎯 Fonctionnalités

### ✅ Implémenté

- [x] Collecte métriques CPU, Mémoire, Réseau
- [x] Load Average et Uptime formatés
- [x] Comparaison Hôte vs Conteneurs
- [x] Tous les processus Docker avec % mémoire
- [x] Historique des métriques (base de données)
- [x] Dashboard Analytics & Monitoring
- [x] Logs par service
- [x] Système de persistance
- [x] Commandes Makefile intégrées
- [x] Structure de stockage data/monitoring

### 🟡 En Cours

- [ ] Popup modale pour les logs (temps réel)
- [ ] Section Historique avec graphiques
- [ ] WebSocket pour mise à jour live
- [ ] Filtrage et recherche dans les logs
- [ ] Alertes visuelles sur métriques

### 🔮 Prévu

- [ ] Export PDF des rapports
- [ ] Dashboard Grafana personnalisé
- [ ] Système d'alertes email/Slack
- [ ] Prédictions de charge (ML)
- [ ] Comparaison de périodes

## 📊 Commandes Makefile

### Stack Monitoring

```bash
make monitoring-up           # Démarrer Prometheus/Grafana/Loki
make monitoring-down         # Arrêter monitoring
make monitoring-restart      # Redémarrer
make monitoring-ps           # Status des services
make monitoring-logs         # Voir tous les logs
```

### Statistiques

```bash
make monitoring-stats        # Analyse complète (~90s)
make monitoring-stats-save   # Sauvegarder dans data/monitoring/history
make monitoring-stats-watch  # Surveillance continue (60s)
```

### Tests

```bash
make monitoring-test         # Test health endpoints
make test-monitoring         # Suite de tests complète
```

## 🌐 URLs d'Accès

| Service | URL | Credentials |
|---------|-----|-------------|
| Prometheus | http://localhost:9090 | - |
| Grafana | http://localhost:3013 | admin/admin123 |
| cAdvisor | http://localhost:8082 | - |
| Loki | http://localhost:3100 | - |
| Metrics Aggregator | http://localhost:8014 | JWT required |
| Dashboard Frontend | http://localhost:3004/admin/backoffice/analytics | Login required |

## 🔧 Configuration

### Variables d'Environnement

```env
# Metrics Aggregator
METRICS_PORT=8014
PROMETHEUS_URL=http://prometheus:9090
LOKI_URL=http://loki:3100

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_METRICS_URL=http://localhost:8014
```

### Installation Prérequis

```bash
# System (pour I/O disque)
sudo pacman -S sysstat  # Arch/Manjaro
sudo apt install sysstat  # Ubuntu/Debian

# Activer sysstat
sudo systemctl enable sysstat
sudo systemctl start sysstat
```

## 🆘 Dépannage

### Script monitoring.sh ne fonctionne pas

```bash
# Vérifier les permissions
chmod +x scripts/monitoring/monitoring.sh

# Vérifier que le service est démarré
docker ps | grep metrics-aggregator

# Vérifier les logs
docker logs jobbingtrack-metrics-aggregator
```

### Métriques disque affichent "null"

Le script utilise un fallback automatique avec `df` si l'API retourne null.

### Services "degraded"

C'est normal ! `degraded` = temps de réponse 50-100ms (lent mais OK, pas critique).

### CPU > 100%

C'est normal ! Docker calcule par cœur (100% = 1 cœur). Sur 16 cœurs, max = 1600%.

## 📖 Lectures Recommandées

1. **Débutant** : README-MONITORING.md (5 min)
2. **Utilisation** : QUICK-START-MONITORING.md (2 min)
3. **Approfondissement** : MONITORING-GUIDE.md (20 min)
4. **Migration** : MIGRATION-GUIDE.md (10 min)

## 🤝 Contribution

Pour contribuer au système de monitoring:

1. Tester vos changements localement
2. Mettre à jour la documentation
3. Ajouter des tests si nécessaire
4. Créer une PR avec description détaillée

## 📝 Changelog

Voir `README-MONITORING.md` section "Changelog v3.2" pour les dernières modifications.

---

**Version:** 1.0  
**Date:** 2025-11-03  
**Auteur:** JobbingTrack Team  
**Status:** ✅ Production Ready (améliorations continues)

