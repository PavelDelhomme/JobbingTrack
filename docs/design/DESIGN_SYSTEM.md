# Design system JobbingTrack — feedback, surfaces & thèmes

Dernière mise à jour : 27 juillet 2026

## Objectif (BL-26-33)

Unifier les états visuels entre backoffice, pages publiques et mobile, avec **thème clair / sombre** fiable (CSS variables / classes sémantiques, pas de pastels Tailwind `bg-*-100` ad hoc dans `.backoffice-content`).

## Thème clair / sombre (web)

| Couche | Fichier | Rôle |
|--------|---------|------|
| Provider | `src/lib/hooks/theme.tsx` | `light` / `dark` / `system`, classe `dark` sur `<html>` |
| Tokens UI | `src/lib/ui/preferences/tokens.ts` | `--jt-primary`, `--jt-accent` |
| Surfaces | `src/lib/ui/surfaces.ts` | `uiSurfaces` / `uiText` / `uiEmpty` |
| Feedback | `src/styles/semantic-feedback.css` + `StatusAlert` | Tons `data-jt-tone` |
| Kanban | `src/styles/semantic-kanban.css` + `jtKanban` | Colonnes `data-jt-kanban` |

**Bascule** : menu utilisateur backoffice (AdminLayout) ou `SettingsPopup` → `localStorage.theme`.

## Composants canoniques

### `StatusAlert`

```tsx
import { StatusAlert } from "@/lib/ui/feedback";

<StatusAlert tone="warning" title="Réinstallation recommandée">
  …
</StatusAlert>
```

Tons : `neutral` | `info` | `success` | `warning` | `critical`

### Surfaces (`uiSurfaces` / `uiText`)

Panels, onglets, chips, inputs, boutons — classes dark-ready partagées.

### Kanban (`jtKanban` / `uiChip`)

```tsx
import { jtKanban, uiChip } from "@/lib/ui";

<section data-jt-kanban="doing" className={jtKanban.col}>…</section>
```

**À privilégier** plutôt que `bg-amber-100` + `dark:bg-*` (conflits avec le filet `globals.css` `!important`).

## Correctif global legacy

`src/app/globals.css` — règles `html.dark .backoffice-content` pour anciennes cartes Tailwind `bg-*-50/100`.  
Opt-out : `.jt-status-alert`, `.jt-kanban-col`, `.jt-kanban-card`, `.jt-kanban-focus`.

## Application mobile Flutter

| App | État |
|-----|------|
| `flutter-mobile-app/lib/core/` | Kit UI centralisé (proto) |
| `mobile/` | Prod — à aligner progressivement sur les mêmes tons |

| Web `data-jt-tone` | Flutter (Material 3) |
|--------------------|----------------------|
| info | `colorScheme.primaryContainer` |
| success | teinte verte dédiée |
| warning | `Colors.amber` / container sombre |
| critical | `colorScheme.errorContainer` |

## Migration progressive

1. **OTA / Mobile releases** — `StatusAlert` ✅
2. **Pilotage Kanban** — `jtKanban` + `uiSurfaces` ✅ (27/07)
3. Pages backoffice restantes avec pastels ad hoc → `StatusAlert` / `uiSurfaces`
4. `src/components/ui/alert.tsx` — variants sémantiques
5. Flutter prod (`mobile/`) — tokens + `ThemeExtension`

## Performance

- Pas de hook thème par alerte/colonne : CSS + `data-*` uniquement
- Compatible `reduce-motion` / `high-contrast`
