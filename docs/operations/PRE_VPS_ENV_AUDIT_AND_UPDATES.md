# Avant déploiement VPS — mises à jour, audit des variables et protection des secrets

Ce document fixe **l’ordre de travail** : (1) capacité à faire évoluer le projet, (2) audit **très détaillé** des variables et secrets **hors dépôt Git**, (3) durcissement continu (**security-service**, dépendances, images).

**Fichiers liés** : **`.env.example`** (source de vérité **versionnée** pour les **noms** de variables — pas les secrets réels), **`docs/security/COMPOSE_RUNTIME_HARDENING.md`**, **`docs/deployment/VPS_PORTAINER_NPM_OVH.md`**, **`docs/operations/PREPROD_PRODUCTION_CHECKLIST.md`**, **`scripts/env/reorder-env-from-example.cjs`**, **`make env-check`** / **`make env-reorder`**.

---

## 1. Prérequis : le projet doit supporter les mises à jour futures

Sans cela, un audit « parfait » sur un snapshot figé ne résiste pas au temps.

| Domaine | Action concrète |
|--------|-------------------|
| **Dépendances Node** | `npm audit` / Dependabot ou équivalent ; politique de **montée de version** (patch régulier, minor planifié). |
| **Images Docker** | Tags **postgres**, **redis**, images applicatives : plan de **rebuild** + tests après bump. |
| **API & contrats** | Éviter les couplages implicites ; documenter les **breaking changes** (gateway `/api/v1/...`). |
| **Mobile** | `flutter pub outdated` / alignement SDK ; même **JWT** et URLs que le back officiel. |
| **Sécurité** | Lot **B14** (`COMPOSE_RUNTIME_HARDENING.md`) : Redis, `docker.sock`, secrets prod, etc. |
| **Security-service** | Image reconstruite avec le même rythme que la gateway ; variables **`WAF_ENABLED`**, **`SECURITY_INTERNAL_SECRET`** alignées ; surveiller les **capabilities** (`NET_ADMIN`) et les mises à jour **iptables**/OS de l’image de base. |

---

## 2. Rapport d’audit des variables (hors Git — obligatoire avant VPS)

**Objectif** : une **liste exhaustive** des variables **réellement** utilisées (`.env`, Portainer, secrets runtime), des **mots de passe / clés** (rotation, origine), et des **écarts** vs **`.env.example`**.

### 2.1 Où écrire le rapport (jamais dans le dépôt)

- Répertoire ignoré par Git : **`reports/env-audit/`** (voir **`.gitignore`**).
- Nom suggéré : `reports/env-audit/inventaire-YYYYMMDD.md` (ou chiffré sur disque / coffre-fort d’équipe).

**Interdit** : committer un fichier contenant **JWT**, **mots de passe**, **clés API**, **DATABASE_URL** avec mot de passe réel, dumps **docker inspect** complets, etc.

### 2.2 Contenu minimal du rapport (très détaillé)

1. **Tableau** : `NOM_VARIABLE` | fichier / source (`.env`, stack Portainer, secret K8s…) | valeur **masquée** (ex. `***` ou 4 derniers caractères) | sensible (oui/non) | commentaire (rotation, propriétaire).
2. **Secrets** : liste des **rotations** prévues et **date** de dernière rotation.
3. **Ports** : cohérence **hôte** ↔ **compose** ↔ **Nginx Proxy Manager** ↔ pare-feu.
4. **URLs publiques** : `NEXT_PUBLIC_*`, CORS, TLS — pas de mélange `http://` prod / secrets en clair dans le navigateur.
5. **Écart** vs **`.env.example`** : clés manquantes / orphelines (`make env-check`).
6. **Mobile / backoffice** : mêmes **origines** et **clés** que l’API officielle (pas de second jeu de secrets non documenté).

### 2.3 Vérifications « pas de fuite » (à faire localement)

- `git log -p -- .env` ne doit **jamais** avoir contenu de `.env` réel (si jamais commité : **révoquer** les secrets et **réécrire** l’historique ou considérer les clés comme compromises).
- Rechercher des motifs type `BEGIN PRIVATE KEY`, `password=`, `AKIA` dans l’index :  
  `git grep -i 'password\|secret\|api_key' -- ':!*.md' ':!*.example' ` (adapter ; ne pas coller de vrais secrets dans le chat IA).
- S’assurer que **`.env`** reste dans **`.gitignore`**.

### 2.4 Analyse par l’assistant (Cursor / IA)

Tu peux coller dans une conversation **un extrait du rapport** avec **valeurs masquées** uniquement, ou déposer le fichier sous **`reports/env-audit/`** en **local** et demander une relecture **sans** pousser le dépôt. **Ne pas** coller de secrets en clair dans le chat.

---

## 3. Aligner `.env` sur `.env.example` (ordre et clés)

- **Référence versionnée** : **`.env.example`** (sections + **ordre alphabétique** des clés dans chaque bloc, pour retrouver vite les variables dans Portainer).
- Après mise à jour d’**`.env.example`**, régénérer la structure de ton **`.env`** **sans écraser tes valeurs** :  
  `make env-reorder`  
  (script : **`scripts/env/reorder-env-from-example.cjs --write`**).
- Puis : **`make env-check`** pour les clés manquantes / orphelines.

---

## 4. Cible « comme en production » (WAF, etc.)

- **`WAF_ENABLED=true`** : comportement proche prod sur la **gateway** ; si des tests locaux échouent, isoler la cause (règles WAF, chemins) plutôt que désactiver sans trace.
- Les **secrets** de dev dans **`.env.example`** restent des **exemples** : en prod, **valeurs fortes** + **gestionnaire de secrets** (Portainer secrets, Vault, etc.) — voir **B14** / checklist préprod.

---

## 5. Docker Compose — logique commune (sans tout réécrire d’un coup)

- **Noms de services** dans **`docker-compose.yml`** : déjà alignés avec les hôtes DNS Docker (`auth-service`, `jobbingtrack-metrics-aggregator`, …).
- **Convention recommandée** : dans chaque bloc `environment:`, garder les entrées **triées par nom de variable** lors des **nouvelles** modifications (fichiers `docker-compose*.yml` volumineux : migration progressive).
- Détail : **`docs/operations/DOCKER_COMPOSE_ENV_CONVENTION.md`**.

---

*Dernière mise à jour : 6 mai 2026.*
