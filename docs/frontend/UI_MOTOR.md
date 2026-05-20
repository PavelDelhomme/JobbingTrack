# Moteur UI JobbingTrack (`feat/ui-motor`)

**Objectif** : remplacer l’empilement actuel (`useCustomization`, `customization.css`, clés localStorage multiples) par un **moteur unique**, performant et réutilisable pour tout le frontend admin/backoffice.

## Problèmes actuels (baseline)

| Symptôme | Cause |
|----------|--------|
| Voile / sepia en dark | `offline-mode { opacity }`, `high-contrast { filter }`, transitions `*` globales |
| Deux systèmes de thème | `localStorage.theme` (ThemeProvider) vs `customization-settings.theme` |
| Personnalisation non portable | Statistics / Analytics ont leurs propres clés localStorage |
| Peu réutilisable | pas de design tokens centralisés ni de registry de layouts |

**Correctif court (19/05, sur `dev`)** : assainissement CSS + sync ThemeProvider — **ne remplace pas** ce moteur.

## Principes du moteur cible

1. **Une source de vérité** — schéma `UserUiPreferences` versionné (`v1`), stocké API + cache local.
2. **Application sans reflow inutile** — `requestAnimationFrame` + batch des variables CSS sur `document.documentElement` ; pas de `filter` / `opacity` sur `:root`.
3. **Thème = ThemeProvider** — le moteur ne duplique pas `dark` ; il appelle `setThemeMode` / lit `actualTheme`.
4. **Tokens limités** — `--jt-primary`, `--jt-accent`, densité, rayon ; **pas** de génération `--primary-50…900` sur tout le site.
5. **Layouts déclaratifs** — registry `{ id, component, defaultProps }` pour dashboard / statistics / listes.
6. **Réutilisabilité** — package interne `frontend/src/lib/ui/` :
   - `preferences/` — schéma, merge, migration
   - `theme/` — bridge ThemeProvider
   - `tokens/` — apply / clear DOM
   - `layouts/` — registry + hooks `useLayoutSlot`
   - `components/` — primitives métier (KPI row, panel chrome) au-dessus de `@/components/ui`

## Performance

- Pas de subscription globale : `useSyncExternalStore` ou contexte scindé (theme | layout | a11y).
- Application différée : ne réécrire que les clés modifiées.
- Pas de transition CSS globale sur `*` ; `prefers-reduced-motion` natif + flag utilisateur.
- Lazy : panneaux de préférences en `dynamic()`.

## Plan d’implémentation (ordre)

1. **Schéma + migrations** — `UserUiPreferencesV1`, migrer `customization-settings` / `theme`.
2. **`UiPreferencesProvider`** — **en place** : `UiPreferencesContext` (load local v1 + legacy + API, `saveCustomization`, `resetAll`, `applyCustomizationToDom`) ; `useCustomization` = pont legacy.
3. **Page Paramètres** — `SectionLoader` dark ; reset/save via contexte ; merge `notifications.duration` sécurisé.
4. **Panneaux Statistics/Analytics** — **fait** : `panels.statistics` / `panels.analytics` dans v1, hooks `useStatisticsPanelPrefs` / `useAnalyticsPanelPrefs`, migration localStorage legacy.
5. **Layouts registry** — **fait** : `DashboardLayoutRegion` + variantes (`metrics`, `section`, `dense`, `triple`, `split`) sur dashboard backoffice et Statistics ; changement via Paramètres → disposition tableau de bord.
6. **Tokens** — **fait** : `--jt-primary`, `--jt-accent` (apply.ts) ; palette `.theme-custom` réduite (plus de 50–900 dynamiques sur `:root`).
6. **Doc composants** — quand utiliser `@/components/ui` vs `@/lib/ui`.

## Hors scope immédiat (branches suivantes)

- Statistics / backoffice : réutilisation KPI (`ServiceHealthKpiCards`) — branche dédiée après moteur.
- Onglets Statistics sécurité / logs alignés `aggregated_logs` — idem.

## Références code

- Thème actuel : `frontend/src/lib/hooks/theme.tsx`
- Legacy (à déprécier) : `frontend/src/hooks/useCustomization.ts`, `frontend/src/styles/customization.css`
- Dette suivie : `docs/TODOS.md` § moteur personnalisation
