# 📊 Commandes Monitoring - JobbingTrack

Guide complet de toutes les commandes disponibles pour le monitoring du système.

## 🎯 Vue d'ensemble

Le système de monitoring JobbingTrack offre plusieurs niveaux d'accès :
- **Commandes rapides** (`make mon`, `make metrics`)
- **Scripts complets** (`monitoring.sh`)
- **Surveillance continue** (`make mon-watch`)
- **Sauvegarde automatique** (`make mon-save`)

---

## 📈 Commandes Scripts Monitoring

### 🔵 `make mon`
**Lancer le monitoring complet**
- Durée : ~60 secondes
- 13 tests de métriques
- 5 collectes temporelles
- Analyse complète du système

```bash
make mon
```

### ⚡ `make mon-quick`
**Test rapide sans collectes temporelles**
- Durée : ~20 secondes
- Tests 1-11 uniquement
- Idéal pour un check rapide

```bash
make mon-quick
```

### 💾 `make mon-save`
**Sauvegarder les statistiques**
- Sauvegarde dans `data/monitoring/history/`
- Nom du fichier : `stats-YYYYMMDD-HHMMSS.log`
- Utile pour l'historique et l'analyse

```bash
make mon-save
# Fichier créé: data/monitoring/history/stats-20251103-143045.log
```

### 👀 `make mon-watch`
**Surveillance continue**
- Actualisation toutes les 60 secondes
- Affichage en temps réel
- Ctrl+C pour arrêter

```bash
make mon-watch
```

### 📜 `make mon-history`
**Liste des logs sauvegardés**
- Affiche les 10 derniers logs
- Avec date et taille

```bash
make mon-history
```

### 📊 `make mon-last`
**Afficher le dernier log**
- Affiche le contenu complet
- Du log le plus récent

```bash
make mon-last
```

### 🧹 `make mon-clean`
**Nettoyer les anciens logs**
- Garde les 30 derniers
- Supprime les plus anciens

```bash
make mon-clean
```

---

## 🌍 Commandes Accès Rapide

### 📊 `make metrics`
**Ouvrir Prometheus**
- URL : http://localhost:9090
- Ouvre automatiquement dans le navigateur (Linux)

```bash
make metrics
```

### 🐳 `make cadvisor`
**Ouvrir cAdvisor**
- URL : http://localhost:8082
- Métriques conteneurs en temps réel

```bash
make cadvisor
```

### 📋 `make logs-metrics`
**Logs du service de métriques**
- Affichage en temps réel
- Service : metrics-aggregator

```bash
make logs-metrics
```

---

## 📊 Commandes Stack Monitoring

### 🚀 `make monitoring-up`
**Démarrer la stack monitoring**
- Démarre Prometheus, Grafana, Loki, cAdvisor
- Nettoyage automatique des conflits

```bash
make monitoring-up
```

Accès après démarrage :
- **Prometheus :** http://localhost:9090
- **Grafana :** http://localhost:3013 (admin/admin123)
- **cAdvisor :** http://localhost:8082
- **Loki :** http://localhost:3100
- **Metrics API :** http://localhost:8014

### 🛑 `make monitoring-down`
**Arrêter la stack monitoring**

```bash
make monitoring-down
```

### 🔄 `make monitoring-restart`
**Redémarrer la stack**

```bash
make monitoring-restart
```

### 📊 `make monitoring-ps`
**Status des services monitoring**

```bash
make monitoring-ps
```

### 📋 `make monitoring-logs`
**Logs de tous les services**

```bash
make monitoring-logs
```

### 📋 `make monitoring-logs-service`
**Logs d'un service spécifique**

```bash
make monitoring-logs-service SERVICE=prometheus
make monitoring-logs-service SERVICE=grafana
make monitoring-logs-service SERVICE=loki
```

---

## 🧪 Commandes Tests

### 🧪 `make monitoring-test`
**Test health des endpoints**
- Teste Prometheus, Loki, Grafana

```bash
make monitoring-test
```

### 🔐 `make monitoring-test-auth`
**Test avec authentification JWT**

```bash
make monitoring-test-auth TOKEN=votre_jwt_token
```

### 🧪 `make test-monitoring`
**Suite de tests complète**
- Vérification des conteneurs
- Test des endpoints
- Vérification des logs

```bash
make test-monitoring
```

---

## 🚀 Commandes Démarrage Complet

### 🎯 `make monitoring-full`
**Démarrer JobbingTrack + Monitoring**
- Démarre la stack principale
- Démarre le monitoring
- Tout proprement et dans l'ordre

```bash
make monitoring-full
```

### 🔨 `make metrics-rebuild`
**Rebuild metrics-aggregator**
- Reconstruit l'image
- Redémarre le service

```bash
make metrics-rebuild
```

### 🔧 `make fix-all`
**Fix complet (frontend + metrics)**

```bash
make fix-all
```

---

## 📖 Aide et Documentation

### 💡 `make help-utils`
**Aide des utilitaires**

```bash
make help-utils
```

### 🔧 `make help-backend`
**Aide backend**

```bash
make help-backend
```

### 📚 `make help`
**Aide générale**

```bash
make help
```

---

## 🎯 Scénarios d'Utilisation

### 🔍 Check Rapide du Système

```bash
# Option 1: Test rapide
make mon-quick

# Option 2: Juste les endpoints
make monitoring-test
```

### 📊 Analyse Complète

```bash
# Monitoring complet avec sauvegarde
make mon-save

# Voir le résultat
make mon-last
```

### 👀 Surveillance Continue

```bash
# Surveillance en temps réel
make mon-watch

# Dans un autre terminal, surveiller les logs
make logs-metrics
```

### 🚀 Démarrage Complet

```bash
# Tout démarrer proprement
make monitoring-full

# Attendre 30 secondes puis tester
sleep 30 && make mon-quick
```

### 🐛 Débogage

```bash
# Vérifier les services
make monitoring-ps

# Voir les logs
make monitoring-logs

# Logs d'un service spécifique
make monitoring-logs-service SERVICE=prometheus

# Test des endpoints
make monitoring-test
```

### 📈 Analyse Historique

```bash
# Sauvegarder les stats actuelles
make mon-save

# Voir l'historique
make mon-history

# Comparer avec le dernier log
make mon-last | grep "CPU moyen"

# Nettoyer les vieux logs
make mon-clean
```

---

## 🌐 URLs du Système

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:8080 | Interface principale |
| **API Gateway** | http://localhost:3000 | API principale |
| **Metrics Service** | http://localhost:8014 | Service de métriques |
| **Prometheus** | http://localhost:9090 | Métriques & Alertes |
| **Grafana** | http://localhost:3013 | Dashboards (admin/admin123) |
| **cAdvisor** | http://localhost:8082 | Métriques conteneurs |
| **Loki** | http://localhost:3100 | Logs centralisés |
| **Node Exporter** | http://localhost:9100 | Métriques système |

---

## 💡 Conseils et Bonnes Pratiques

### ✅ À Faire

1. **Lancer `make mon-save` régulièrement** pour garder un historique
2. **Utiliser `make mon-quick`** pour des checks rapides
3. **Surveiller avec `make mon-watch`** lors de tests de charge
4. **Sauvegarder avant déploiement** pour avoir une baseline
5. **Nettoyer régulièrement** avec `make mon-clean`

### ❌ À Éviter

1. **Ne pas lancer `make mon`** trop souvent (prend 60s)
2. **Ne pas oublier de nettoyer** les logs (peuvent occuper de l'espace)
3. **Ne pas redémarrer** le monitoring sans raison
4. **Ne pas ignorer** les warnings du script

### 🎯 Workflow Recommandé

#### Développement Quotidien
```bash
# Le matin
make monitoring-up
sleep 30
make mon-quick

# Si problème détecté
make mon > debug.log
```

#### Avant Déploiement
```bash
# Baseline
make mon-save

# Déployer...

# Vérifier après
sleep 60
make mon-save
make mon-last | grep "RÉSUMÉ"
```

#### Débogage
```bash
# État des services
make monitoring-ps
make status

# Logs détaillés
make monitoring-logs

# Monitoring complet
make mon | tee debug-$(date +%Y%m%d-%H%M%S).log
```

---

## 🔧 Configuration

### Variables d'Environnement

```bash
# URL du service de métriques (défaut: http://localhost:8014)
export METRICS_URL=http://localhost:8014

# URL de l'API Gateway (défaut: http://localhost:3000)
export API_URL=http://localhost:3000
```

### Personnalisation

Pour modifier le comportement :
1. Éditer `scripts/monitoring/monitoring.sh`
2. Modifier les Makefiles dans `makefiles/`
3. Ajuster les intervalles dans `docker-compose.yml`

---

## 📚 Documentation Additionnelle

- [Script Monitoring README](scripts/monitoring/README.md)
- [Documentation Monitoring](docs/monitoring/)
- [Guide Administration](docs/administration/README.md)
- [Architecture](docs/architecture/)

---

## 🆘 Support

En cas de problème :

1. **Vérifier les services**
   ```bash
   make monitoring-ps
   make status
   ```

2. **Consulter les logs**
   ```bash
   make monitoring-logs
   make logs-metrics
   ```

3. **Tester les endpoints**
   ```bash
   make monitoring-test
   ```

4. **Redémarrer si nécessaire**
   ```bash
   make monitoring-restart
   ```

5. **En dernier recours**
   ```bash
   make down
   make clean
   make monitoring-full
   ```

---

## 📝 Changelog

### Version 1.0 (2025-11-03)
- ✅ Ajout de toutes les commandes `make mon-*`
- ✅ Intégration du script `monitoring.sh`
- ✅ Commandes de sauvegarde et historique
- ✅ Surveillance continue
- ✅ Documentation complète

---

**💡 Astuce :** Utilisez `make help` pour voir toutes les commandes disponibles !

