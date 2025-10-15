# 🎯 Widgets - Composants de Métriques

Composants spécialisés pour l'affichage de métriques, KPIs et indicateurs dans le tableau de bord.

## 📁 Composants Disponibles

### MetricCard
Carte de métrique avec valeur, tendance et indicateurs visuels.
```tsx
import { MetricCard } from '@/components/widgets'

<MetricCard
  title="Candidatures"
  value="1,234"
  change={{
    value: 12,
    label: 'ce mois'
  }}
  trend="up"
  icon={<UsersIcon className="w-5 h-5" />}
/>
```

### SystemMetricsWidget
Widget complet pour les métriques système (CPU, mémoire, disque).
```tsx
import { SystemMetricsWidget } from '@/components/widgets'

<SystemMetricsWidget
  metrics={{
    cpuUsage: 45,
    memoryUsage: 67,
    diskUsage: 23,
    uptime: '15j 8h 32m'
  }}
/>
```

### BusinessMetricsWidget
Widget métier avec métriques d'activité et graphique intégré.
```tsx
import { BusinessMetricsWidget } from '@/components/widgets'

<BusinessMetricsWidget
  metrics={{
    totalApplications: 1234,
    totalCompanies: 89,
    totalContacts: 456,
    recentActivity: {
      applications: 12,
      interviews: 5,
      calls: 8,
      followups: 15
    }
  }}
/>
```

## 🎨 Fonctionnalités

### Indicateurs de Tendance
- **Flèche vers le haut** : Augmentation positive
- **Flèche vers le bas** : Diminution négative
- **Flèche horizontale** : Stable ou neutre
- **Couleurs automatiques** : Vert/rouge selon la tendance

### Animations
- **Compteur animé** : Transition fluide des valeurs
- **Pulse effect** : Animation sur les éléments actifs
- **Hover effects** : Interactions visuelles au survol

### Responsive
- **Grille adaptative** : Colonnes automatiques selon l'espace
- **Mobile-first** : Optimisé pour tous les écrans
- **Breakpoints** : Comportement différent selon la taille

## 🎯 Utilisation

### Données Métriques
```typescript
interface MetricData {
  title: string           // Titre affiché
  value: string | number  // Valeur principale
  change?: {             // Évolution (optionnel)
    value: number        // Pourcentage de changement
    label: string        // Période (ex: "ce mois")
  }
  trend?: 'up' | 'down' | 'neutral'  // Direction de tendance
  icon?: ReactNode       // Icône personnalisée
}
```

### Métriques Système
```typescript
interface SystemMetrics {
  cpuUsage: number       // Pourcentage CPU
  memoryUsage: number    // Pourcentage mémoire
  diskUsage: number      // Pourcentage disque
  uptime: string         // Durée de fonctionnement
}
```

### Métriques Métier
```typescript
interface BusinessMetrics {
  totalApplications: number    // Total candidatures
  totalCompanies: number       // Total entreprises
  totalContacts: number        // Total contacts
  recentActivity: {           // Activité récente
    applications: number
    interviews: number
    calls: number
    followups: number
  }
}
```

## 🚀 Performance

- **Composants légers** : Optimisés pour le rendu rapide
- **Mémorisation** : React.memo pour éviter les re-renders inutiles
- **Bundle optimisé** : Tree-shaking automatique
- **Animations CSS** : Pas de JavaScript lourd pour les animations
- **Tests** : `make test-frontend` pour validation des composants

---

## 🧭 Navigation

### 🎨 **Composants Frontend**
- **[Accueil Frontend](../../README.md)** - Vue d'ensemble du dashboard
- **[Composants Charts](../charts/README.md)** - Graphiques SVG performants
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

## 🎨 Thèmes

- **Mode sombre/clair** : Adaptation automatique
- **Couleurs sémantiques** : Vert pour positif, rouge pour négatif
- **Contraste élevé** : Accessibilité optimale
- **Animations respectueuses** : Réduites pour les utilisateurs préférant moins de mouvement
