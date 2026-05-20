# `@/lib/ui` — moteur UI (en cours)

Point d’entrée du futur moteur de personnalisation / layout.

**Spécification** : [`docs/frontend/UI_MOTOR.md`](../../../docs/frontend/UI_MOTOR.md)

Structure actuelle :

```
lib/ui/
  UiPreferencesContext.tsx   # provider + useUiPreferences
  preferences/               # schéma v1, customization, storage, api, apply
  feedback/                  # PageLoader, SectionLoader, TableSkeleton…
  layouts/                   # registry dashboard + useDashboardLayout
  surfaces.ts                # uiSurfaces, uiText, uiEmpty
  index.ts                   # exports publics
```

Le thème document (`dark`) reste dans `@/lib/hooks/theme` ; `applyCustomizationToDom` synchronise le choix « auto/light/dark » des Paramètres.

Ne pas ajouter de logique métier monitoring/sécurité ici — uniquement préférences d’affichage transverses.
