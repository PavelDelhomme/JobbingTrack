# ⭐ Features - Composants Spécialisés

Composants métier spécifiques à l'application JobbingTrack, intégrant plusieurs fonctionnalités avancées.

## 📁 Composants Disponibles

### AdminLayout
Layout principal du backoffice avec navigation, sidebar et gestion du thème.
```tsx
import AdminLayout from '@/components/features/AdminLayout'

export default function AdminPage() {
  return (
    <AdminLayout>
      <YourPageContent />
    </AdminLayout>
  )
}
```

## 🎯 Fonctionnalités

### Navigation Avancée
- **Sidebar responsive** : Navigation principale avec sections pliables
- **Breadcrumb automatique** : Fil d'Ariane basé sur l'URL
- **Recherche globale** : Recherche intégrée dans la topbar
- **Thème automatique** : Basculement sombre/clair

### Gestion d'État
- **Persistance** : Préférences utilisateur sauvegardées
- **États actifs** : Indicateurs visuels des pages courantes
- **Animations fluides** : Transitions entre les sections
- **Mobile-friendly** : Menu hamburger sur mobile

### Sécurité
- **Vérification d'authentification** : Redirection automatique si non connecté
- **Gestion des rôles** : Affichage conditionnel selon les permissions
- **Logout sécurisé** : Nettoyage des tokens et cookies

## 🚀 Utilisation

### Configuration de Base
```tsx
import AdminLayout from '@/components/features/AdminLayout'

function BackofficeApp() {
  return (
    <AdminLayout>
      <DashboardContent />
    </AdminLayout>
  )
}
```

### Personnalisation
```tsx
// Le layout gère automatiquement :
// - La sidebar avec navigation
// - Le header avec recherche et thème
// - Le fil d'Ariane
// - Les contrôles utilisateur
// - La responsivité mobile

// Il suffit de passer le contenu de la page
<AdminLayout>
  <YourCustomPage />
</AdminLayout>
```

## 🎨 Structure du Layout

### Sidebar
- **Logo et titre** de l'application
- **Sections pliables** avec icônes
- **Navigation principale** avec indicateurs actifs
- **Menu utilisateur** en bas

### Header
- **Bouton hamburger** (mobile uniquement)
- **Titre de la page** adaptatif
- **Fil d'Ariane** (desktop uniquement)
- **Recherche globale**
- **Contrôles utilisateur** (thème, paramètres)

### Contenu Principal
- **Padding responsive** adapté à la sidebar
- **Scroll automatique** si nécessaire
- **Background adapté** au thème

## 🔧 Configuration

### Navigation
La navigation est configurée dans le composant avec des sections :
```typescript
const sections = [
  {
    id: 'dashboard',
    label: 'Tableau de bord',
    icon: '📊',
    items: [
      { name: 'Vue d\'ensemble', href: '/backoffice', icon: '📊' },
      { name: 'Analytics', href: '/backoffice/analytics', icon: '⚡' }
    ]
  }
]
```

### Thèmes
- **Système** : Suit les préférences du système
- **Clair** : Mode clair forcé
- **Sombre** : Mode sombre forcé
- **Persistance** : Sauvegardé dans localStorage

## 📱 Responsive Design

### Desktop (> 1024px)
- **Sidebar fixe** à gauche
- **Contenu principal** avec marge
- **Header complet** avec recherche et fil d'Ariane

### Tablet (768px - 1023px)
- **Sidebar masquée** par défaut
- **Bouton hamburger** pour afficher la sidebar
- **Header simplifié**

### Mobile (< 768px)
- **Sidebar en overlay** plein écran
- **Header compact** avec hamburger
- **Navigation tactile** optimisée

## 🚀 Performance

- **Chargement optimisé** : Composants chargés à la demande
- **Animations CSS** : Pas de JavaScript pour les transitions
- **Mémorisation** : Évite les re-renders inutiles
- **Bundle splitting** : Composant indépendant

## 🔐 Sécurité

- **Vérification JWT** : Validation automatique des tokens
- **Gestion des rôles** : Affichage conditionnel
- **Logout automatique** : Expiration des sessions
- **CSRF protection** : Tokens sécurisés

## 🧪 Tests

```bash
# Tests du layout AdminLayout
make test-frontend

# Tests de navigation
make test-navigation

# Tests responsive
make test-responsive

# Tests d'authentification
make test-auth
```

## 🔄 Évolution

### Améliorations Prévues
- **Navigation dynamique** basée sur les permissions utilisateur
- **Recherche avancée** avec filtres et suggestions
- **Notifications temps réel** dans le header
- **Raccourcis clavier** pour navigation rapide

---

## 🧭 Navigation

### 🎨 **Composants Frontend**
- **[Accueil Frontend](../../README.md)** - Vue d'ensemble du dashboard
- **[Composants Charts](../charts/README.md)** - Graphiques SVG performants
- **[Composants Widgets](../widgets/README.md)** - Métriques et KPIs
- **[Composants Layout](../layout/README.md)** - Mise en page responsive
- **[Composants Forms](../forms/README.md)** - Formulaires génériques
- **[Composants Modals](../modals/README.md)** - Modales spécialisées
- **[Composants Integrations](../integrations/README.md)** - Intégrations externes

### 🔧 **Librairie et Hooks**
- **[Librairie Frontend](../../lib/README.md)** - Hooks et services organisés
- **[Composants UI](../ui/README.md)** - Composants de base shadcn/ui

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
