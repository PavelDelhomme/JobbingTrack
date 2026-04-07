# Plan d’exécution — Écosystème backoffice, API, sécurité et documentation

**Objectif** : rendre l’écosystème backoffice + API réellement opérationnel et cohérent (sécurité, logs multi-services, suivi-intérim, analytics), puis aligner la documentation sur l’état réel avec une feuille de route claire.

**Documents liés** : `STATUS.md` (état courant et priorités produit), `TODOS.md` (cases à cocher opérationnelles), `docs/BACKLOG.md` (backlog large et tâches « plus tard »), **`docs/CHANTIER_SECURITE_DATA_DOCS.md`** (index du chantier dans `docs/`).

**Plan Cursor (IDE)** : le fichier `.cursor/plans/chantier_securite_data_docs_2c0a63b7.plan.md` décrit le **même** découpage lots A–F. **Source de vérité dans le dépôt** : ce **`PLAN.md`** (versionnable, relisible par toute l’équipe).

**Dernière révision du plan** : 7 avril 2026

---

## Critères d’acceptation globaux

1. Les pages sécurité reflètent fidèlement les événements réels (dont payload overflow, injections, blocages).
2. Les logs backoffice permettent de filtrer et diagnostiquer **tous** les services, pas uniquement la sécurité.
3. Le suivi-intérim affiche des données utiles et cohérentes avec la base active.
4. La documentation est synchronisée avec l’état actuel et exploitable comme feuille de route de travail.

---

## Lot A — Sécurité visible et exploitable

| # | Tâche | Statut | Fichiers / notes |
|---|--------|--------|------------------|
| A1 | Cohérence entre détections, menaces et IPs bloquées | À faire | `backend/security-service/src/controllers/firewallController.js`, gateway, pages sécurité |
| A2 | Mode de test de blocage IP sûr (IP de test dédiée, jamais l’IP utilisateur réelle) | À faire | firewall + UI test |
| A3 | Vue sécurité : distinguer explicitement détection / blocage manuel / blocage automatique | À faire | `frontend/src/app/(admin)/backoffice/security/page.tsx` et sous-pages |
| A4 | Analyse réseau : éviter le conteneur « unknown » 100 % non actionnable | À faire | `frontend/.../security/network/page.tsx`, sources métriques |
| A5 | (Suivi) WAF / politiques déjà en place — maintenir les tests `make security-live-check` | En veille | `backend/api-gateway/src/server.js` |

---

## Lot B — Logs de services réellement multi-sources

| # | Tâche | Statut | Fichiers / notes |
|---|--------|--------|------------------|
| B1 | Faire remonter les logs de **tous** les services avec filtres (service, niveau, type, période) | À faire | Agrégation + `frontend/src/app/(development)/services/backoffice/page.tsx` |
| B2 | Corréler logs techniques et événements sécurité dans les vues détail service | À faire | `frontend/src/app/(development)/services/**` |
| B3 | Clarifier le pipeline erreurs / warnings / crash entre API Gateway, security-service et backoffice | **Partiel** (synthèse dans **ERRORS.md** § Pièges + pipeline ; affiner après impl. multi-logs) | `backend/api-gateway/src/server.js`, **ERRORS.md** |

---

## Lot C — Data backoffice et suivi-intérim (priorité produit)

| # | Tâche | Statut | Fichiers / notes |
|---|--------|--------|------------------|
| C1 | Diagnostiquer le vide fonctionnel de `/backoffice/suivi-interim` et corriger le flux agences / candidatures | À faire | `SuiviInterimContent.tsx`, `datas/page.tsx` |
| C2 | Cohérence base principale vs base test (sans supprimer `admin@jobbingtrack.test`) | À faire | Makefile, `docs/database/MIGRATIONS_ET_BASES.md` |
| C3 | Génération / nettoyage données test prévisibles et non destructifs | À faire | `backend/generate-test-data.js`, routes admin gateway |

---

## Lot D — Mobile crash et observabilité applicative

| # | Tâche | Statut | Fichiers / notes |
|---|--------|--------|------------------|
| D1 | Normaliser les événements erreur / crash mobile (source, device, version, crashType) | À faire | Mobile Flutter + endpoint notifications |
| D2 | Vérifier la traçabilité bout en bout vers analytics / performance / logs | À faire | dashboard-service, metrics-aggregator, pages stats |
| D3 | Exploitation claire dans les pages monitoring / statistiques | À faire | `frontend` pages admin stats / analytics |

---

## Lot E — Documentation exhaustive et nettoyage

| # | Tâche | Statut |
|---|--------|--------|
| E1 | Mettre à jour et aligner : `STATUS.md`, `ERRORS.md`, `RESOLUTIONS.md`, `PROCESSUS_APPLICATION_MOBILE_ET_API.md`, `FONCTIONNALITES.md`, `docs/BACKLOG.md` | À faire (STATUS partiellement à jour 07/04) |
| E2 | Revue `docs/` (architecture, API, endpoints, metrics, décisions, changelog, DB, sécurité, mails, tests) | À faire |
| E3 | Nettoyer l’obsolète ; marquer explicitement le « non opérationnel » restant + plan d’action | À faire |

---

## Lot F — Validation finale et livrables

| # | Tâche | Statut |
|---|--------|--------|
| F1 | Tests ciblés API + E2E (sécurité, backoffice, suivi-intérim, logs / services) | À faire |
| F2 | Récapitulatif final : corrigé / reste à faire / risques / priorités opérationnelles | À produire en fin de lot |

---

## Avancement ponctuel déjà réalisé (vue d’ensemble `/backoffice`)

Ces points **ne remplacent pas** les lots ci-dessus ; ils clarifient le tableau de bord admin :

- Carte « Incidents sécurité » (libellé et lien vers `/backoffice/security`) avec sous-titre honnête sur la fenêtre agrégateur (pas « 24 h » si la métrique est courte).
- Grille métriques en **deux rangées** (pilotage puis CPU / mémoire conteneurs).
- Bloc « État des services » : libellé de droite = disponibilité / temps de réponse quand l’uptime détaillé est absent (évite vert + `N/A` ambigu).
- Panneau Performance : temps de réponse y compris à 0 ms ; **débit d’erreurs** affiché en **erreurs/min** (cohérent avec `rate_per_min` backend).
- Remise à zéro correcte des compteurs agrégés quand la source renvoie 0 ; sous-titre CPU « total » expliqué (somme des conteneurs détectés, variable).

Fichier principal : `frontend/src/app/(admin)/backoffice/page.tsx`.

### Améliorations futures (vue d’ensemble — hors critères d’acceptation)

À planifier dans **`TODOS.md`** ou le backlog si besoin :

- Horodatage ou indicateur **« métriques à jour »** / dernier fetch agrégateur.
- **% d’erreurs HTTP** (requêtes 5xx / total) si l’API expose un tel ratio, distinct du `rate_per_min` actuel.
- Mini-tendances (sparkline) sur 15 min / 1 h si stockage série temporelle disponible.
- Cohérence libellé **sessions** vs **utilisateurs actifs** selon la réponse exacte de `/auth/sessions/active`.

---

## Ordre de travail recommandé

1. **C** (produit) en parallèle de **A** (sécurité perçue) si deux personnes ; sinon C puis A.
2. **B** après ou en chevauchement avec A (même gateway / agrégateur).
3. **D** lorsque les pipelines logs/métriques (B) sont stables.
4. **E** en continu par petites PR alignées sur chaque lot ; éviter un gros « dump » doc en fin de chantier uniquement.
5. **F** en gate avant de considérer le chantier « clos ».

Pour le détail des cases à cocher au jour le jour, voir **`TODOS.md`**.
