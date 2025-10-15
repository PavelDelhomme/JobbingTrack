# 📝 Forms - Composants de Formulaire

Composants de formulaire génériques et réutilisables pour créer des interfaces de saisie cohérentes.

## 📁 Composants Disponibles

### FormModal
Modale de formulaire configurable avec overlay et actions intégrées.
```tsx
import { FormModal } from '@/components/forms'

<FormModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Créer une candidature"
  loading={isSubmitting}
>
  {/* Contenu du formulaire */}
</FormModal>
```

### FormField
Champ de formulaire générique supportant tous les types de saisie.
```tsx
import { FormField } from '@/components/forms'

<FormField
  type="text"
  label="Nom de l'entreprise"
  name="companyName"
  value={formData.companyName}
  onChange={(value) => setFormData({...formData, companyName: value})}
  required
  placeholder="Ex: TechCorp"
/>
```

## 🎯 Types de Champs Supportés

### Textes et Saisie
- `text` : Champ texte simple
- `email` : Champ email avec validation
- `password` : Champ mot de passe masqué
- `number` : Champ numérique
- `tel` : Champ téléphone
- `url` : Champ URL avec validation
- `textarea` : Zone de texte multiligne

### Sélection
- `select` : Liste déroulante avec options
- `switch` : Interrupteur marche/arrêt

## 🎨 Fonctionnalités

### Validation Intégrée
- **Champs requis** : Indicateur visuel avec astérisque
- **Messages d'aide** : Descriptions sous les champs
- **États d'erreur** : Styles et messages d'erreur
- **Validation temps réel** : Feedback immédiat

### Accessibilité
- **Labels associés** : Navigation clavier optimale
- **Descriptions ARIA** : Support screen readers
- **États focus** : Indicateurs visuels clairs
- **Navigation tabulation** : Ordre logique des champs

### Responsive
- **Largeur automatique** : Adaptation au conteneur
- **Mobile-friendly** : Tactile optimisé
- **Breakpoints** : Comportement adapté aux écrans

## 🚀 Utilisation Avancée

### Configuration des Champs
```typescript
interface FieldConfig {
  type: 'text' | 'email' | 'select' | 'textarea' | 'switch'
  label: string           // Libellé affiché
  name: string           // Nom du champ
  value: any             // Valeur actuelle
  onChange: (value: any) => void  // Gestionnaire de changement
  required?: boolean     // Champ obligatoire
  placeholder?: string   // Texte d'aide
  disabled?: boolean     // Champ désactivé
  description?: string   // Description sous le champ
  options?: Array<{     // Pour les selects
    label: string
    value: string
  }>
}
```

### Modales Configurables
```typescript
interface ModalConfig {
  isOpen: boolean        // Contrôle d'ouverture
  onClose: () => void    // Fermeture
  title: string         // Titre de la modale
  size?: 'sm' | 'md' | 'lg' | 'xl'  // Taille
  loading?: boolean     // État de chargement
  onSubmit?: () => void // Soumission optionnelle
}
```

## 🎨 Personnalisation

### Styles CSS
- **Classes Tailwind** : Support complet des classes utilitaires
- **Thème automatique** : Adaptation sombre/clair
- **Animations** : Transitions fluides intégrées
- **Focus states** : Indicateurs d'accessibilité

### Étendabilité
- **Props personnalisées** : Extension facile des composants
- **Slots enfants** : Contenu flexible dans les modales
- **Callbacks** : Gestionnaires d'événements personnalisés

## 🚀 Performance

- **Composants optimisés** : Pas de dépendances externes inutiles
- **Re-renders minimisés** : Gestion fine des mises à jour
- **Bundle léger** : Taille minimale d'ajout
- **CSS-in-JS** : Styles intégrés pour éviter les conflits

## 🔧 Intégration

### Avec React Hook Form
```tsx
import { useForm } from 'react-hook-form'

function MyForm() {
  const { register, handleSubmit } = useForm()

  return (
    <FormModal title="Mon Formulaire">
      <FormField
        type="text"
        label="Nom"
        {...register('name', { required: true })}
      />
    </FormModal>
  )
}
```

### Avec Zustand
```tsx
import { useFormStore } from '@/stores/formStore'

function MyForm() {
  const { formData, updateField } = useFormStore()

  return (
    <FormField
      type="text"
      label="Email"
      value={formData.email}
      onChange={(value) => updateField('email', value)}
    />
  )
}
```

---

## 🧭 Navigation

### 🎨 **Composants Frontend**
- **[Accueil Frontend](../../README.md)** - Vue d'ensemble du dashboard
- **[Composants Charts](../charts/README.md)** - Graphiques SVG performants
- **[Composants Widgets](../widgets/README.md)** - Métriques et KPIs
- **[Composants Layout](../layout/README.md)** - Mise en page responsive
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
