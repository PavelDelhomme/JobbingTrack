# TRAITER_IMMEDIATEMENT — procédure agent JobbingTrack

**À lire en début de chaque nouvelle demande utilisateur** (conversation Cursor ou agent).

Dernière mise à jour : 2 juillet 2026 (phases B mobile + C déploiement en parallèle).

---

## 0. Feuille de route (juillet 2026)

| Phase | Agent peut travailler ? | Contenu |
|-------|-------------------------|---------|
| **A — Mobile Lot D** | **Oui — smokes / correctifs** | Parcours Flutter, hub admin, FAB, agent `/agent` |
| **B — Gate pré-prod mobile** | **Porteur en cours** | Validations porteur étapes **1→5** — **étape 2 active** (ligne 320) |
| **C — Déploiement VPS / OTA** | **Préparé agent — porteur VPS** | Stack Portainer, NPM, releases backoffice — **en parallèle de B** |
| **D — Post-D8 / triage** | **Clos (H0–H2)** | Lot H réorg scripts/docs — merge `dev` |
| **E — Plateforme admin OSS** | **Non — bloqué** | Après prod stable (A+B+C + gate) |

Checklist porteur déploiement : [`../production/PORTEUR_ACTIONS_DEPLOIEMENT.md`](../production/PORTEUR_ACTIONS_DEPLOIEMENT.md).

Détail : `PILOTAGE.md` + `TODOS.md` § « Feuille de route ».

---

## 1. Fichiers de pilotage (ordre de lecture)

| Ordre | Fichier | Rôle |
|------|---------|------|
| 1 | **`PILOTAGE.md`** | Source de vérité du flux et règle bloquante |
| 2 | **`TODOS_A_VALIDER.md`** | Ce que le **porteur** doit valider manuellement |
| 3 | **`TODOS_A_VERIFIER.md`** | Ce que l’agent doit vérifier techniquement |
| 4 | **[`TODOS.md`](TODOS.md)** | Backlog technique ordonné |
| 5 | **[`../project/PLAN.md`](../project/PLAN.md)** / **[`../STATUS.md`](../STATUS.md)** | Phases, état et journal |
| 6 | **[`../troubleshooting/ERRORS.md`](../troubleshooting/ERRORS.md)** | Erreurs connues et pièges |
| 7 | **`docs/development/BRANCHES.md`** | Conventions Git |

Thèmes détaillés : `docs/operations/DEV_HTTPS.md`, `docs/configuration/STRICT_ENV.md`, `docs/security/README.md`, `docs/security/STATS.md`.

---

## 2. Checklist avant de traiter un message

Cocher mentalement (ou dans la réponse si utile) :

- [ ] **Pilotage** : phase **B mobile étape 2** (ligne 320) — ne pas sauter les validations porteur ; **Phase C déploiement** peut avancer en parallèle côté porteur (`PORTEUR_ACTIONS_DEPLOIEMENT.md`).
- [ ] **Pilotage** : si `TODOS_A_VALIDER.md` contient une ligne Lot D ouverte, la traiter avant toute nouvelle feature hors phase A.
- [ ] **Branche** : `git branch --show-current` — respecter `docs/development/BRANCHES.md` (`docs/...`, `fix/...`, `feat/...`, `security/...`) et finir sur `dev`.
- [ ] **Périmètre** : une demande = un objectif ; pas de refactor hors sujet.
- [ ] **Secrets** : ne jamais committer `.env`, mots de passe, tokens ; ne pas recopier `ADMIN_PASSWORD` dans le chat.
- [ ] **Make** : ne pas exécuter `make …` sauf demande explicite — utiliser scripts / `docker compose` / `npm` / `cargo` (règle workspace).
- [ ] **Frontend** : si touché → `npm run type-check` et `npm run lint` dans `frontend/`.
- [ ] **Sécurité** : pas de bypass WAF/TLS en prod ; dev HTTPS = `https://jobbingtrack.localhost:5443` + `https://api.jobbingtrack.localhost:5443`.
- [ ] **Fin de tâche** : mettre à jour `TODOS_A_VERIFIER.md`, `TODOS_A_VALIDER.md`, `TODOS_DONE.md` ou [`TODOS.md`](TODOS.md) selon le cas.

---

## 3. Procédure détaillée (chaque requête)

### A. Comprendre

1. Relire le message à la lumière de l’**historique** de la conversation.
2. Identifier : bug, feature, doc, Git, déploiement, sécurité.
3. Si ambigu → une question courte ; sinon avancer avec la branche la plus logique.

### B. Explorer

1. Chercher dans le code (`rg`, recherche sémantique) — pas deviner.
2. Lire le fichier **avant** de modifier (style, patterns existants).
3. Vérifier logs / conteneurs si le sujet est runtime (`docker ps`, `docker logs`, `curl`).

### C. Implémenter

1. Changement **minimal** et testable.
2. Réutiliser config centralisée : `frontend/src/config/ports.config.ts`, `FRONTEND_URLS.api`, pas d’URL en dur.
3. Admin : identifiants = `ADMIN_EMAIL` / `ADMIN_PASSWORD` dans `.env` ; resync : `bash backend/scripts/database/create-admin-user.sh`.

### D. Valider (agent)

| Zone | Commande typique |
|------|------------------|
| Frontend | `cd frontend && npm run type-check && npm run lint` |
| Gateway | tests Jest du service si modifié |
| Rust monitoring | `cargo check` dans `monitoring/rust` |
| HTTPS smoke | `curl -kfsS https://jobbingtrack.localhost:5443/login` et login API sur `api.…:5443` |
| Compose | `docker compose … config` (syntaxe) |

Ne pas marquer « validé porteur » dans `PLAN.md` sans validation explicite. Après validation, déplacer la ligne de `TODOS_A_VALIDER.md` vers `TODOS_DONE.md`, puis reporter l’information utile dans `STATUS.md` / `PLAN.md`.

### E. Git (si demandé)

1. `git status` + `git diff` — **exclure** `frontend/.next-local/`, artefacts build.
2. Commits **atomiques** (un thème = un commit), messages en anglais impératif : `fix(scope): …`, `feat(scope): …`, `docs(scope): …`.
3. Branche cible finale : **`dev`**. Créer une branche préfixée seulement si le travail mérite PR séparée.
4. `git push` seulement si l’utilisateur l’a demandé dans le flux courant.

### F. Répondre

1. Français, clair, proportionné.
2. Dire ce qui a été **vérifié** (commande réelle) vs ce que le **porteur** doit encore valider.
3. Lien vers `TODOS_A_VALIDER.md` pour la validation manuelle.

---

## 4. Branches Git (état attendu mai 2026)

| Branche | Usage |
|---------|--------|
| `dev` | Intégration active du projet |
| `docs/...` | Documentation, pilotage, audit |
| `fix/...` | Correction d’un problème validé ou remonté par le porteur |
| `feat/...` | Nouvelle fonctionnalité seulement quand la validation porteur bloquante est vide |
| `security/...` | Campagne sécurité dédiée |

Workflow recommandé :

1. Vérifier `TODOS_A_VALIDER.md`.
2. Travailler sur une branche préfixée si nécessaire, sinon sur `dev` pour les petits correctifs docs validés.
3. Commit atomique.
4. Push uniquement si demandé.
5. Ne pas écraser le travail : pas de `reset --hard` sans accord explicite.

---

## 5. Sécurité (rappels non négociables)

- **HTTPS dev** : front `https://jobbingtrack.localhost:5443`, API `https://api.jobbingtrack.localhost:5443` — jamais `https://…:5002` (HTTP seul → `ERR_SSL_PROTOCOL_ERROR`).
- **Intrusion / DoS** : en dev, IP Docker (`172.19.0.x`) + JWT Bearer ne doivent pas spammer « INTRUSION ÉLEVÉE » sur le backoffice (voir `intrusionDetector.js`).
- **Logs console navigateur** ≠ logs backoffice ; échecs login serveur → `security_logs` si security-service up.
- **WAF** : tests offensifs seulement en lab (`docs/security/ACTIVATION_WAF.md`, scripts `scripts/security/`).

---

## 6. Forcer l’agent à suivre cette liste (utilisateur)

1. **Règle Cursor** : `.cursor/rules/pilotage-validation.mdc` impose la lecture du pilotage.
2. **Première phrase possible** : « Suis `PILOTAGE.md` ».
3. **@ fichier** : `@PILOTAGE.md` ou `@TRAITER_IMMEDIATEMENT.md` dans le chat.

---

## 7. Historique / reprise de session

Si l’agent « perd » le contexte :

1. Lire `PILOTAGE.md`, `TODOS_A_VALIDER.md`, `TODOS_A_VERIFIER.md`, puis [`TODOS.md`](TODOS.md).
2. `git status` et branche courante.
3. Reprendre uniquement la première validation bloquante ouverte.

---

## 8. Liens rapides validation porteur

- Login HTTPS : `https://jobbingtrack.localhost:5443/login`
- Backoffice : `https://jobbingtrack.localhost:5443/backoffice`
- Sécurité : `https://jobbingtrack.localhost:5443/backoffice/security`
- Pilotage : **`PILOTAGE.md`**
- Registre validation : **`TODOS_A_VALIDER.md`**
