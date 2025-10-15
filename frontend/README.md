# 🎨 Frontend - Dashboard Web Next.js

Interface d'administration moderne développée avec Next.js 14, TypeScript et Tailwind CSS.

## 📁 Structure

```
frontend/
├── src/
│   ├── components/        # Composants réutilisables organisés
│   │   ├── charts/       # Graphiques (LineChart, BarChart, PieChart)
│   │   ├── widgets/      # Widgets de métriques (MetricCard, etc.)
│   │   ├── layout/       # Composants de mise en page
│   │   ├── forms/        # Composants de formulaire génériques
│   │   ├── modals/       # Modales spécialisées
│   │   ├── integrations/ # Intégrations externes
│   │   ├── features/     # Composants spécifiques (AdminLayout)
│   │   └── ui/           # Composants UI de base (shadcn/ui)
│   ├── lib/              # Utilitaires et hooks
│   │   ├── hooks/        # Hooks React (useAuth, useTheme)
│   │   └── integrations/ # Services d'intégration
│   ├── app/              # Pages Next.js (App Router)
│   └── styles/           # Styles globaux
├── public/               # Assets statiques
└── tests/               # Tests Playwright e2e
```

## 🚀 Démarrage Rapide

```bash
# Développement avec hot reload
make dev

# Build de production
make build-frontend

# Tests
make test-frontend
```

## 🎯 Fonctionnalités

### ✅ Implémenté
- **Architecture modulaire** avec composants réutilisables
- **Système de thème** sombre/clair automatique
- **Composants de graphique** SVG natifs performants
- **Widgets de métriques** avec indicateurs de tendance
- **Formulaires génériques** avec validation intégrée
- **Tests e2e** avec Playwright

### 🔄 En Développement
- **Pages du backoffice** avec toutes les fonctionnalités CRUD
- **Intégration temps réel** avec les services backend
- **Optimisations performance** (SSG, ISR)
- **PWA** avec service worker

## 📊 Composants Disponibles

### Charts
- `LineChart` - Graphiques en ligne avec grille
- `BarChart` - Graphiques à barres avec valeurs
- `PieChart` - Graphiques circulaires avec légende

### Widgets
- `MetricCard` - Cartes de métriques avec tendances
- `SystemMetricsWidget` - Widget système complet
- `BusinessMetricsWidget` - Widget métier avec graphiques

### Layout
- `DashboardGrid` - Grille responsive adaptative
- `DashboardSection` - Sections avec header et actions

### Forms
- `FormModal` - Modales de formulaire configurables
- `FormField` - Champs de formulaire génériques

## 🧪 Tests

```bash
# Tests unitaires
make test-frontend

# Tests e2e Playwright
make test-e2e

# Tests complets
make test-all
```

## 🎨 Thèmes

Le système supporte automatiquement :
- **Mode sombre/clair** selon les préférences système
- **Thème manuel** configurable par l'utilisateur
- **Persistance** des préférences utilisateur

## 📚 Documentation

Voir le fichier principal [README.md](../../README.md) pour l'architecture complète et les guides de développement.

---

## 🧭 Navigation

### 📚 **Documentation Centrale**
- **[Accueil](../../README.md)** - Vue d'ensemble du projet
- **[Documentation Organisée](../../docs/README.md)** - Documentation complète
- **[Spécifications Techniques](../../docs/SPEC-TECHNIQUE-JOBBINGTRACK.md)** - Architecture détaillée

### 🚀 **Démarrage Rapide**
- **[Guide de Démarrage Rapide](../../GUIDE-DEMARRAGE-RAPIDE.md)** - Installation express
- **[Guide de Développement](../../docs/guides/getting-started.md)** - Développement frontend

### 🎨 **Composants et Architecture**
- **[Composants Charts](./src/components/charts/README.md)** - Graphiques SVG performants
- **[Composants Widgets](./src/components/widgets/README.md)** - Métriques et KPIs
- **[Composants Layout](./src/components/layout/README.md)** - Mise en page responsive
- **[Composants Forms](./src/components/forms/README.md)** - Formulaires génériques
- **[Composants Modals](./src/components/modals/README.md)** - Modales spécialisées
- **[Composants Integrations](./src/components/integrations/README.md)** - Intégrations externes

### 🔧 **Librairie et Hooks**
- **[Librairie Frontend](./src/lib/README.md)** - Hooks et services organisés
- **[Composants UI](./src/components/ui/README.md)** - Composants de base shadcn/ui
- **[Features Spécialisés](./src/components/features/README.md)** - Composants métier avancés

### 🧪 **Tests et Qualité**
- **[Tests Frontend](#tests)** - Tests unitaires et e2e
- **[Tests Automatisés](../../tests/README.md)** - Suite complète
- **[Tests d'Intégration](../../tests/README.md#tests-dintegration)** - Workflows complets

### 📦 **Déploiement**
- **[Guide de Déploiement](../../docs/deployment/README.md)** - Production complète
- **[Configuration Docker](./docker-compose.frontend.yml)** - Conteneurisation
- **[Variables d'Environnement](../../README.md#variables-denvironnement)** - Configuration

### 🛠️ **Outils de Développement**
- **[Makefiles](../../makefiles/README.md)** - Commandes automatisées
- **[Scripts Frontend](../../scripts/README.md)** - Outils spécialisés
- **[Next.js Config](./next.config.js)** - Configuration framework

### 📁 **Structure du Projet**
- **[Backend](../../backend/README.md)** - Architecture microservices
- **[Mobile](../../mobile/README.md)** - Application React Native
- **[API](../../docs/api/README.md)** - Documentation API complète
