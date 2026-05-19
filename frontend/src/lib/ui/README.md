# `@/lib/ui` — moteur UI (en cours)

Point d’entrée du futur moteur de personnalisation / layout.

**Spécification** : [`docs/frontend/UI_MOTOR.md`](../../../docs/frontend/UI_MOTOR.md)

Structure prévue :

```
lib/ui/
  preferences/   # schéma, merge, migration localStorage
  theme/         # bridge ThemeProvider
  tokens/        # applyCssTokens / clearDomOverrides
  layouts/       # registry + hooks
  index.ts       # exports publics
```

Ne pas ajouter de logique métier monitoring/sécurité ici — uniquement préférences d’affichage transverses.
