# 🔲 Modals - Composants de Modales Spécialisées

Modales métier pré-construites pour les fonctionnalités spécifiques de l'application JobbingTrack.

## 📁 Modales Disponibles

### CreateCallModal
Modale complète pour créer un nouvel appel téléphonique avec sélection d'entreprise et contact.
```tsx
import { CreateCallModal } from '@/components/modals'

<CreateCallModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onCallCreated={() => {
    // Recharger les données
    refetchCalls()
  }}
/>
```

### AdvancedEditModal
Modale d'édition avancée avec onglets et gestion des champs dynamiques.
```tsx
import { AdvancedEditModal } from '@/components/modals'

<AdvancedEditModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  rowData={selectedItem}
  tableName="applications"
  onSave={async (updatedData) => {
    await updateApplication(updatedData)
  }}
/>
```

## 🎯 Fonctionnalités

### Interface Utilisateur
- **Overlay semi-transparent** : Focus sur le contenu modal
- **Animations fluides** : Entrée/sortie élégantes
- **Responsive** : Adaptation mobile et desktop
- **Clavier** : Échap pour fermer, Tab pour naviguer

### Gestion d'État
- **Validation intégrée** : Contrôle des champs obligatoires
- **États de chargement** : Indicateurs visuels pendant la soumission
- **Gestion d'erreurs** : Messages d'erreur contextuels
- **Confirmation** : Demande de confirmation avant fermeture avec changements

### Accessibilité
- **Focus trap** : Confinement du focus dans la modale
- **Screen readers** : Support complet des technologies d'assistance
- **Contraste élevé** : Respect des standards WCAG
- **Navigation clavier** : Toutes les interactions possibles au clavier

## 🚀 Utilisation

### Configuration de Base
```typescript
interface ModalProps {
  isOpen: boolean              // Contrôle ouverture/fermeture
  onClose: () => void          // Gestionnaire de fermeture
  title?: string              // Titre optionnel
  size?: 'sm' | 'md' | 'lg'   // Taille de la modale
  loading?: boolean           // État de chargement
}
```

### Callbacks et Événements
```typescript
interface Callbacks {
  onCallCreated?: () => void   // Après création réussie
  onSave?: (data: any) => Promise<void>  // Sauvegarde personnalisée
  onDelete?: (id: string) => Promise<void>  // Suppression
  onCancel?: () => void        // Annulation personnalisée
}
```

## 🎨 Personnalisation

### Contenu Flexible
- **Slots enfants** : Contenu entièrement personnalisable
- **Header personnalisé** : Titre et actions configurables
- **Footer optionnel** : Boutons d'action selon les besoins

### Styles et Thèmes
- **Thème automatique** : Adaptation sombre/clair
- **Classes CSS** : Extension possible avec className
- **Animations** : Transitions configurables

## 🔧 Intégration Backend

### Services API
Les modales utilisent automatiquement :
- **Application Service** : Gestion des candidatures
- **Company Service** : Recherche d'entreprises
- **Contact Service** : Gestion des contacts
- **Call Service** : Création et gestion des appels

### Gestion d'Erreurs
- **Retry automatique** : En cas d'échec réseau temporaire
- **Messages d'erreur** : Contextuels et informatifs
- **Logging** : Traçabilité des erreurs pour debug

## 📱 Responsive Design

### Mobile
- **Taille adaptée** : Plein écran sur mobile
- **Touch-friendly** : Boutons et zones de saisie optimisées
- **Clavier virtuel** : Gestion intelligente du viewport

### Desktop
- **Taille optimale** : Centrage avec taille adaptée au contenu
- **Focus management** : Navigation clavier complète
- **Multi-tâches** : Possibilité d'interaction avec le fond

## 🚀 Performance

- **Lazy loading** : Chargement à la demande
- **Mémorisation** : Évite les re-renders inutiles
- **Bundle splitting** : Composants indépendants
- **Optimisations** : Pas de dépendances externes lourdes

## 🧪 Tests

```bash
# Tests des modales
npm run test modals

# Tests d'intégration
npm run test:integration modals

# Tests e2e des workflows modaux
npx playwright test modal-workflows.spec.ts
```

## 🔄 Évolution

### Améliorations Prévues
- **Modales responsives** avec breakpoints avancés
- **Animations personnalisables** avec Framer Motion
- **Gestion d'état globale** avec Zustand
- **Validation avancée** avec Yup/Zod
