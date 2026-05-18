# TRAITER_IMMEDIATEMENT — procédure agent JobbingTrack

**À lire en début de chaque nouvelle demande utilisateur** (conversation Cursor ou agent).

Dernière mise à jour : 18 mai 2026.

---

## 1. Fichiers de pilotage (ordre de lecture)

| Ordre | Fichier | Rôle |
|------|---------|------|
| 1 | **`TRAITER_IMMEDIATEMENT.md`** (ce fichier) | Procédure obligatoire |
| 2 | **`A_VALIDER_VERIFIER.md`** | Ce que le **porteur** doit valider manuellement (pas coché par l’agent seul) |
| 3 | **`docs/TODOS.md`** | Priorités techniques, chantier en cours |
| 4 | **`docs/PLAN.md`** / **`docs/STATUS.md`** | Phases, validation porteur datée |
| 5 | **`docs/ERRORS.md`** | Erreurs connues et résolutions |
| 6 | **`BRANCHES.md`** | Conventions Git (si présent) |

Thèmes détaillés : `docs/operations/DEV_HTTPS.md`, `docs/configuration/STRICT_ENV.md`, `docs/security/README.md`, `docs/security/STATS.md`.

---

## 2. Checklist avant de traiter un message

Cocher mentalement (ou dans la réponse si utile) :

- [ ] **Branche** : `git branch --show-current` — travailler sur la branche demandée (souvent `fix/dev-https-api-centralization` pour HTTPS/API ; `docs/security-p0-triage` pour doc sécurité seule).
- [ ] **Périmètre** : une demande = un objectif ; pas de refactor hors sujet.
- [ ] **Secrets** : ne jamais committer `.env`, mots de passe, tokens ; ne pas recopier `ADMIN_PASSWORD` dans le chat.
- [ ] **Make** : ne pas exécuter `make …` sauf demande explicite — utiliser scripts / `docker compose` / `npm` / `cargo` (règle workspace).
- [ ] **Frontend** : si touché → `npm run type-check` et `npm run lint` dans `frontend/`.
- [ ] **Sécurité** : pas de bypass WAF/TLS en prod ; dev HTTPS = `https://jobbingtrack.localhost:5443` + `https://api.jobbingtrack.localhost:5443`.
- [ ] **Fin de tâche** : mettre à jour `docs/TODOS.md` / `A_VALIDER_VERIFIER.md` si le livrable change la validation porteur.

---

## 3. Procédure détaillée (chaque requête)

### A. Comprendre

1. Relire le message à la lumière de l’**historique** de la conversation.
2. Identifier : bug, feature, doc, Git, déploiement, sécurité.
3. Si ambigu → une question courte ; sinon avancer avec la branche la plus logique.

### B. Explorer

1. Chercher dans le code (`grep`, recherche sémantique) — pas deviner.
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

Ne pas marquer « validé porteur » dans `PLAN.md` — seulement dans `A_VALIDER_VERIFIER.md` après action utilisateur.

### E. Git (si demandé)

1. `git status` + `git diff` — **exclure** `frontend/.next-local/`, artefacts build.
2. Commits **atomiques** (un thème = un commit), messages en anglais impératif : `fix(scope): …`, `feat(scope): …`, `docs(scope): …`.
3. Branche cible courante : **`fix/dev-https-api-centralization`** pour le chantier HTTPS/API/monitoring ; merger `docs/security-p0-triage` dedans si besoin doc (déjà ancêtre de cette branche).
4. `git push -u origin <branche>` seulement si l’utilisateur le demande.

### F. Répondre

1. Français, clair, proportionné.
2. Dire ce qui a été **vérifié** (commande réelle) vs ce que le **porteur** doit encore valider.
3. Lien vers `A_VALIDER_VERIFIER.md` pour la validation manuelle.

---

## 4. Branches Git (état attendu mai 2026)

| Branche | Usage |
|---------|--------|
| `main` / `dev` | Intégration stable |
| `fix/dev-https-api-centralization` | **Chantier actuel** : URLs API HTTPS, nginx dev, env strict gateway/auth, monitoring Rust, login |
| `docs/security-p0-triage` | Doc tri P0 sécurité — **déjà fusionnée dans l’historique** de `fix/dev-https-api-centralization` |
| `fix/backoffice-dev-https-api-url` | Ancienne branche proche — préférer `fix/dev-https-api-centralization` |

Workflow recommandé :

1. Commiter sur `fix/dev-https-api-centralization`.
2. Push cette branche.
3. PR vers `dev` quand le porteur a coché `A_VALIDER_VERIFIER.md`.
4. Ne pas écraser le travail : pas de `reset --hard` sans accord explicite.

---

## 5. Sécurité (rappels non négociables)

- **HTTPS dev** : front `https://jobbingtrack.localhost:5443`, API `https://api.jobbingtrack.localhost:5443` — jamais `https://…:5002` (HTTP seul → `ERR_SSL_PROTOCOL_ERROR`).
- **Intrusion / DoS** : en dev, IP Docker (`172.19.0.x`) + JWT Bearer ne doivent pas spammer « INTRUSION ÉLEVÉE » sur le backoffice (voir `intrusionDetector.js`).
- **Logs console navigateur** ≠ logs backoffice ; échecs login serveur → `security_logs` si security-service up.
- **WAF** : tests offensifs seulement en lab (`docs/security/ACTIVATION_WAF.md`, scripts `scripts/security/`).

---

## 6. Forcer l’agent à suivre cette liste (utilisateur)

1. **Règle Cursor** (`.cursor/rules/`) : ajouter « Lire `TRAITER_IMMEDIATEMENT.md` avant toute action ».
2. **Première phrase** de chaque message : « Suis TRAITER_IMMEDIATEMENT.md ».
3. **@ fichier** : `@TRAITER_IMMEDIATEMENT.md` dans le chat.
4. **Skill dédié** (optionnel) : copier la checklist §2 dans un skill Cursor « jobbingtrack-start ».

---

## 7. Historique / reprise de session

Si l’agent « perd » le contexte :

1. Lire ce fichier + `docs/TODOS.md` (priorités du haut).
2. `git status` et branche courante.
3. Transcripts passés : dossier agent-transcripts (référence UUID fournie par Cursor).

---

## 8. Liens rapides validation porteur

- Login HTTPS : `https://jobbingtrack.localhost:5443/login`
- Backoffice : `https://jobbingtrack.localhost:5443/backoffice`
- Sécurité : `https://jobbingtrack.localhost:5443/backoffice/security`
- Registre validation : **`A_VALIDER_VERIFIER.md`**
