# 🎨 UI - Composants de Base

Composants UI fondamentaux basés sur shadcn/ui pour une interface cohérente et accessible.

## 📁 Composants Disponibles

### Layout et Structure
- `Card` - Conteneur avec bordures et ombres
- `Separator` - Ligne de séparation horizontale/verticale

### Formulaires
- `Button` - Boutons avec variantes et états
- `Input` - Champs de saisie texte
- `Label` - Libellés associés aux champs
- `Textarea` - Zones de texte multilignes
- `Select` - Listes déroulantes
- `Switch` - Interrupteurs marche/arrêt

### Feedback Utilisateur
- `Alert` - Messages d'information, succès, avertissement, erreur
- `Badge` - Indicateurs de statut et catégories
- `Tooltip` - Infobulles contextuelles

### Navigation
- `Tabs` - Onglets pour organisation de contenu

## 🎯 Utilisation

### Imports
```tsx
// Import individuel
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Import multiple
import { Button, Input, Label } from '@/components/ui'
```

### Exemples d'Utilisation

#### Boutons
```tsx
<Button variant="default" size="sm">
  Action principale
</Button>

<Button variant="outline" disabled>
  Désactivé
</Button>
```

#### Formulaires
```tsx
<div className="space-y-4">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="votre@email.com"
    required
  />
</div>
```

#### Alerts
```tsx
<Alert variant="success">
  <CheckCircle className="h-4 w-4" />
  Opération réussie !
</Alert>
```

## 🎨 Personnalisation

### Variantes et Tailles
- **Variants** : `default`, `outline`, `ghost`, `link`
- **Tailles** : `sm`, `md` (default), `lg`
- **États** : `default`, `disabled`, `loading`

### Thèmes
- **Mode sombre/clair** : Adaptation automatique
- **Couleurs sémantiques** : Vert pour succès, rouge pour erreurs
- **Contraste élevé** : Accessibilité optimale

## 🚀 Performance

- **Bundle optimisé** : Tree-shaking automatique
- **CSS-in-JS** : Styles intégrés pour éviter les conflits
- **Animations légères** : Transitions CSS uniquement
- **Composants légers** : Pas de dépendances externes inutiles

## 🔧 Configuration

### Installation des Dépendances
```bash
# Composants shadcn/ui
npx shadcn-ui@latest add button input label
```

### Configuration Tailwind
```css
/* tailwind.config.js */
module.exports = {
  content: [
    './src/components/ui/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
      }
    }
  }
}
```

## 🧪 Tests

```bash
# Tests des composants UI
make test-ui

# Tests d'accessibilité
make test-a11y

# Tests visuels avec capture d'écran
make test-visual
```

## 📚 Référence

Basé sur [shadcn/ui](https://ui.shadcn.com/) - Collection de composants React accessibles et personnalisables construits sur Radix UI et stylés avec Tailwind CSS.

Voir la [documentation complète](https://ui.shadcn.com/docs) pour plus d'informations sur l'utilisation et la personnalisation.

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
- **[Features Spécialisés](../features/README.md)** - Composants métier avancés

### 🔧 **Librairie et Hooks**
- **[Librairie Frontend](../../lib/README.md)** - Hooks et services organisés

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
