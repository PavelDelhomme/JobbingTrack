# Pilotage JobbingTrack

Dernière mise à jour : 22 juin 2026 (phase post-D8 + mobile)

## Phase post-D8 — nettoyage global (gate obligatoire)

**Ne pas attaquer ce chantier avant** que le hub tests backoffice (§ D8), les scripts `scripts/mobile/` + `tools/adb-lib` + émulateur, et la matrice tests admin soient **terminés et validés porteur**.

Ensuite, **obligatoire avant production** :

1. **Lot H — Hygiène dépôt** (`docs/TODOS.md` § H1–H6) : réorganisation `scripts/`, `tests/`, `tools/`, docs obsolètes, doublons.
2. **Lot E — Documentation** : revue complète des `.md` pour refléter l’état réel (mobile, hub tests, env, déploiement).
3. **Audit secrets** : aucune valeur sensible en clair hors `.env` / `.env.example` (placeholders uniquement) — scripts, code, docs, rapports, variables Compose. S’appuyer sur `scripts/security/secrets-scan.sh`, ggshield, revue manuelle `TEST_*` / SMTP / JWT.
4. **Gate** : `A_VALIDER_AVANT_PRODUCTION.md` + validation porteur explicite.

Voir aussi `docs/BACKLOG.md` § « Post-D8 hygiène ».

## Réorientation produit — 17/06 (décision porteur)

Le backoffice Statistics/Performances a atteint un niveau suffisant pour la validation courante (log-stats ✅, app-data ✅, overview partiellement OK avec correctifs graphes).

**Priorité immédiate** : **application mobile complète** (Lot D) plutôt que la suite Lot A graphes backoffice.

Ordre cible :

1. **Mobile** — parcours app, écrans métier, auth/API, interactions BDD, déploiements, mises à jour.
2. **Analytics utilisateur** — événements mobile/app, remontée correcte, corrélation backoffice (`/user-analytics`, D4/D5).
3. **Déploiement mobile** — builds, config env, pipeline préprod/prod (lot H partiel).
4. **Backoffice** — validations restantes `TODOS_A_VALIDER.md` en file secondaire (une ligne à la fois après mobile).

Les lignes Statistics **Lot A graphes** et **shell** restent dans `TODOS_A_VALIDER.md` mais **ne bloquent plus** le chantier mobile.

## Pause infra — courte (appliquée le 15/06)

**15/06** : incident Postgres `too many clients already` confirmé sur stack locale full. Actions courtes **faites** :

1. Recreate `postgres` → `max_connections=200` (`POSTGRES_MAX_CONNECTIONS`, Compose).
2. `pg_stat_activity` au repos **~5–18** connexions sur **200** (< 10 %).
3. Recreate `jobbingtrack-metrics-aggregator` → `/persistence/stats` via singleton `getPersistenceTableStats()` ; burst **20/20 OK**.
4. **Reste** : `connection_limit` Prisma par service (dette `docs/BACKLOG.md`).

**Versionnement** : système de versions produit à reprendre (semver, CHANGELOG, tags, affichage UI) — voir `docs/BACKLOG.md` § « Système de versionnement ». Ne pas annoncer de release tant que le cadrage lot H n’est pas fait.

## Règle principale

Avant toute nouvelle tâche, lire dans cet ordre :

1. `PILOTAGE.md`
2. `TODOS_A_VALIDER.md`
3. `TODOS_A_VERIFIER.md`
4. `docs/TODOS.md`
5. `BRANCHES.md`

Tant que `TODOS_A_VALIDER.md` contient une validation porteur bloquante non résolue, ne pas avancer sur une nouvelle fonctionnalité **sauf demande explicite du porteur de valider en lot plus tard**. Mode actuel (11/06) : le porteur autorise l’agent à **préparer plusieurs lignes P1** (preuves dans `TODOS_A_VERIFIER.md`) sans archiver dans `TODOS_DONE.md` tant que le OK explicite n’est pas donné. L’ordre de `TODOS_A_VALIDER.md` reste la file de validation ; l’agent peut implémenter/corriger en parallèle les sujets déjà ouverts (P1A tests offensifs, P1B temps de réponse, P1C menu Tests/Rapports, responsive).

## Rôle des fichiers

| Fichier | Rôle |
|---------|------|
| `PILOTAGE.md` | Point d’entrée obligatoire et état du flux. |
| `TODOS_A_VALIDER.md` | Validations porteur locales/visuelles/fonctionnelles à faire avant la suite. |
| `TODOS_A_VERIFIER.md` | Vérifications techniques agent avant de demander une validation porteur. |
| `TODOS_DONE.md` | Éléments validés par le porteur, archivés proprement. |
| `docs/TODOS.md` | Backlog technique ordonné, pas une preuve de validation produit. |
| `A_VALIDER_AVANT_PRODUCTION.md` | Gate préprod/prod à exécuter après validations locales. |
| `DEPLOIEMENT_PRODUCTION.md` | Éléments préparés/déployés en préprod/prod mais pas encore validés production. |
| `VALIDATION_PRODUCTION.md` | Éléments validés en préprod/prod réelle. |
| `docs/STATUS.md` | Journal de ce qui a été fait et validé techniquement. |
| `docs/BACKLOG.md` | Idées, dettes et sujets reportés hors file courte. |
| `BRANCHES.md` | Conventions branches/commits. |

## État actuel

Dernière mise à jour : 15 juin 2026 (Services — premier correctif CPU/RAM frontend)

Statut : **validation porteur locale en cours** — P0 HTTPS, Backoffice sécurité, Rapports sécurité, comparaison CVE, menaces lab, localisation CVE, alertes email critiques et **P1C sécurité titres/libellés/navigation** validés localement. **15/06** : demande explicite porteur de reprendre **Lot A graphes** ; export CSV/JSON (`feat/monitoring-series-export`), mini-séries Services (`feat/services-history-sparklines`), Corrélation endpoint incidents (`fix/correlation-incident-context`), brush synchronisé Réseau (`feat/monitoring-brush-sync-network`) puis premier correctif CPU/RAM frontend Services (`fix/frontend-services-performance`). Playwright Performances fiable via `PLAYWRIGHT_BASE_URL=http://localhost:5003`.

Exception porteur 15/06 : lot **P1D CI/PR/déploiement** clôturé le 15/06 — PR #8 et #9 mergées, PR #7 fermée, préprod Portainer cadrée (`deploy-preprod.yml`, `VPS_PORTAINER_NPM_OVH.md` §5.1), mail récap **3/3 SENT**. Le porteur demande de continuer le **Lot B complet**, avec mail récap à chaque bloc terminé, puis d’enchaîner Lot C selon le même processus.

Priorité immédiate stricte (17/06 — réorientation porteur) :

1. **Lot D — Mobile & analytics utilisateur** : app Flutter `mobile/`, API auth/métier, interactions BDD, déploiements, remontée analytics/événements, interface complète. Voir `docs/TODOS.md` § « Priorités mobile ».
2. Validations backoffice restantes dans `TODOS_A_VALIDER.md` **après** incréments mobile significatifs, sauf correctif bloquant signalé par le porteur.
3. Déplacer les lignes validées vers `TODOS_DONE.md`.
4. Reprendre `docs/TODOS.md` backlog backoffice en file secondaire.

Ancienne priorité Lot A graphes (15/06) — **reportée** tant que le mobile n’est pas stabilisé.

## Flux de travail

1. L’agent fait une modification technique ou documentaire.
2. L’agent renseigne `TODOS_A_VERIFIER.md` pour ses preuves techniques.
3. Si le rendu ou le comportement doit être vu par le porteur, l’agent ajoute une ligne dans `TODOS_A_VALIDER.md`.
4. **Fin de lot obligatoire** : vérifier si les workflows GitHub doivent évoluer avec le lot, lancer/contrôler les checks adaptés, créer/mettre à jour une PR seulement pour les changements significatifs, puis envoyer le récap email des modifications via `notification-service` aux destinataires habituels. Ne pas avancer au lot suivant si la CI/PR du lot est cassée ou si le récap email n’est pas tracé clairement dans `TODOS_A_VERIFIER.md`.
5. Le porteur valide ou signale un problème.
6. Si validé : déplacer vers `TODOS_DONE.md`.
7. Si problème : créer ou remonter une tâche dans `docs/TODOS.md`, puis corriger avant d’avancer.
8. Pour préprod/prod : passer ensuite par `A_VALIDER_AVANT_PRODUCTION.md`, `DEPLOIEMENT_PRODUCTION.md`, puis `VALIDATION_PRODUCTION.md`.
9. **Fin de journée / avant push majeur** : gate suite complète documenté dans `TODOS_A_VALIDER.md` § « Gate technique fin de journée / avant push majeur » (`scripts/run-all-tests-with-reports.sh` + lecture `tests/results/<horodatage>/`). Ne pas le lancer au milieu d’un P0/P1 sauf demande explicite du porteur. Checklist longue : `docs/tests/TESTS_END.md`.

## Format des récaps agent

Les récapitulatifs de session pour le porteur doivent être en **HTML lisible** (sections OK / KO / en attente), pas en Markdown brut. Ne pas signer « Agent Cursor — généré automatiquement ». Voir `.cursor/rules/agent-recaps-html.mdc`.

## Branches

Suivre `BRANCHES.md` :

- `docs/...` pour organisation documentaire et pilotage.
- `fix/...` pour bug ou régression.
- `feat/...` pour nouvelle fonctionnalité.
- `security/...` pour campagne sécurité dédiée.

Ne pas mélanger validation porteur, production et nouvelle feature dans un même commit si ce n’est pas le même sujet.
