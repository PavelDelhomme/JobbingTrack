# 📊 Charts - Composants de Graphiques

Composants de graphique SVG natifs performants pour la visualisation de données dans le dashboard.

## 📁 Composants Disponibles

### LineChart
Graphique en ligne avec grille et animation pour séries temporelles.
```tsx
import { LineChart } from '@/components/charts'

<LineChart
  data={[
    { label: 'Jan', value: 100 },
    { label: 'Fév', value: 120 }
  ]}
  title="Évolution des candidatures"
  color="#3B82F6"
/>
```

### BarChart
Graphique à barres avec valeurs affichées pour comparaisons.
```tsx
import { BarChart } from '@/components/charts'

<BarChart
  data={[
    { label: 'TechCorp', value: 45 },
    { label: 'DataSoft', value: 32 }
  ]}
  title="Candidatures par entreprise"
/>
```

### PieChart
Graphique circulaire avec légende intégrée pour répartitions.
```tsx
import { PieChart } from '@/components/charts'

<PieChart
  data={[
    { label: 'Réussies', value: 23, color: '#10B981' },
    { label: 'En attente', value: 15, color: '#F59E0B' }
  ]}
  title="Répartition des statuts"
/>
```

## 🎨 Fonctionnalités

- **SVG natif** : Pas de dépendances externes, performance optimale
- **Thème automatique** : Support sombre/clair automatique
- **Responsive** : Adaptation automatique à la taille du conteneur
- **Animations** : Transitions fluides et effets visuels
- **Accessibilité** : Support screen readers et navigation clavier

## 🎯 Utilisation

### Données
Tous les graphiques acceptent un tableau d'objets avec :
- `label` : Libellé à afficher
- `value` : Valeur numérique à représenter
- `color` : Couleur personnalisée (optionnel)

### Personnalisation
- `title` : Titre du graphique
- `height` : Hauteur en pixels
- `color` : Couleur principale du graphique
- `className` : Classes CSS additionnelles

## 🚀 Performance

- **Léger** : Composants optimisés avec SVG natif
- **Bundle** : Tree-shaking automatique avec exports nommés
- **Rendu** : Pas de canvas, rendu direct SVG
- **Animations** : CSS transitions pour fluidité
- **Tests** : `make test-frontend` pour validation

---

## 🧭 Navigation

### 🎨 **Composants Frontend**
- **[Accueil Frontend](../../README.md)** - Vue d'ensemble du dashboard
- **[Composants Widgets](../widgets/README.md)** - Métriques et KPIs
- **[Composants Layout](../layout/README.md)** - Mise en page responsive
- **[Composants Forms](../forms/README.md)** - Formulaires génériques
- **[Composants Modals](../modals/README.md)** - Modales spécialisées
- **[Composants Integrations](../integrations/README.md)** - Intégrations externes

### 🔧 **Librairie et Hooks**
- **[Librairie Frontend](../../lib/README.md)** - Hooks et services organisés
- **[Composants UI](../ui/README.md)** - Composants de base shadcn/ui
- **[Features Spécialisés](../features/README.md)** - Composants métier avancés

### 📚 **Documentation Centrale**
- **[Accueil Projet](../../../README.md)** - Vue d'ensemble complète
- **[Documentation Organisée](../../../docs/README.md)** - Documentation structurée
- **[Spécifications Techniques](../../../docs/SPEC-TECHNIQUE-JOBBINGTRACK.md)** - Architecture détaillée

### 🧪 **Tests et Qualité**
- **[Tests Frontend](../../README.md#tests)** - Tests unitaires et e2e
- **[Tests Automatisés](../../../tests/README.md)** - Suite complète
- **[Tests d'Intégration](../../../tests/README.md#tests-dintegration)** - Workflows complets

### 📦 **Déploiement**
- **[Guide de Déploiement](../../../docs/deployment/README.md)** - Production complète
- **[Variables d'Environnement](../../../README.md#variables-denvironnement)** - Configuration

### 🛠️ **Outils de Développement**
- **[Makefiles](../../../makefiles/README.md)** - Commandes automatisées
- **[Scripts Frontend](../../../scripts/README.md)** - Outils spécialisés

### 📁 **Structure du Projet**
- **[Backend](../../../backend/README.md)** - Architecture microservices
- **[Mobile](../../../mobile/README.md)** - Application React Native
- **[API](../../../docs/api/README.md)** - Documentation API complète
