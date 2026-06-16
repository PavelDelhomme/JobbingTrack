# Audit GitHub Actions — 15/06/2026

## Constat

Le blocage CI vu sur GitHub ne venait pas d'une absence totale de workflows actifs. Le workflow principal `CI/CD Pipeline - JobbingTrack` se lançait, mais échouait au job `Analyse de la qualite du code`.

Cause directe reproduite localement :

- `npx prettier --check "src/**/*.{ts,tsx,js,css,md}" "public/**/*.{html,js,css}" "*.{js,json,md,ts}"` échouait sur 75 fichiers frontend.
- Comme `Tests Backend`, `Tests Frontend`, intégration système et performance dépendaient de `code-quality`, ils étaient ensuite marqués `skipped`.

Autres problèmes trouvés :

- PR #7 était ouverte et `CONFLICTING` (`fix/security-cve-scan-full-scope` vers `dev`) — **fermée** le 15/06, remplacée par **PR #9** mergée (`e6e5cb90`).
- Plusieurs workflows ciblaient encore `develop` alors que la branche de vie locale est `dev`.
- `security-audit.yml` ne couvrait pas les branches `security/**` ni `fix/security-*`.
- Le workflow appelait des projets Playwright mobiles inexistants (`Mobile Chrome`, `Mobile Safari`) dans la config par défaut.
- Le script `test:a11y` cherchait `@accessibility`, alors que la spec existante est `tests/e2e/accessibility.spec.ts`.
- Des `|| echo` masquaient des échecs E2E mobile/accessibilité au lieu de faire échouer le job.
- Deux étapes backend étaient mortes (`if: ${{ false }}`), donc elles donnaient une fausse impression de tests prévus mais jamais exécutés.
- Localement, Jest échouait ensuite sur `jest: failed to cache transform results in: /tmp/jest_rs/...` avec `Unknown system error -122, write`, même symptôme d'écriture dans `/tmp`/quota que le crash Playwright.

## Correctifs appliqués

- Formatage Prettier appliqué sur le périmètre exact de la CI.
- `ci-cd.yml` déclenche désormais sur `dev`, `main` et les familles de branches du projet (`feat/**`, `fix/**`, `security/**`, `docs/**`, `test/**`, `chore/**`, `refactor/**`, etc.).
- `ci-cd.yml` supporte aussi `workflow_dispatch`.
- `database-validation.yml` et `deploy-dev.yml` sont alignés sur `dev`.
- `security-audit.yml` couvre `fix/security-*` et `security/**`.
- Les E2E mobile ciblent maintenant `tests/e2e/mobile/mobile-auth.spec.ts` via `playwright.mobile.config.ts` et le projet réel `iPhone 13 Pro`, avec `FRONTEND_URL=http://localhost:3000` pour le runner GitHub.
- L'accessibilité cible maintenant `tests/e2e/accessibility.spec.ts` avec le projet `no-auth`.
- Les masquages `|| echo` sur ces tests ont été retirés.
- Les étapes mortes `if: ${{ false }}` ont été retirées du workflow principal.
- Jest écrit désormais son cache dans `frontend/.tmp-jest` via `frontend/jest.config.js`; le dossier est ignoré par Git et Prettier.

## Validations locales

Commandes directes, sans `make` :

- Prettier frontend, même périmètre que GitHub Actions : OK.
- TypeScript frontend `./node_modules/.bin/tsc --noEmit` : OK.
- ESLint frontend erreurs seulement `./node_modules/.bin/eslint src --ext .js,.jsx,.ts,.tsx --quiet` : OK.
- Jest frontend CI `npm run test:ci -- --runInBand` : **40 suites / 175 tests OK** après bascule du cache hors `/tmp`.
- Parsing YAML des workflows `.github/workflows/*.yml` : OK.
- Recherche des anciens pièges (`develop`, `refs/heads/develop`, `Mobile Chrome`, `Mobile Safari`, `test:a11y`, masquages E2E ciblés, `if: ${{ false }}`) : aucun match restant.

## Limites restantes

- Les warnings locaux `write failed: débordement du quota d'espace disque` et `dump_zsh_state` viennent de l'environnement shell local, pas des workflows GitHub. Le disque racine n'est pas plein, mais `/tmp` reste haut (~80 %). Les caches Playwright et Jest sont maintenant forcés hors `/tmp`; continuer à appliquer cette règle aux futurs outils qui écrivent beaucoup.
- Les workflows de déploiement `deploy-dev`, `deploy-preprod`, `deploy-prod` restent des placeholders tant que les secrets `*_DEPLOY_URL` ne sont pas configurés sur le VPS ; la stratégie préprod sans Portainer Business est documentée dans `docs/deployment/VPS_PORTAINER_NPM_OVH.md` §5.1 et `deploy-preprod.yml`.
- PR #7 / PR #9 : résolu le 15/06 — PR #9 apporte le scan CVE full-scope et les jobs pollés backoffice.
