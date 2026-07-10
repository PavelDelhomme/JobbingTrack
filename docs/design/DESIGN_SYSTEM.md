# Design system JobbingTrack — feedback & thèmes

Dernière mise à jour : 10 juillet 2026

## Objectif (BL-26-33)

Unifier les états visuels (info, succès, avertissement, erreur) entre backoffice, pages publiques et outils internes, avec **thème clair / sombre** fiable et faible coût (CSS variables, pas de recalcul JS par composant).

## Thème clair / sombre (web)

| Couche | Fichier | Rôle |
|--------|---------|------|
| Provider | `src/lib/hooks/theme.tsx` | `light` / `dark` / `system`, classe `dark` sur `<html>` |
| Tokens UI | `src/lib/ui/preferences/tokens.ts` | `--jt-primary`, `--jt-accent` |
| Personnalisation | `src/lib/ui/preferences/apply.ts` | Applique thème + accessibilité sur `<html>` |
| Feedback sémantique | `src/styles/semantic-feedback.css` | Couleurs alerte par `data-jt-tone` |

**Bascule** : menu utilisateur backoffice (AdminLayout) ou `SettingsPopup` → même stockage `localStorage.theme`.

## Composant canonique — `StatusAlert`

```tsx
import { StatusAlert } from "@/lib/ui/feedback";

<StatusAlert tone="warning" title="Réinstallation recommandée">
  SM-G990B2 : v1.0.21 ≠ APK v1.0.24+24…
</StatusAlert>
```

Tons : `neutral` | `info` | `success` | `warning` | `critical`

**À privilégier** plutôt que `bg-amber-100` + `dark:text-*` dans `.backoffice-content` (conflits avec `globals.css`).

## Correctif global legacy

`src/app/globals.css` — règles `html.dark .backoffice-content` pour les anciennes cartes Tailwind `bg-*-50/100` (ambre, bleu, vert, rouge) tant que la migration n’est pas terminée.

## Application mobile Flutter

Thème Flutter reste dans `mobile/lib/main.dart` (`ThemeData`, `useMaterial3`).  
Mapping cible (à aligner progressivement) :

| Web `data-jt-tone` | Flutter (Material 3) |
|--------------------|----------------------|
| info | `colorScheme.primaryContainer` |
| success | teinte verte dédiée |
| warning | `Colors.amber` / container sombre |
| critical | `colorScheme.errorContainer` |

## Migration progressive

1. **OTA / Mobile releases** — `StatusAlert` ✅
2. Pages backoffice avec cartes ambre/bleu ad hoc → remplacer par `StatusAlert`
3. `src/components/ui/alert.tsx` — étendre les variants vers les tons sémantiques
4. Flutter — tokens partagés documentés + `ThemeExtension` (post étape 2)

## Performance

- Pas de hook thème par alerte : classes CSS + `data-jt-tone` uniquement
- Pas d’images / pas de librairie chart pour les alertes
- Compatible `reduce-motion` et `high-contrast` (voir `semantic-feedback.css`)
