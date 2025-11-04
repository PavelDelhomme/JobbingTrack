# 📊 Guide de Migration - Système de Monitoring

## ✅ Modifications Appliquées

### 1. **Réorganisation des Fichiers**

```
AVANT:
./monitoring.sh
./README-MONITORING.md
./MONITORING-GUIDE.md
./QUICK-START-MONITORING.md

APRÈS:
./scripts/monitoring/monitoring.sh
./docs/monitoring/README-MONITORING.md
./docs/monitoring/MONITORING-GUIDE.md
./docs/monitoring/QUICK-START-MONITORING.md
```

### 2. **Nouveau Système de Stockage**

Création de la structure de données :
```
data/monitoring/
├── logs/          # Logs de monitoring
├── metrics/       # Métriques collectées
└── history/       # Historique des rapports
```

### 3. **Nouvelles Commandes Makefile**

```bash
# Lancer le monitoring complet
make monitoring-stats

# Sauvegarder un rapport
make monitoring-stats-save

# Surveillance continue (toutes les 60s)
make monitoring-stats-watch
```

## 🎯 Prochaines Étapes (À Implémenter)

### 1. **Popup Modale pour les Logs** (Priorité Haute)

**Objectif :** Remplacer l'affichage inline des logs par une modale popup temps réel

**Fichiers à modifier :**
- `frontend/src/app/(admin)/backoffice/analytics/page.tsx`
- Créer `frontend/src/components/modals/LogsModal.tsx`

**Fonctionnalités :**
- ✅ Ouverture popup au clic sur "Voir logs"
- ✅ Mise à jour temps réel (WebSocket)
- ✅ Filtrage par niveau (info/warn/error)
- ✅ Recherche dans les logs
- ✅ Export des logs

### 2. **Section Historique avec Graphiques** (Priorité Haute)

**Objectif :** Ajouter des graphiques temps réel dans Analytics & Monitoring

**Fichiers à créer :**
- `frontend/src/components/charts/MetricsHistoryChart.tsx`
- `frontend/src/components/charts/ServicePerformanceChart.tsx`

**Bibliothèques recommandées :**
```bash
npm install recharts  # ou chart.js, ou apex-charts
```

**Fonctionnalités :**
- ✅ Graphiques CPU par service (temps réel)
- ✅ Graphiques mémoire par service
- ✅ Graphiques réseau (RX/TX)
- ✅ Graphiques temps de réponse
- ✅ Mise à jour automatique (polling 10s)
- ✅ Zoom et export d'image

### 3. **Amélioration Temps de Réponse** (Priorité Moyenne)

**Fichiers à vérifier :**
- `backend/metrics-aggregator-service/src/collectors/metricsCollector.js`
- `frontend/src/app/(admin)/backoffice/analytics/page.tsx`

**Points à vérifier :**
```typescript
// S'assurer que responseTimeMs est bien récupéré pour chaque service
service.responseTimeMs ?? null
```

### 4. **Amélioration de la Synthèse** (Priorité Moyenne)

**Dans :** `frontend/src/app/(admin)/backoffice/analytics/page.tsx`

**Ajouter :**
- Tendances (↗️ ↘️ →) pour chaque métrique
- Alertes visuelles si métriques hors limites
- Comparaison avec période précédente
- Score de santé global (0-100)

### 5. **Système de Collecte Automatique** (Priorité Basse)

**Créer :** `scripts/monitoring/collect-metrics.sh`

```bash
#!/bin/bash
# Collecte automatique toutes les 5 minutes
while true; do
    make monitoring-stats-save
    sleep 300
done
```

**Lancer avec systemd ou cron :**
```bash
# Crontab
*/5 * * * * cd /path/to/JobbingTrack && make monitoring-stats-save
```

## 📁 Structure Complète

```
JobbingTrack/
├── data/
│   └── monitoring/
│       ├── logs/           # Logs bruts
│       ├── metrics/        # Métriques JSON
│       └── history/        # Rapports .log
├── docs/
│   └── monitoring/
│       ├── README-MONITORING.md
│       ├── MONITORING-GUIDE.md
│       ├── QUICK-START-MONITORING.md
│       └── MIGRATION-GUIDE.md (ce fichier)
├── scripts/
│   └── monitoring/
│       ├── monitoring.sh            # Script principal
│       ├── clean-monitoring.sh
│       ├── start-metrics.sh
│       └── test-metrics.sh
├── backend/
│   └── metrics-aggregator-service/
│       └── src/
│           ├── routes/
│           │   ├── metrics.routes.js
│           │   ├── logs.routes.js
│           │   └── persistence.routes.js
│           └── services/
│               ├── metricsHistory.service.js
│               └── persistence.service.js
└── frontend/
    └── src/
        └── app/(admin)/backoffice/analytics/
            └── page.tsx
```

## 🔄 Migration des Commandes

| Ancienne commande | Nouvelle commande |
|-------------------|-------------------|
| `./monitoring.sh` | `make monitoring-stats` |
| `./monitoring.sh > rapport.log` | `make monitoring-stats-save` |
| N/A | `make monitoring-stats-watch` |

## 📖 Documentation

- **Quick Start** : `docs/monitoring/QUICK-START-MONITORING.md`
- **Guide Complet** : `docs/monitoring/MONITORING-GUIDE.md`
- **README** : `docs/monitoring/README-MONITORING.md`

## 🚀 Commandes Utiles

```bash
# Démarrer stack + monitoring
make monitoring-up

# Collecter les stats
make monitoring-stats

# Sauvegarder un rapport
make monitoring-stats-save

# Surveiller en continu
make monitoring-stats-watch

# Voir l'aide complète
make help-backend
```

## ⚠️ Notes Importantes

1. **Gitignore** : `data/monitoring/` est ignoré (données locales)
2. **Permissions** : Le script nécessite Docker et sysstat
3. **API** : Le metrics-aggregator doit être démarré
4. **Frontend** : Les graphiques nécessitent des bibliothèques supplémentaires

## 📝 TODO Liste Développement

- [ ] Créer composant LogsModal.tsx
- [ ] Implémenter WebSocket pour logs temps réel
- [ ] Ajouter bibliothèque de graphiques (recharts)
- [ ] Créer composants MetricsHistoryChart
- [ ] Ajouter filtres et recherche dans logs
- [ ] Implémenter système d'alertes
- [ ] Ajouter export PDF des rapports
- [ ] Créer dashboard Grafana personnalisé
- [ ] Documenter API endpoints de persistence
- [ ] Tests E2E du système de monitoring

---

**Version:** 1.0  
**Date:** 2025-11-03  
**Status:** 🟡 En cours (Base fonctionnelle, améliorations à venir)

