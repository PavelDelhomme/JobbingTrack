# A valider / verifier avant production

Date de creation : 13 mai 2026

## Role du fichier

Ce fichier est le registre de validation porteur.

Les cases `[x]` dans `TODOS.md` veulent dire "fait dans le depot" ou "procedure disponible". Elles ne veulent pas dire "valide produit". Quand le porteur valide un element ici, reporter ensuite la validation dans `PLAN.md` ou `STATUS.md` avec la date.

## Mode d'emploi

Pour chaque ligne :

- cocher seulement apres verification reelle ;
- noter l'environnement (`local`, `preprod`, `prod`) ;
- noter le commit ou la branche ;
- ecrire les problemes constates dans la colonne "Retour porteur" ;
- transformer les problemes en nouvelles taches `TODOS.md`.

## Identite, acces et admin

| A verifier | Preuve attendue | Environnement | Statut porteur | Retour porteur |
|------------|-----------------|---------------|----------------|----------------|
| Connexion admin avec `ADMIN_EMAIL` / `ADMIN_PASSWORD` du `.env` | Login OK puis acces `/b4ck0ff1ce` | local | [ ] | |
| Aucun identifiant de test affiche sur `/login` | Page visible sans `password123` ni compte de test | local/preprod | [ ] | |
| Changement de mot de passe admin documente | Procedure claire, secret masque dans les logs | local | [ ] | |
| Actions sensibles admin avec reauth | Changement email alerte, purge, export, WAF/firewall | preprod | [ ] | |

## Securite applicative

| A verifier | Preuve attendue | Environnement | Statut porteur | Retour porteur |
|------------|-----------------|---------------|----------------|----------------|
| WAF bloque payload externe dangereux | Payload XSS/SQLi borne bloque par gateway/proxy | local/preprod | [ ] | |
| WAF ne bypass pas un navigateur via `X-Forwarded-*` | Trafic proxy externe inspecte sauf secret interne valide | local/preprod | [ ] | |
| Rate-limit / intrusion ne bannit pas durablement les IP privees en dev | IP Docker/proxy debloquee apres tests | local | [ ] | |
| Tokens mock runtime retires ou controles par env exacte | Pas de prefixe hardcode type `mock-jwt-token*` en runtime | local/preprod | [ ] | |
| Logs securite exploitables | IP, route, method, status, requestId, payload redige si besoin | preprod | [ ] | |

## Rapports securite

| A verifier | Preuve attendue | Environnement | Statut porteur | Retour porteur |
|------------|-----------------|---------------|----------------|----------------|
| Rapports `reports/security/**/summary.md` generes | Rapport horodate avec outil, commit, environnement | local/preprod | [ ] | |
| Rapports `tests/results/security/**/summary.md` generes | Rapport CVE lisible | local/preprod | [ ] | |
| Backoffice liste les rapports securite | Categorie `Securite` visible dans `/backoffice/test-reports` apres generation d'au moins un rapport | local/preprod | [ ] | |
| Lecture rapport securite | Bouton `Voir` ouvre le contenu de `summary.md`, `summary.json` ou `report.html` sans erreur 404/500 | local/preprod | [ ] | |
| Telechargement rapport securite | Fichier telechargeable depuis `/api/test-reports/download` et lisible hors backoffice | local/preprod | [ ] | |
| Artefacts P0 recuperes ou regeneres | Dossiers dates `reports/security/*` et `tests/results/security/*` presents avec `summary.md`/`summary.json` | local/preprod/GitHub | [ ] | |
| Findings `critical/high` tries | Faux positifs justifies, vrais risques convertis en taches | preprod | [ ] | |

## Monitoring et performance

| A verifier | Preuve attendue | Environnement | Statut porteur | Retour porteur |
|------------|-----------------|---------------|----------------|----------------|
| `monitoring-agent-rs` actif par defaut | Compose lance Rust, pas C, pour la collecte bas niveau | local/preprod | [ ] | |
| `log-collector-rs` actif par defaut | Logs Docker lus et `log_collector_logs` alimentee | local/preprod | [ ] | |
| Benchmark long post-bascule Rust | 40-60 min p95 CPU/RAM/IO dans gate preprod | preprod | [ ] | |
| Backoffice services affiche donnees coherentes | CPU, RAM, reseau, I/O, disponibilite, historique | local/preprod | [ ] | |
| Corrélation perf/logs/securite utilisable | Incidents lies a logs avec ecart temporel comprehensible | preprod | [ ] | |

## CI/CD et branches

| A verifier | Preuve attendue | Environnement | Statut porteur | Retour porteur |
|------------|-----------------|---------------|----------------|----------------|
| Workflow CI/CD passe sur GitHub | Jobs DB, backend, frontend, integration, perf initialises | GitHub | [ ] | |
| Workflow security-audit passe | Gitleaks/Trivy et artefacts disponibles | GitHub | [ ] | |
| Noms de branches respectent `BRANCHES.md` | Branche type `docs/...`, `feat/...`, `fix/...` | repo | [ ] | |
| Commits respectent la convention | `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `misc:` | repo | [ ] | |

## Structure projet

| A verifier | Preuve attendue | Environnement | Statut porteur | Retour porteur |
|------------|-----------------|---------------|----------------|----------------|
| Rapports generes non versionnes | `backend-performance-reports`, `diagnostic-reports`, `test-results*` absents du suivi Git | repo | [ ] | |
| `services/` Python archive ou supprime | Plus de confusion avec `backend/*-service` actif | repo | [ ] | |
| `mobile-native-app` archive ou supprime | Plus de dossier racine inutile | repo | [ ] | |
| `mobile/` vs `flutter-mobile-app/` decide | Une source mobile officielle documentee | repo | [ ] | |
| Tests colocated backend conserves ou migrés proprement | Jest configs adaptees si migration | repo | [ ] | |

## Documentation a relire

| Document | A verifier | Statut porteur | Retour porteur |
|----------|------------|----------------|----------------|
| `TODOS.md` | Les taches a faire sont en premier et les realises n'encombrent pas la priorite | [ ] | |
| `STATUS.md` | Le statut explique l'etat reel sans sur-vendre | [ ] | |
| `PLAN.md` | La colonne "Valide porteur" est a jour | [ ] | |
| `AUDIT_SEC_PROJECT.md` | Les risques securite sont comprehensibles | [ ] | |
| `monitoring/RAPPORT_MONITORING_GOOD_PRACTICE_GO_AND_C.md` | La strategie C/Rust est claire | [ ] | |
| `BRANCHES.md` | Les conventions sont acceptables | [ ] | |

## Resultat attendu

Quand toutes les lignes critiques sont validees ou converties en nouvelles taches, ce fichier sert de base au gate preprod puis au gate production.
