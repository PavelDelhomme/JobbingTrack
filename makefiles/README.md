# 🛠️ Makefiles Modulaires - Commandes Automatisées

Système de Makefiles organisés de manière modulaire avec support des couleurs pour une meilleure expérience développeur.

## 📁 Structure Modulaire

```
makefiles/
├── README.md                  # ← Documentation (ce fichier)
├── README-COLORS.md           # Guide des couleurs et configuration
├── .make_colors              # Configuration couleurs active
│
├── shared/                   # Fonctions et variables communes
│   └── common.mk             # Variables et fonctions partagées
│
├── root/                     # Makefile principal du projet
│   └── Makefile              # Point d'entrée principal
│
├── backend/                  # Makefiles spécifiques backend
│   └── Makefile              # Commandes backend
│
├── frontend/                 # Makefiles spécifiques frontend
│   └── Makefile              # Commandes frontend
│
└── tests/                    # Makefiles spécifiques tests
    └── Makefile              # Commandes de tests
```

## 🎨 Système de Couleurs

### Configuration
- **Fichier de configuration** : `.make_colors`
- **Guide détaillé** : [README-COLORS.md](./README-COLORS.md)
- **Activation automatique** : Couleurs activées par défaut

### Couleurs Disponibles
- 🟢 **Vert** : Succès, démarrage de services
- 🔴 **Rouge** : Erreurs, arrêts de services
- 🟡 **Jaune** : Avertissements, informations importantes
- 🔵 **Bleu** : Informations générales, étapes
- 🟣 **Magenta** : Actions spéciales, nettoyage

## 🚀 Commandes Principales

### Démarrage et Gestion des Services
```bash
# Démarrer tous les services
make up

# Arrêter tous les services
make down

# Redémarrer complètement
make restart

# Voir le statut des services
make status
```

### Base de Données
```bash
# Migrations Prisma
make migrate

# Reset complet de la base
make migrate-reset

# Peupler avec données de test
make seed

# Ouvrir Prisma Studio
make studio
```

### Tests et Qualité
```bash
# Lancer tous les tests
make test

# Tests de santé des services
make test-services

# Vérification qualité code
make lint

# Formatage automatique
make format
```

### Développement
```bash
# Mode développement complet
make dev

# Build de toutes les images
make build

# Nettoyage complet
make clean
```

## 🔧 Makefiles Spécialisés

### Backend (`makefiles/backend/Makefile`)
Commandes spécifiques au backend microservices :
- Gestion des 8 services indépendamment
- Tests d'intégration backend
- Déploiement backend seul

### Frontend (`makefiles/frontend/Makefile`)
Commandes spécifiques au frontend Next.js :
- Installation des dépendances
- Développement avec hot reload
- Build de production optimisé

### Tests (`makefiles/tests/Makefile`)
Commandes spécialisées pour les tests :
- Tests unitaires automatisés
- Tests d'intégration complets
- Tests e2e Playwright
- Coverage et rapports

## 📚 Variables d'Environnement

Les Makefiles utilisent automatiquement :
- Variables définies dans `.env` local
- Configuration Docker Compose
- Paramètres de déploiement

## 🎯 Commandes Avancées

### Développement Avancé
```bash
# Diagnostic complet système
make diagnose

# Vérifications préventives
make check-health

# Sauvegarde avant modifications
make backup

# Nettoyage automatique
make clean-logs
```

### Production
```bash
# Préparation déploiement
make pre-flight

# Vérification déploiement
make check-ready

# Déploiement production
make deploy
```

## 🔄 Automatisation

Les Makefiles intègrent automatiquement :
- **Vérifications de santé** avant opérations critiques
- **Sauvegardes automatiques** avant modifications importantes
- **Nettoyage automatique** des ressources temporaires
- **Notifications colorées** pour feedback visuel

## 📖 Documentation Complète

Voir le [README principal](../../README.md) pour :
- Installation complète
- Configuration des environnements
- Guide de déploiement en production
- Tutoriels avancés

## 🤝 Contribution

Pour ajouter de nouvelles commandes :
1. **Comprendre la structure** modulaire existante
2. **Suivre les conventions** de nommage et couleurs
3. **Tester** les nouvelles commandes
4. **Documenter** dans les fichiers appropriés
