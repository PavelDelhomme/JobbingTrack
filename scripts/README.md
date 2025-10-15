# 🛠️ Scripts Utilitaires - Organisation par Catégories

Collection organisée de scripts utilitaires pour le développement, déploiement, monitoring et maintenance de JobbingTrack.

## 📁 Structure Organisée

```
scripts/
├── database/                  # Scripts de gestion de base de données
│   ├── create-admin-user.sh   # Création utilisateur administrateur
│   └── wait-for-postgres.sh   # Attente démarrage PostgreSQL
│
├── deployment/               # Scripts de déploiement et mise à jour
│   ├── apply-updates.sh       # Application des mises à jour
│   ├── diagnostic-fix.sh      # Correction automatique des problèmes
│   ├── restart-all.sh         # Redémarrage complet des services
│   ├── start-all.sh           # Démarrage de tous les services
│   └── stop-all.sh            # Arrêt de tous les services
│
├── monitoring/               # Scripts de surveillance système
│   ├── auto-backup.sh         # Sauvegarde automatique
│   ├── health-monitor.sh      # Surveillance temps réel
│   ├── resource-monitor.sh    # Monitoring des ressources
│   ├── test-docker-metrics.sh # Tests des métriques Docker
│   └── test-rate-limiting.sh  # Tests de limitation de débit
│
├── security/                 # Scripts de sécurité
│   ├── firewall-setup.sh      # Configuration du pare-feu
│   ├── metrics-server.js      # Serveur de métriques sécurité
│   ├── security-monitoring-setup.sh # Configuration monitoring sécurité
│   └── test-intrusion-detection.sh  # Tests de détection d'intrusion
│
├── setup/                    # Scripts de configuration initiale
│   ├── configure-mobile-access.sh   # Configuration accès mobile
│   └── setup-docker-permissions.sh  # Permissions Docker
│
├── system/                   # Scripts système et maintenance
│   ├── clean-backups.sh       # Nettoyage des sauvegardes
│   ├── diagnose-colors.sh     # Diagnostic problèmes couleurs
│   ├── fix-connection.sh      # Correction connexions réseau
│   ├── network-diagnostic.sh  # Diagnostic réseau complet
│   ├── organize-project.sh    # Organisation automatique du projet
│   ├── pre-flight-check.sh    # Vérifications pré-vol complètes
│   ├── setup-colors.sh        # Configuration couleurs
│   ├── setup-make-alias.sh    # Configuration alias make
│   ├── setup-makefile-colors.sh # Configuration couleurs Makefiles
│   ├── smart-clean.sh         # Nettoyage intelligent
│   └── verify-organization.sh # Vérification organisation projet
│
├── testing/                  # Scripts de tests
│   ├── test-complete.sh       # Tests complets automatisés
│   └── test-microservices.sh  # Tests des microservices
│
├── utilities/                # Utilitaires généraux
│   └── ...
│
└── utils/                    # Utilitaires divers
    ├── COMMANDES-GIT.sh      # Commandes Git utiles
    └── make.sh               # Wrapper make avec couleurs
```

## 🚀 Utilisation Rapide

### Démarrage et Arrêt
```bash
# Démarrer tous les services
./scripts/deployment/start-all.sh

# Arrêter proprement
./scripts/deployment/stop-all.sh

# Redémarrage complet
./scripts/deployment/restart-all.sh
```

### Maintenance
```bash
# Vérifications pré-vol avant opérations importantes
./scripts/system/pre-flight-check.sh

# Sauvegarde automatique
./scripts/monitoring/auto-backup.sh

# Nettoyage intelligent
./scripts/system/smart-clean.sh
```

### Surveillance
```bash
# Monitoring temps réel (60 secondes d'intervalle)
./scripts/monitoring/health-monitor.sh 60

# Diagnostic réseau
./scripts/system/network-diagnostic.sh

# Tests de sécurité
./scripts/security/test-intrusion-detection.sh
```

## 🎯 Commandes Préventives

### Avant Toute Opération Importante
```bash
# Diagnostic complet du système
./scripts/system/pre-flight-check.sh

# Vérification santé préventive
./scripts/monitoring/health-monitor.sh 30

# Sauvegarde avant modification
./scripts/monitoring/auto-backup.sh
```

### Maintenance Quotidienne
```bash
# Nettoyage automatique
./scripts/system/smart-clean.sh

# Vérification organisation projet
./scripts/system/verify-organization.sh

# Mise à jour des couleurs si nécessaire
./scripts/system/setup-makefile-colors.sh
```

## 🔧 Scripts de Développement

### Configuration Environnement
```bash
# Configuration complète des couleurs
./scripts/system/setup-colors.sh

# Configuration alias make
./scripts/system/setup-make-alias.sh

# Organisation automatique du projet
./scripts/system/organize-project.sh
```

### Tests et Validation
```bash
# Tests complets automatisés
./scripts/testing/test-complete.sh

# Tests des microservices
./scripts/testing/test-microservices.sh

# Tests des métriques Docker
./scripts/monitoring/test-docker-metrics.sh
```

## 📚 Documentation Détaillée

Chaque catégorie de scripts a sa propre documentation détaillée dans les sous-dossiers. Voir la [documentation principale](../../README.md) pour les références complètes.
