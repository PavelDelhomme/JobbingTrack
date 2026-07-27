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
  kanban.ts                  # jtKanban, uiChip (colonnes sémantiques)
  index.ts                   # exports publics
```

Styles associés :

- `src/styles/semantic-feedback.css` — `StatusAlert`
- `src/styles/semantic-kanban.css` — colonnes / cartes Kanban

Le thème document (`dark`) reste dans `@/lib/hooks/theme` ; `applyCustomizationToDom` pose `--jt-primary` / `--jt-accent`.

**Règle** : dans `.backoffice-content`, éviter `bg-*-50/100` Tailwind (filet `globals.css`). Utiliser `StatusAlert`, `jtKanban` ou `uiSurfaces`.

Hooks panneaux : `useStatisticsPanelPrefs`, `useAnalyticsPanelPrefs` (remplace les clés localStorage dédiées).

Ne pas ajouter de logique métier monitoring/sécurité ici — uniquement préférences d’affichage transverses.
