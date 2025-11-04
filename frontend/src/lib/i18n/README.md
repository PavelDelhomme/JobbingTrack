# Système d'Internationalisation (i18n)

Ce dossier contient le système d'internationalisation complet de JobbingTrack.

## Structure

```
i18n/
├── locales/
│   ├── fr.ts        # Traductions françaises
│   ├── en.ts        # Traductions anglaises
│   ├── es.ts        # Traductions espagnoles (à venir)
│   └── de.ts        # Traductions allemandes (à venir)
├── index.ts         # Exports principaux
└── README.md        # Cette documentation
```

## Utilisation

### Dans un composant React

```typescript
import { useTranslation } from '@/lib/hooks/useTranslation'

function MyComponent() {
  const { t, locale, setLocale } = useTranslation()

  return (
    <div>
      <h1>{t('common.welcome')}</h1>
      <p>{t('dashboard.title')}</p>
      
      {/* Changer la langue */}
      <button onClick={() => setLocale('en')}>English</button>
      <button onClick={() => setLocale('fr')}>Français</button>
    </div>
  )
}
```

### Avec des paramètres dynamiques

```typescript
// Dans le fichier de traduction
{
  welcome: 'Bienvenue {name} !'
}

// Dans le composant
{t('common.welcome', { name: 'Alice' })}
// Résultat : "Bienvenue Alice !"
```

### Accéder directement aux traductions

```typescript
const { translations } = useTranslation()
console.log(translations.common.save) // "Sauvegarder"
```

## Ajouter une nouvelle langue

1. Créer un nouveau fichier dans `locales/` (ex: `es.ts` pour l'espagnol)
2. Copier la structure de `fr.ts` ou `en.ts`
3. Traduire toutes les clés
4. Importer et exporter dans `index.ts`:

```typescript
import { es } from './locales/es'

export const translations = {
  fr,
  en,
  es, // Ajouter ici
} as const
```

5. Ajouter l'option dans les paramètres (`settings/page.tsx`)

## Ajouter de nouvelles traductions

1. Ajouter la clé dans **tous** les fichiers de langue pour maintenir la cohérence
2. Utiliser une structure imbriquée logique:

```typescript
export const fr = {
  common: {
    // Éléments communs à toute l'app
  },
  dashboard: {
    // Spécifique au dashboard
  },
  settings: {
    // Spécifique aux paramètres
  },
}
```

## Bonnes pratiques

1. **Utilisez des clés descriptives** : `settings.theme` plutôt que `s.t`
2. **Organisez logiquement** : Groupez les traductions par feature/page
3. **Maintenez la cohérence** : Toutes les langues doivent avoir les mêmes clés
4. **Paramétrez intelligemment** : Utilisez `{variable}` pour les valeurs dynamiques
5. **Testez dans toutes les langues** : Vérifiez que les traductions s'affichent correctement

## TypeScript Support

Le système est complètement typé! Vous aurez l'autocomplétion pour :
- Les clés de traduction
- Les langues disponibles
- Les paramètres dynamiques

```typescript
// ✅ TypeScript vous aidera
t('settings.theme') // Autocomplétion !

// ❌ Erreur TypeScript
t('settings.themeInvalid') // Clé invalide détectée
```

## Persistence

- La langue sélectionnée est automatiquement sauvegardée dans `localStorage`
- Elle est synchronisée avec les paramètres de personnalisation
- Au chargement, l'ordre de priorité est:
  1. Langue sauvegardée dans les paramètres
  2. Langue du navigateur
  3. Français (par défaut)

## Intégration avec useCustomization

Le système d'i18n est intégré avec `useCustomization`:
- Changer la langue met à jour les paramètres
- Les paramètres persistent sur le serveur (si authentifié)
- La langue s'applique à tout le DOM (`lang` attribute)

## Exemples

### Page settings

```typescript
// Titre traduit
<h1>{t('settings.title')}</h1>

// Select avec options traduites
<Select value={locale} onValueChange={setLocale}>
  <SelectItem value="fr">{t('settings.languageFr')}</SelectItem>
  <SelectItem value="en">{t('settings.languageEn')}</SelectItem>
</Select>
```

### Messages dynamiques

```typescript
// Traduction : "Mis à jour il y a {count} minutes"
t('dashboard.updatedMinutesAgo', { minutes: 5 })
// Résultat : "Mis à jour il y a 5 minutes"
```

## Support

Pour toute question ou problème avec l'i18n, consultez:
- `hooks/useTranslation.ts` - La logique principale
- `locales/*.ts` - Les fichiers de traduction
- Les composants existants pour des exemples d'utilisation

