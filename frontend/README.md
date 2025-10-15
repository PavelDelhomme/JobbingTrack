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
npm run test

# Tests e2e Playwright
npx playwright test

# Tests avec interface graphique
npx playwright test --ui
```

## 🎨 Thèmes

Le système supporte automatiquement :
- **Mode sombre/clair** selon les préférences système
- **Thème manuel** configurable par l'utilisateur
- **Persistance** des préférences utilisateur

## 📚 Documentation

Voir le fichier principal [README.md](../../README.md) pour l'architecture complète et les guides de développement.
