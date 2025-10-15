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
    placeholder="redacted@example.invalid"
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
npm run test ui

# Tests d'accessibilité
npm run test:a11y ui

# Tests visuels avec capture d'écran
npm run test:visual
```

## 📚 Référence

Basé sur [shadcn/ui](https://ui.shadcn.com/) - Collection de composants React accessibles et personnalisables construits sur Radix UI et stylés avec Tailwind CSS.

Voir la [documentation complète](https://ui.shadcn.com/docs) pour plus d'informations sur l'utilisation et la personnalisation.
