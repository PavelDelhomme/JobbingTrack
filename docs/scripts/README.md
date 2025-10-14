# 🛠️ Documentation des Scripts - JobbingTrack

Cette section contient toute la documentation relative aux scripts utilitaires organisés de JobbingTrack.

## 📂 Structure des Scripts

```
scripts/
├── README.md                          # ← Cette documentation
├── database/                          # Scripts base de données
│   ├── create-admin-user.sh
│   ├── wait-for-postgres.sh
│   └── README.md
├── deployment/                        # Scripts de déploiement
│   ├── apply-updates.sh
│   ├── diagnostic-fix.sh
│   └── README.md
├── system/                           # Scripts système et configuration
│   ├── fix-connection.sh
│   ├── setup-makefile-colors.sh
│   ├── clean-backups.sh
│   ├── pre-flight-check.sh
│   ├── smart-clean.sh
│   ├── network-diagnostic.sh
│   ├── organize-project.sh
│   └── README.md
├── testing/                          # Scripts de tests
│   ├── test-microservices.sh
│   ├── test-complete.sh
│   └── README.md
├── setup/                           # Scripts de configuration
│   ├── setup-docker-permissions.sh
│   ├── configure-mobile-access.sh
│   └── README.md
├── monitoring/                      # Scripts de surveillance
│   ├── health-monitor.sh
│   ├── auto-backup.sh
│   ├── resource-monitor.sh
│   └── README.md
└── utils/                          # Utilitaires généraux
    ├── COMMANDES-GIT.sh
    ├── make.sh
    └── README.md
```

## 🎯 Catégories de Scripts

### 🗄️ **Scripts Base de Données**
- **Gestion des utilisateurs** administrateurs
- **Vérification** de la disponibilité PostgreSQL
- **Maintenance** et optimisation

### 🚀 **Scripts de Déploiement**
- **Mises à jour automatiques** du projet
- **Diagnostic et correction** des problèmes
- **Déploiement** en production

### ⚙️ **Scripts Système**
- **Configuration** des permissions Docker
- **Accès mobile** et réseau
- **Couleurs** pour les Makefiles
- **Nettoyage** intelligent
- **Diagnostic** réseau et système

### 🧪 **Scripts de Tests**
- **Tests automatisés** des microservices
- **Suite complète** de tests
- **Validation** des fonctionnalités

### 📊 **Scripts de Monitoring**
- **Surveillance temps réel** de la santé
- **Sauvegardes automatiques** avec rotation
- **Monitoring** des ressources système

### 🛠️ **Utilitaires Généraux**
- **Commandes Git** personnalisées
- **Wrapper** pour les Makefiles
- **Outils** de développement

## 🚀 Utilisation

### **Exécution des Scripts**
```bash
# Scripts de base de données
./scripts/database/create-admin-user.sh
./scripts/database/wait-for-postgres.sh

# Scripts de déploiement
./scripts/deployment/apply-updates.sh
./scripts/deployment/diagnostic-fix.sh

# Scripts système
./scripts/system/setup-makefile-colors.sh
./scripts/system/pre-flight-check.sh

# Scripts de tests
./scripts/testing/test-microservices.sh
./scripts/testing/test-complete.sh

# Scripts de monitoring
./scripts/monitoring/health-monitor.sh 60
./scripts/monitoring/auto-backup.sh

# Utilitaires
source ./scripts/utils/COMMANDES-GIT.sh
./scripts/utils/make.sh
```

### **Intégration avec Makefiles**
```bash
make up              # Utilise scripts/database/wait-for-postgres.sh
make fix             # Utilise scripts/deployment/diagnostic-fix.sh
make backup          # Utilise scripts/monitoring/auto-backup.sh
```

## 🛠️ Développement de Scripts

### **Standards**
- **Exécutables** : `chmod +x script.sh`
- **Documentation** : Commentaires et aide intégrée
- **Gestion d'erreurs** : Codes de sortie appropriés
- **Compatibilité** : zsh/bash

### **Catégorisation**
1. **Identifier** la fonction du script
2. **Placer** dans la catégorie appropriée
3. **Documenter** dans le README de la catégorie
4. **Intégrer** au Makefile si nécessaire

### **Tests**
- **Fonctionnalité** : Le script fait ce qu'il doit
- **Gestion d'erreurs** : Comportement en cas d'échec
- **Aide** : `./script.sh --help` fonctionne

## 🔧 Dépannage

### **Permissions**
```bash
# Rendre exécutable
chmod +x scripts/category/script.sh

# Vérifier les permissions
ls -la scripts/category/script.sh
```

### **Chemins**
- **Relatifs** : Utiliser `$(pwd)` ou des chemins absolus
- **Portabilité** : Éviter les chemins codés en dur
- **Tests** : Tester depuis différents répertoires

### **Variables d'Environnement**
- **Définir** les variables nécessaires
- **Documenter** les prérequis
- **Vérifier** la disponibilité

## 📚 Références

- **Documentation Scripts** : [`./README.md`](./README.md) (ce fichier)
- **Makefiles** : [`../makefiles/README.md`](../makefiles/README.md)
- **Documentation Générale** : [`../README.md`](../README.md)
- **Outils de Développement** : [`../makefiles/README.md`](../makefiles/README.md)

## 🔄 Maintenance

### **Ajout de Nouveaux Scripts**
1. Créer le script dans la catégorie appropriée
2. Le rendre exécutable
3. Ajouter la documentation
4. Tester l'intégration

### **Mise à Jour**
- **Réviser** les scripts existants
- **Améliorer** les fonctionnalités
- **Corriger** les bugs
- **Mettre à jour** la documentation

### **Archivage**
- **Déplacer** les scripts obsolètes
- **Documenter** les changements
- **Maintenir** l'historique

---

**🛠️ Cette documentation constitue la référence complète pour l'utilisation et le développement des scripts de JobbingTrack.**

