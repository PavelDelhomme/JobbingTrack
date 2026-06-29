# Vision — services modulaires et briques déployables

Dernière mise à jour : **27 juin 2026** — note porteur à revoir (post-prod / Lot P)

## Intention porteur

Chaque **bloc fonctionnel** du projet doit pouvoir devenir une **brique autonome** :

- image Docker / package versionné (`semver`) ;
- déploiement **indépendant** sur le serveur (update d’une brique sans tout reconstruire) ;
- orchestration depuis le backoffice via **`deployment-service`** (versions mobile, API, frontend, etc.).

Objectif final : publier une version, mettre à jour **un seul module**, rollback ciblé si besoin.

> **Gate actuel** : ne pas refactorer en profondeur avant prod stable (phases A+B+C, `PILOTAGE.md`). Cette note fixe la cible et l’écart avec l’existant.

---

## Cartographie cible (briques)

| Brique cible | Rôle | État JobbingTrack aujourd’hui | Déploiement indépendant ? |
|--------------|------|-------------------------------|---------------------------|
| **Frontend backoffice** | Next.js admin, proxy metrics, pages Performances/Statistics/Sécurité | `frontend` (monolithe Next) | Partiel — 1 conteneur, pas de package séparé |
| **Sécurité** | WAF, menaces, firewall, logs sécurité, score | `security-service` + pages `/backoffice/security/*` | Service API oui ; UI couplée au front |
| **Mail / notifications** | SMTP, emails, agent email | `notification-service`, `auth-service` (Python email), pages `/agent`, Email Monitor | Services oui ; UI agent dans le front |
| **Logs conteneurs** | Collecte, agrégation logs | `log-collector-rs`, tables `aggregated_logs` | Oui (Rust) |
| **Metrics / monitoring** | Agent, agrégateur, Performances | `monitoring-agent-rs`, `metrics-aggregator`, pages Performances | Oui (Rust + Node) |
| **Auth admin / backoffice** | JWT admin, rôles, session web | `auth-service` + `api-gateway` | Service oui |
| **Auth mobile utilisateurs** | Login app, refresh, biométrie | `auth-service` (mêmes routes `/api/v1/auth`) | Même service que admin aujourd’hui |
| **Métier candidatures** | CRUD candidatures, statuts | `application-service` | Oui |
| **Entretiens** | CRUD entretiens | `interview-service` | Oui |
| **Relances** | Follow-ups | `followup-service` | Oui |
| **Appels** | Journal appels | `call-service` | Oui |
| **Contacts / entreprises** | CRM light | `contact-service`, `company-service` | Oui |
| **Notifications push/in-app** | Cloche, FCM (prod) | `notification-service` | Oui |
| **Mobile** | App Flutter | `mobile/` (APK/AAB hors Compose prod) | Pipeline à finaliser |
| **Déploiement / release** | Versions, rollback, analytics déploiement | `deployment-service` + `/deployments` | Service oui ; **orchestration prod incomplète** |

---

## Ce qui existe déjà (aligné avec la vision)

### Microservices métier + infra

- **12+ services Node** derrière `api-gateway` (auth, application, call, followup, interview, contact, company, notification, workflow, profile, event, dashboard, deployment, security).
- **Stack observabilité** : `monitoring-agent-rs`, `log-collector-rs`, `jobbingtrack-metrics-aggregator`.
- **Frontend unique** qui consomme tout via gateway + proxies Next (`/api/mon`, `/api/persist`).

### `deployment-service`

| Composant | Rôle |
|-----------|------|
| Modèle Prisma `Deployment`, `DeploymentMetricTable`, `RollbackEntry` | Historique version, env, commit, statut, métriques post-deploy |
| API `/api/v1/deployments/*` | CRUD déploiements, analytics 30 j, rollbacks |
| UI `/deployments` | Vue d’ensemble, onglets déploiements / rollbacks / métriques |
| `deploymentScheduler.js` | Tâches planifiées (dev) |

**Limite actuelle** (voir `docs/deployment/DEPLOIEMENT_FINAL.md`) :

- Pas encore de bouton **« Déployer »** qui déclenche build → registry → SSH/Portainer ;
- Pas de catalogue **brique → image → tag** géré depuis le backoffice ;
- Mobile : pas de pipeline release intégré (APK/AAB, canaux internal/beta/prod).

---

## Écart principal (à revoir post-prod)

| Sujet | Aujourd’hui | Cible porteur |
|-------|-------------|---------------|
| **Front backoffice** | Monolithe Next (Performances + Sécurité + Agent + Mobile analytics…) | Packages ou apps séparées **ou** modules lazy avec contrats API stables |
| **Auth** | Un seul `auth-service` admin + mobile | Peut rester un service ; séparer **clients** (scopes) plutôt que dupliquer |
| **Versioning par brique** | `docker compose build` global, tags implicites | Tag semver par image (`jobbingtrack-auth:1.4.2`), update ciblée |
| **deployment-service** | Journal + métriques | **Orchestrateur** : choix brique, version, env, rollback |
| **AllInOne / Lot P** | Projet séparé, aligné contrats API JT | Socle réutilisable **après** prod — voir `ALLINONE_AND_LOT_P.md` |

---

## Piste d’évolution recommandée (ordre)

1. **Phase C — prod** : images taguées, registry, compose prod par profil ; `deployment-service` enregistre chaque release (déjà prêt côté modèle).
2. **Orchestration minimale** : API deployment « enregistrer + déclencher script CI » (webhook ou SSH) par **artefact** (frontend, auth, mobile…).
3. **Lot P — extraction UI** : `PerformancePageShell`, `SecuritySubNav`, etc. → packages `@…/admin-*` ; JobbingTrack consomme.
4. **Catalogue briques** : fichier ou BDD `modules` (id, image, version courante, dépendances) exposé dans `/deployments`.

Ne **pas** fragmenter le monorepo avant gate prod : risque de ralentir mobile étapes 2→5.

---

## Orchestrateur de déploiement — cible porteur (note 27/06)

> **À implémenter post-prod** — ne pas bloquer mobile étape 2→5.

Le `deployment-service` doit devenir un **vrai orchestrateur** (pas seulement un journal) :

| Bloc | Contenu attendu |
|------|-----------------|
| **Catalogue briques** | id, label, image Docker / artefact (APK), version courante, env (dev/staging/prod) |
| **Configuration build** | Dockerfile / script CI, variables par brique, secrets référencés (pas en clair UI) |
| **Paramètres release** | tag semver, branche/commit, registry, profil compose, fenêtre maintenance |
| **Actions** | Déployer, rollback, dry-run, annuler ; webhook CI ou SSH/Portainer |
| **Suivi** | statut temps réel, logs build, métriques post-deploy (déjà modèle Prisma) |

**UI backoffice** : étendre `/deployments` + entrée Administration ; bouton « Déployer » par brique avec champs validés.

**Référence implémentation** : `docs/deployment/DEPLOIEMENT_FINAL.md` + modèle Prisma `Deployment` existant.

---

## Liens

- `docs/deployment/DEPLOIEMENT_FINAL.md` — déploiement depuis backoffice (à finaliser)
- `docs/project/BACKLOG.md` § Lot P — plateforme réutilisable
- `docs/project/ALLINONE_AND_LOT_P.md` — relation AllInOne / contrats API
- `docs/pilotage/TODOS.md` § « Architecture modulaire — briques déployables »
- `docs/core/architecture/README.md` — cartographie services actuelle

---

*Note porteur — à revisiter après validation prod et avant kick-off Lot P / orchestration deployment-service.*
