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
