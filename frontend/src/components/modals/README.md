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
make test-frontend

# Tests d'intégration
make test-integration

# Tests e2e des workflows modaux
make test-e2e-modal
```

## 🔄 Évolution

### Améliorations Prévues
- **Modales responsives** avec breakpoints avancés
- **Animations personnalisables** avec Framer Motion
- **Gestion d'état globale** avec Zustand
- **Validation avancée** avec Yup/Zod

---

## 🧭 Navigation

### 🎨 **Composants Frontend**
- **[Accueil Frontend](../../README.md)** - Vue d'ensemble du dashboard
- **[Composants Charts](../charts/README.md)** - Graphiques SVG performants
- **[Composants Widgets](../widgets/README.md)** - Métriques et KPIs
- **[Composants Layout](../layout/README.md)** - Mise en page responsive
- **[Composants Forms](../forms/README.md)** - Formulaires génériques
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
