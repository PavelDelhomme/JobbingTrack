# 🚀 Quick Start - Monitoring JobbingTrack

## ⚡ Commandes Essentielles

### 1️⃣ Test Rapide (20 secondes)
```bash
make mon-quick
```

### 2️⃣ Analyse Complète (60 secondes)
```bash
make mon
```

### 3️⃣ Sauvegarder les Stats
```bash
make mon-save
```

### 4️⃣ Surveillance Continue
```bash
make mon-watch
# Ctrl+C pour arrêter
```

---

## 📊 Tableau de Bord

| Commande | Action | Durée |
|----------|--------|-------|
| `make mon` | Monitoring complet | ~60s |
| `make mon-quick` | Test rapide | ~20s |
| `make mon-save` | Sauvegarder | ~60s |
| `make mon-watch` | Surveillance | ∞ |
| `make mon-history` | Liste logs | <1s |
| `make mon-last` | Dernier log | <1s |
| `make mon-clean` | Nettoyer | <1s |

---

## 🌐 URLs du Système

Après `make monitoring-up` :

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:8080 |
| **API** | http://localhost:3000 |
| **Metrics** | http://localhost:8014 |
| **Prometheus** | http://localhost:9090 |
| **Grafana** | http://localhost:3013 |
| **cAdvisor** | http://localhost:8082 |

---

## 💡 Premier Démarrage

```bash
# 1. Démarrer tout
make monitoring-full

# 2. Attendre 30 secondes
sleep 30

# 3. Tester
make mon-quick

# 4. Ouvrir Prometheus
make metrics
```

---

## 📚 Documentation Complète

- **[MONITORING_COMMANDS.md](MONITORING_COMMANDS.md)** - Toutes les commandes
- **[scripts/monitoring/README.md](scripts/monitoring/README.md)** - Guide du script
- **[INTEGRATION_MONITORING_RESUME.md](INTEGRATION_MONITORING_RESUME.md)** - Résumé intégration

---

## 🆘 Aide Rapide

```bash
make help-utils      # Aide utilitaires & monitoring
make help-backend    # Aide backend
make help            # Aide générale
```

---

**🎯 Commencez par :** `make mon-quick`
