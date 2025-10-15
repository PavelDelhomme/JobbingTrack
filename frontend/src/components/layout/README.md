# 📐 Layout - Composants de Mise en Page

Composants de mise en page et d'organisation spatiale pour structurer l'interface utilisateur.

## 📁 Composants Disponibles

### DashboardGrid
Grille responsive adaptative pour organiser les widgets du tableau de bord.
```tsx
import { DashboardGrid } from '@/components/layout'

<DashboardGrid columns={3} gap="md">
  <MetricCard title="Candidatures" value="1,234" />
  <MetricCard title="Entreprises" value="89" />
  <ChartComponent />
</DashboardGrid>
```

### DashboardSection
Section avec header, description et actions pour organiser le contenu.
```tsx
import { DashboardSection } from '@/components/layout'

<DashboardSection
  title="Métriques Système"
  description="Surveillance en temps réel des performances"
  actions={<RefreshButton />}
>
  <SystemMetricsWidget />
</DashboardSection>
```

## 🎯 Fonctionnalités

### Responsive Design
- **Breakpoints automatiques** : Adaptation selon la taille d'écran
- **Colonnes dynamiques** : 1 à 6 colonnes selon l'espace disponible
- **Mobile-first** : Optimisé pour les petits écrans
- **Touch-friendly** : Interactions tactiles optimisées

### Grille Adaptative
```typescript
interface GridConfig {
  columns?: 1 | 2 | 3 | 4 | 6  // Nombre de colonnes par défaut
  gap?: 'sm' | 'md' | 'lg'      // Espacement entre éléments
  className?: string            // Classes CSS additionnelles
}
```

### Sections Organisées
```typescript
interface SectionConfig {
  title: string                 // Titre de la section
  description?: string          // Description optionnelle
  actions?: ReactNode           // Boutons d'action
  className?: string            // Classes CSS personnalisées
}
```

## 🚀 Utilisation

### Grille Responsive
```tsx
// Grille 3 colonnes par défaut (responsive)
<DashboardGrid>
  <Widget1 />
  <Widget2 />
  <Widget3 />
</DashboardGrid>

// Grille personnalisée
<DashboardGrid columns={4} gap="lg" className="my-6">
  <MetricCard title="Item 1" value="100" />
  <MetricCard title="Item 2" value="200" />
  <MetricCard title="Item 3" value="300" />
  <MetricCard title="Item 4" value="400" />
</DashboardGrid>
```

### Sections avec Actions
```tsx
<DashboardSection
  title="Analyse des Performances"
  description="Métriques détaillées sur les 30 derniers jours"
  actions={
    <div className="flex gap-2">
      <Button variant="outline" size="sm">
        <DownloadIcon className="w-4 h-4 mr-1" />
        Exporter
      </Button>
      <Button variant="outline" size="sm">
        <SettingsIcon className="w-4 h-4 mr-1" />
        Configurer
      </Button>
    </div>
  }
>
  <PerformanceChart data={metrics} />
</DashboardSection>
```

## 🎨 Personnalisation

### Espacement et Mise en Page
- **Gap control** : Espacement entre éléments (`sm`, `md`, `lg`)
- **Responsive columns** : Colonnes automatiques selon breakpoint
- **Custom classes** : Extension avec Tailwind CSS
- **Container queries** : Adaptation au conteneur parent

### Thèmes et Styles
- **Mode sombre/clair** : Adaptation automatique
- **Animations** : Transitions fluides entre états
- **Focus states** : Indicateurs d'accessibilité
- **Hover effects** : Interactions visuelles

## 📱 Responsive Breakpoints

### Desktop (1280px+)
- **6 colonnes maximum** pour les grandes grilles
- **4 colonnes** pour les sections principales
- **Espacement généreux** pour la lisibilité

### Tablet (768px - 1279px)
- **4 colonnes maximum** pour éviter la surcharge
- **3 colonnes** pour le contenu principal
- **Espacement moyen** optimisé

### Mobile (< 768px)
- **2 colonnes maximum** pour la lisibilité
- **1 colonne** pour les sections importantes
- **Espacement compact** pour l'utilisation tactile

## 🚀 Performance

- **CSS Grid natif** : Performance optimale sans JavaScript
- **Calculs côté serveur** : Pré-calculation des layouts
- **Optimisations CSS** : Classes utilitaires optimisées
- **Bundle minimal** : Pas de dépendances externes

## 🔧 Intégration

### Avec les Composants Existants
```tsx
import { DashboardGrid, DashboardSection } from '@/components/layout'
import { MetricCard, LineChart } from '@/components'

function Dashboard() {
  return (
    <div className="space-y-8">
      <DashboardSection title="Vue d'ensemble">
        <DashboardGrid columns={4}>
          <MetricCard title="Total" value="1,234" />
          <MetricCard title="Actifs" value="89" />
          <MetricCard title="Nouveaux" value="23" />
          <MetricCard title="Taux" value="94%" />
        </DashboardGrid>
      </DashboardSection>

      <DashboardSection title="Évolution">
        <LineChart data={trendData} />
      </DashboardSection>
    </div>
  )
}
```

## 🧪 Tests

```bash
# Tests des composants layout
npm run test layout

# Tests responsive
npm run test:responsive

# Tests d'accessibilité
npm run test:a11y layout
```

## 🔄 Évolution

### Améliorations Prévues
- **Container queries** pour une meilleure adaptation
- **Virtual scrolling** pour les grandes grilles
- **Animations avancées** avec Framer Motion
- **Layout builder** en drag & drop
