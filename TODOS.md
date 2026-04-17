# TODOS — chantier backoffice / API / doc (JobbingTrack)

Liste opérationnelle, alignée sur **`PLAN.md`** (lots A–G) et sur la logique de **`STATUS.md`**.  
Les sujets volontairement reportés restent dans **`docs/BACKLOG.md`** et la section « Plus tard » de `STATUS.md`.

**Dernière mise à jour** : 17 avril 2026 (lot **G** / **A5** inchangés ; **F** : correctifs suite tests 17/04 — **`dockerHostUrl`**, script API, perf, gateway health ; **à faire** : Playwright, intégration exit codes, métriques multi-pages + tests)

---

## Règles de travail (produit / Git / tests)

- **Pull requests** : **pas de PR** tant que le porteur ne l’a **pas demandé explicitement** dans la conversation.
- **Tâches « terminées » côté code** : les cases `[x]` ci-dessous reflètent surtout l’**implémentation** ; l’**acceptation produit** suit **`PLAN.md`** (colonne **Validé (porteur)** = **Oui (date)** après **votre** vérification manuelle, ou mention équivalente dans **`STATUS.md`**).
- **`make tests`** : alias de **`make test-all`** (suite **complète** + rapports dans **`tests/results/<horodatage>/`**). **Prérequis** : stack **`make up-full`**, **`make db-push-all`**, seed auth si besoin, MailHog si tests mail — sinon échecs massifs **normaux** (voir **`ERRORS.md`** et **`STATUS.md`** § 11/04/2026).
- **`make test-suite-full`** : `test-frontend` → `test-database` → `status` → `test-all` (Makefile tests).

---

## Alignement `ERRORS.md` → suivi (actions hors environnement vide)

À traiter dans le code / les lots concernés ; cocher ici seulement quand **corrigé et vérifiable** (et **Validé** dans **`PLAN.md`** si produit).

- [ ] Table **`deployments`** manquante — deployment-service (`ERRORS.md`)
- [ ] Table **`user_events`** manquante — User Analytics (`ERRORS.md`)
- [ ] **API versioning** 404 — `GET .../analytics/stats/:userId/versions` (`ERRORS.md`)
- [ ] **Sync mobile** — endpoints `POST /sync/push`, etc. (`ERRORS.md`)
- [ ] (Optionnel) Build APK **`flutter_local_notifications`** (`ERRORS.md`)

---

## Fait récemment (à ne pas re-faire)

- [x] Vue d’ensemble `/backoffice` : carte incidents sécurité, grille 2 lignes, légendes CPU total, état services (En ligne / ~ms), débit erreurs en `/min`, reset compteurs à 0 (`frontend/src/app/(admin)/backoffice/page.tsx`).
- [x] Panneau **Performance** : ligne disponibilité %, légende des sources, lien vers `/services/backoffice`, texte d’aide bas de carte (avril 2026).
- [x] Doc : **ERRORS.md** (pièges dashboard + pipeline synthèse), **FONCTIONNALITES.md** § 4.1, **RESOLUTIONS.md** (avril 2026), **STATUS.md** (structure + tableau lots), **docs/CHANTIER_…**, **docs/INDEX.md**.

---

## Lot A — Monitoring services + logs multi-sources (+ persistance)

- [ ] A1 — Monitoring détail `/backoffice/services/[nom]` : précision CPU/mémoire/réseau/disque, historique (snapshots + session), auto-rafraîchissement, PIDs / block I/O documentés ; aligner autres vues « services » si besoin.
- [ ] A2 — Logs tous services + filtres (service, **niveau**, **type**, **période**) ; page `/backoffice/services/logs` + gateway — compléter filtres structurés et `(development)/services/**`.
- [ ] A3 — Vues détail service : corrélation logs techniques × sécurité (**partiel** : encart liens sécurité + logs centralisés sur la page détail ; reste : vue unifiée / timeline / API si besoin).
- [x] A4 — Synthèse pipeline dans `ERRORS.md` (§ Pièges + pipeline) ; **à réviser** après A2–A3.
- [ ] A5 — **Historique enregistré** : UI qui distingue **temps réel Docker** / **snapshots fichiers** / **persistence BDD** ; brancher les séries déjà stockées sur détail service + pages monitoring liées (analytics, stats, liste services) ; **suite** (non pressé) : encore plus de panneaux sur détail service + pages « performances ». **Suite 07/04 (partiel)** : timeout historiques + clamp `limit` + **localStorage** période partagée performances/réseau/conteneurs ; **affichage heure** : `formatLocalDateTime` dernier point ; **`normalizeMetricRows`** (`analytics.service.ts`) = **`timestampMs`** dérivé de l’**ISO** quand parseable (corrige JSON incohérent) ; tests **`date-metrics-display.test.ts`** + **`analytics-metric-rows-normalize.test.ts`** ; **`timestampMs`** API + **`metricRowToTimeMs`** / **`timeMs`** sur graphes ; **`parseChartTimestamp`** `{ value }` ; **`injectMetricTimeGaps`** ; **`docker-compose.yml`** `postgres` **TZ/PGTZ** ; **SQL `system_metrics`** : **`AT TIME ZONE`** = **`POSTGRES_SYSTEM_METRICS_TZ`** (comme Postgres) + **`make restart-metrics-recreate`** / **`monitoring-clock-refresh`** si besoin — **à valider** sur ta machine (graph aligné horloge locale) ; étendre **user-analytics** / **application** si besoin.

---

## Lot B — Sécurité

- [x] B1 — Cohérence : `blockOrigin` sur IPs bloquées + affichage firewall / analyse (affiner si besoin).
- [x] B2 — Test IP lab + **refus blocage de sa propre IP** côté API ; messages UI test vue sécurité.
- [x] B3 — Légende vue sécurité + panneaux Analyse (détections / manuels+lab / auto).
- [x] B4 — Réseau : corrélation % + hint actionnable (plus de lecture « unknown » seule).
- [x] B5 — `make security-live-check` : auth firewall/WAF côté security-service + secret interne scripts ; types menaces `generate-test-threats` alignés sur l’API (avril 2026).

---

## Lot C — Suivi-intérim & données test

- [ ] C1 — `/backoffice/suivi-interim` : données utiles, flux agences ↔ candidatures.
- [ ] C2 — Procédure claire base principale vs base test (admin préservé).
- [ ] C3 — `generate-test-data` / clear : prévisible, non destructif (hors `isTestData`).

---

## Lot D — Mobile & observabilité

- [ ] D1 — Schéma d’événement crash / erreur normalisé (champs obligatoires).
- [ ] D2 — Chaîne complète jusqu’aux vues analytics / logs admin.
- [ ] D3 — Libellés et filtres compréhensibles dans stats / monitoring.

---

## Lot E — Documentation

- [x] `STATUS.md` — structure de lecture + tableau lots A–F + liens (avril 2026).
- [x] `ERRORS.md` — § Pièges dashboard + pipeline + lignes chantier A/B (avril 2026).
- [x] `FONCTIONNALITES.md` — § 4.1 dashboard détaillé + date avril 2026.
- [x] `RESOLUTIONS.md` — entrée avril 2026 (vue d’ensemble observabilité).
- [ ] `ERRORS.md` — relecture complète après lots A/C (échecs tests, nouvelles erreurs actives).
- [ ] `RESOLUTIONS.md` — derniers correctifs sécurité (lot **B**) / monitoring & logs (lot **A**) / intérim.
- [ ] `PROCESSUS_APPLICATION_MOBILE_ET_API.md` — synchro avec l’état API + mobile.
- [ ] `FONCTIONNALITES.md` — ajuster ce qui est livré vs prévu (y compris § **4.4** lot **G** quand implémenté).
- [ ] `docs/BACKLOG.md` — éviter doublons avec ce fichier ; renvoyer vers PLAN pour le chantier structuré.
- [ ] Revue ciblée des sous-dossiers `docs/` (architecture, API, DB, sécurité, tests).

---

## Lot F — Validation

- [ ] F1 — Rejouer **`make tests`** avec **`make up-full`** + **`.env`** (**`API_GATEWAY_URL=http://127.0.0.1:5002`** ou port réel) ; analyser **`tests/results/<ts>/report.html`**. **17/04** : doc **`ERRORS`/`STATUS`/`FONCTIONNALITES`/`RESOLUTIONS`** ; code **`dockerHostUrl.js`**, **`test-api-specific.sh`**, perf, gateway health — **à confirmer** sur ta machine.
- [x] F1b (partiel) — **`Status: 000`** script API : **`mktemp`** + normalisation URL ; perf : **`exit 1`** si échecs ; reste : **intégration / sécurité** tolérants **`ENOTFOUND`** (durcir plus tard).
- [ ] F2 — Rédiger le récap : fait / reste / risques / prochaines priorités (peut aller en fin de `PLAN.md` ou `STATUS.md`).

---

## Lot G — Sauvegardes sécurisées, API, délocalisation, continuité (PCA/PRI)

Spec détaillée : **`PLAN.md`** § **G** ; fonctionnel : **`FONCTIONNALITES.md`** § **4.4** ; statut projet : **`STATUS.md`** § *Sauvegardes…*.

- [ ] G1 — Cadrage sécurité : modèle de menaces, clés (vault/KMS/fichier), rotation, rôles (`SUPER_ADMIN` + service interne) ; doc `docs/operations/BACKUP_AND_DR.md` (ou équivalent).
- [ ] G2 — API backup sous gateway : jobs, statut, historique, audit, rate limit, **non publique** sans contrôle réseau.
- [ ] G3 — Pipeline **chiffrement** des dumps (pas de clair durable sur disque partagé) + vérification d’intégrité.
- [ ] G4 — **Délocalisation** (S3-compatible, autre hôte) ; secrets uniquement serveur ; option lien téléchargement **TTL court**.
- [ ] G5 — **UI backoffice admin** : déclenchement manuel, état des jobs, messages sans fuite ; restauration **sandbox** / runbook avant prod.
- [ ] G6 — **RPO/RTO**, runbook de reprise, exercices de restauration documentés.
- [ ] G7 — Durcissement Docker/réseau/logs sécurité pour le worker backup.

---

## Vue d’ensemble `/backoffice` — améliorations futures (optionnel)

- [ ] Afficher un **horodatage** ou état « connecté au metrics-aggregator » sur la carte Performance.
- [ ] Exposer un **taux d’erreurs HTTP %** si le backend fournit ce ratio (en complément du débit /min).
- [ ] Clarifier encore **sessions vs utilisateurs actifs** selon le contrat exact de l’endpoint auth (libellé + tooltip ou doc API).

## Makefile `status` / `status-watch` (à valider sur ta machine)

- [ ] Vérifier que **`make status-watch`** affiche bien un **écran renouvelé** (CLEAR=1) ou l’historique (CLEAR=0) et qu’il n’y a plus les lignes **« Entrée / on quitte le répertoire »** ; la **légende des ports** en couleur doit matcher **`make status`** (**`printf '%b'`** sous sh, pas **`echo \033`**).
- [ ] Relire la légende **5098 → 8015** pour **monitoring-c** (port C interne vs hôte) dans la sortie `make status`.

## Monitoring transversal (optionnel — aligné **PLAN A5**, non pressé)

- [ ] Même **légende live / snapshots / BDD** que le détail service sur **analytics**, **statistiques**, **liste services**.
- [ ] **Détail service** : panneaux supplémentaires (redémarrages, limites cgroup, comparaison à la moyenne stack) quand l’API le permet.
- [ ] Pages **« performances »** : enrichissements UX + données (voir **PLAN.md** § Améliorations futures lot A).

---

## Rappels produit (hors lots mais prioritaires — voir STATUS.md)

Ne pas confondre avec le chantier ci-dessus ; ce sont les **P0** globaux du projet :

- [ ] Mobile utilisable quotidien (parcours inscription → CRUD → relances).
- [ ] Suivi intérim côté **mobile** (toggle utilisateur) + polish backoffice.
- [ ] Déploiement VPS simple (P1).

---

## Comment utiliser ce fichier

1. Cocher `[x]` quand la tâche est **réellement** mergée et vérifiable.
2. Si une tâche devient du « plus tard », la **déplacer** vers `docs/BACKLOG.md` avec une courte justification, et la retirer d’ici pour limiter le bruit.
3. Le plan détaillé et les critères d’acceptation : **`PLAN.md`**.
