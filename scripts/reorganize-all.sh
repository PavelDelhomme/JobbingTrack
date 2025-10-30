#!/bin/bash

# ============================================
# Script de Réorganisation Complète
# ============================================

set -e

echo "🔄 Réorganisation complète du projet..."
echo ""

cd "$(dirname "$0")/.."

# 1. Supprimer les dossiers obsolètes backend/init-db.sql
echo "1️⃣  Suppression des dossiers obsolètes..."
if [ -d "backend/init-db.sql" ]; then
    rm -rf "backend/init-db.sql"
    echo "  ✅ backend/init-db.sql/ supprimé"
fi

# 2. Créer les dossiers de documentation nécessaires
echo ""
echo "2️⃣  Création de la structure de documentation..."
mkdir -p "docs/getting-started"
mkdir -p "docs/development"
mkdir -p "docs/monitoring"
mkdir -p "docs/frontend"
echo "  ✅ Dossiers créés"

# 3. Déplacer GETTING_STARTED.md
echo ""
echo "3️⃣  Déplacement de la documentation..."
if [ -f "docs/GETTING_STARTED.md" ]; then
    mv "docs/GETTING_STARTED.md" "docs/getting-started/README.md"
    echo "  ✅ GETTING_STARTED.md → docs/getting-started/README.md"
fi

# 4. Déplacer COMMANDES_MAKEFILE.md (s'il n'est pas déjà déplacé)
if [ -f "docs/COMMANDES_MAKEFILE.md" ]; then
    mv "docs/COMMANDES_MAKEFILE.md" "docs/development/COMMANDES_MAKEFILE.md"
    echo "  ✅ COMMANDES_MAKEFILE.md → docs/development/"
fi

# 5. Déplacer FRONTEND_REORGANIZATION.md
if [ -f "docs/FRONTEND_REORGANIZATION.md" ]; then
    mv "docs/FRONTEND_REORGANIZATION.md" "docs/frontend/REORGANIZATION.md"
    echo "  ✅ FRONTEND_REORGANIZATION.md → docs/frontend/REORGANIZATION.md"
fi

# 6. Gérer les fichiers de monitoring
echo ""
echo "4️⃣  Organisation de la documentation monitoring..."

# Si MONITORING_SETUP.md existe déjà dans docs/monitoring/, le garder
if [ -f "docs/MONITORING_SETUP.md" ]; then
    mv "docs/MONITORING_SETUP.md" "docs/monitoring/MONITORING_SETUP.md"
    echo "  ✅ MONITORING_SETUP.md → docs/monitoring/"
fi

if [ -f "docs/METRICS_SETUP_COMPLETE.md" ]; then
    mv "docs/METRICS_SETUP_COMPLETE.md" "docs/monitoring/METRICS_SETUP_COMPLETE.md"
    echo "  ✅ METRICS_SETUP_COMPLETE.md → docs/monitoring/"
fi

# Créer un README.md consolidé dans docs/monitoring/ s'il n'existe pas
if [ ! -f "docs/monitoring/README.md" ]; then
    echo "  📝 Création de docs/monitoring/README.md..."
    cat > "docs/monitoring/README.md" <<'EOF'
# 📊 Monitoring - JobbingTrack

Documentation du système de monitoring et métriques.

## 📚 Documentation Disponible

- **[MONITORING_SETUP.md](./MONITORING_SETUP.md)** - Configuration et mise en place du monitoring
- **[METRICS_SETUP_COMPLETE.md](./METRICS_SETUP_COMPLETE.md)** - Configuration complète des métriques

## 🚀 Démarrage Rapide

```bash
# Démarrer le monitoring complet
make monitoring-full

# Démarrer uniquement le monitoring
make monitoring-up

# Arrêter le monitoring
make monitoring-down
```

## 📊 Services de Monitoring

- **Prometheus** (Port 9090) - Collecte des métriques
- **Grafana** (Port 3013) - Visualisation
- **Loki** (Port 3100) - Stockage des logs
- **cAdvisor** (Port 8082) - Métriques conteneurs
- **Node Exporter** (Port 9100) - Métriques système

## 🔗 Accès

```
Prometheus:  http://localhost:9090
Grafana:     http://localhost:3013
  - Login: admin
  - Password: (voir GRAFANA_ADMIN_PASSWORD dans .env)
```

Pour plus de détails, consultez les fichiers de documentation spécifiques ci-dessus.
EOF
    echo "  ✅ README.md créé dans docs/monitoring/"
fi

echo ""
echo "✅ Réorganisation terminée !"
echo ""
echo "📂 Nouvelle structure:"
echo "  docs/"
echo "  ├── getting-started/"
echo "  │   └── README.md (ex-GETTING_STARTED.md)"
echo "  ├── development/"
echo "  │   └── COMMANDES_MAKEFILE.md"
echo "  ├── monitoring/"
echo "  │   ├── README.md (nouveau)"
echo "  │   ├── MONITORING_SETUP.md"
echo "  │   └── METRICS_SETUP_COMPLETE.md"
echo "  └── frontend/"
echo "      └── REORGANIZATION.md (ex-FRONTEND_REORGANIZATION.md)"
echo ""
