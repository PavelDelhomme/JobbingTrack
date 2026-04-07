# TODOS — chantier backoffice / API / doc (JobbingTrack)

Liste opérationnelle, alignée sur **`PLAN.md`** (lots A–F) et sur la logique de **`STATUS.md`**.  
Les sujets volontairement reportés restent dans **`docs/BACKLOG.md`** et la section « Plus tard » de `STATUS.md`.

**Dernière mise à jour** : 7 avril 2026

---

## Fait récemment (à ne pas re-faire)

- [x] Vue d’ensemble `/backoffice` : carte incidents sécurité, grille 2 lignes, légendes CPU total, état services (En ligne / ~ms), débit erreurs en `/min`, reset compteurs à 0 (`frontend/src/app/(admin)/backoffice/page.tsx`).
- [x] Panneau **Performance** : ligne disponibilité %, légende des sources, lien vers `/services/backoffice`, texte d’aide bas de carte (avril 2026).
- [x] Doc : **ERRORS.md** (pièges dashboard + pipeline synthèse), **FONCTIONNALITES.md** § 4.1, **RESOLUTIONS.md** (avril 2026), **STATUS.md** (structure + tableau lots), **docs/CHANTIER_…**, **docs/INDEX.md**.

---

## Lot A — Sécurité

- [x] A1 — Cohérence : `blockOrigin` sur IPs bloquées + affichage firewall / analyse (affiner si besoin).
- [x] A2 — Test IP lab + **refus blocage de sa propre IP** côté API ; messages UI test vue sécurité.
- [x] A3 — Légende vue sécurité + panneaux Analyse (détections / manuels+lab / auto).
- [x] A4 — Réseau : corrélation % + hint actionnable (plus de lecture « unknown » seule).
- [x] A5 — `make security-live-check` : auth firewall/WAF côté security-service + secret interne scripts ; types menaces `generate-test-threats` alignés sur l’API (avril 2026).

---

## Lot B — Logs multi-services

- [ ] B1 — Logs tous services + filtres (service, niveau, type, période) dans le backoffice dev/services.
- [ ] B2 — Vues détail service : corrélation logs techniques × sécurité.
- [x] B3 — Synthèse pipeline dans `ERRORS.md` (§ Pièges + pipeline) ; **à réviser** après impl. logs multi-services (B1–B2).

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
- [ ] `ERRORS.md` — relecture complète après lots B/C (échecs tests, nouvelles erreurs actives).
- [ ] `RESOLUTIONS.md` — derniers correctifs sécurité / logs / intérim.
- [ ] `PROCESSUS_APPLICATION_MOBILE_ET_API.md` — synchro avec l’état API + mobile.
- [ ] `FONCTIONNALITES.md` — ajuster ce qui est livré vs prévu.
- [ ] `docs/BACKLOG.md` — éviter doublons avec ce fichier ; renvoyer vers PLAN pour le chantier structuré.
- [ ] Revue ciblée des sous-dossiers `docs/` (architecture, API, DB, sécurité, tests).

---

## Lot F — Validation

- [ ] F1 — Jeux de tests : API + Playwright sur sécurité, backoffice, suivi-intérim, logs services.
- [ ] F2 — Rédiger le récap : fait / reste / risques / prochaines priorités (peut aller en fin de `PLAN.md` ou `STATUS.md`).

---

## Vue d’ensemble `/backoffice` — améliorations futures (optionnel)

- [ ] Afficher un **horodatage** ou état « connecté au metrics-aggregator » sur la carte Performance.
- [ ] Exposer un **taux d’erreurs HTTP %** si le backend fournit ce ratio (en complément du débit /min).
- [ ] Clarifier encore **sessions vs utilisateurs actifs** selon le contrat exact de l’endpoint auth (libellé + tooltip ou doc API).

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
