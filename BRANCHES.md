# Branches et commits

Date de creation : 13 mai 2026

## Objectif

Eviter les branches et commits ambigus. Une branche doit annoncer le type de travail. Un commit doit pouvoir etre compris seul dans l'historique.

## Nommage des branches

Format recommande :

```text
<type>/<sujet-court-kebab-case>
```

Types autorises :

- `feat/` : nouvelle fonctionnalite.
- `fix/` : correction de bug ou regression.
- `docs/` : documentation, audit, plan, rapport.
- `chore/` : maintenance repository, scripts non fonctionnels, hygiene.
- `test/` : tests uniquement.
- `refactor/` : refactor sans changement fonctionnel attendu.
- `security/` : changement securite important ou campagne audit dediee.

Exemples :

- `docs/monitoring-security-audit`
- `fix/admin-login-env-password`
- `feat/security-alert-email-ui`
- `chore/reports-artifact-cleanup`
- `test/backend-service-centralization`

## Commits

Format :

```text
<type>(scope optionnel): message court
```

Types autorises :

- `feat:` nouvelle fonctionnalite.
- `fix:` correction.
- `docs:` documentation uniquement.
- `chore:` maintenance sans changement produit direct.
- `test:` ajout ou correction de tests.
- `refactor:` refactor sans changement fonctionnel.
- `misc:` changement transversal difficile a classer, a eviter si un type plus precis existe.

Scopes utiles :

- `docs`
- `monitoring`
- `security`
- `ci`
- `auth`
- `reports`
- `tests`
- `structure`
- `frontend`
- `backend`

Exemples :

- `docs(monitoring): clarify Rust migration and C legacy status`
- `docs(security): add project audit and validation register`
- `chore(reports): stop tracking generated artifacts`
- `fix(auth): secure admin credential setup`
- `test: organize scripts and test assets`

## Regles avant commit

1. Verifier `git status`.
2. Ne pas melanger des sujets sans lien direct.
3. Ne pas committer `.env`, secrets, rapports generes sensibles ou artefacts volumineux.
4. Executer une validation adaptee sans commande `make` directe si l'agent travaille dans Cursor.
5. Si un commit est uniquement documentation, utiliser `docs:`.
6. Si un changement touche code + docs pour la meme correction, choisir le type du changement principal.

## Workflows GitHub

Certains workflows se declenchent selon les chemins modifies, les branches ou les evenements GitHub. Il est normal qu'un commit de documentation ne declenche pas exactement les memes jobs qu'un commit CI/backend/frontend.

Action a faire : documenter dans `docs/ci-cd/README.md` la matrice exacte des triggers par workflow.

## Integration sur `dev`

Ordre conseille pour remettre le travail sur la branche principale de developpement :

1. Terminer la correction sur une branche prefixee (`fix/...`, `feat/...`, `docs/...`, etc.), pousser, ouvrir une PR vers **`dev`** (ou merger localement apres rebase sur `dev` si vous travaillez seul).
2. Une branche secondaire (ex. `docs/security-p0-triage`, `fix/dev-https-api-centralization`) se merge dans **`dev`** quand le sujet est clos ; eviter de melanger deux chantiers sans lien sur la meme branche (voir regles de commits ci-dessus).
3. Apres merge, supprimer la branche distante si elle ne sert plus, et tirer `dev` a jour sur les postes de travail.

Les noms de branches historiques ou experimentaux ne remplacent pas ce schema : tout finit sur **`dev`** par merge ou PR, sauf politique equipe differente documentee ailleurs.
