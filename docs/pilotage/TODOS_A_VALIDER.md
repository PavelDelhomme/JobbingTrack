# TODOs à valider (phase active uniquement)

> **Process** : voir [`PILOTAGE.md`](PILOTAGE.md).  
> Tu remplis **uniquement** ce fichier pour la phase en cours. Pas d’autres phases ici.  
> **UI** : `/backoffice/pilotage` → onglet **Tableau de suivi** (OK/KO écrit ici automatiquement en dev/préprod).

**Phase active** : **B — Gate pré-prod mobile**  
**Point exact** : **MOB-HUB-01** (seul **En cours** Kanban)  
**APK** : **1.0.42** · Samsung (hubs croisés)

> **Kanban** : badge = **colonne**. **MOB-ENT-01** = Terminé. **MOB-LIST-01** = À valider.

---

## Suite logique (files — pas toutes en cours)

| # | ID | Colonne | À faire | Décision | Notes |
|---|----|---------|---------|----------|-------|
| 1 | **MOB-HUB-01** | ▶ En cours | Hubs détail + liens croisés + ajout lié | | ◀ **maintenant** APK **1.0.42** Samsung |
| 2 | **MOB-LIST-01** | À valider | Cartes listes métadonnées | **PARTIEL agent** | Re-test porteur 1.0.40+ |
| 3 | **MOB-NAV-01** | À faire | Retours système depuis chaque détail | | après HUB |
| 4 | **MOB-SNACK-01** | À faire | Snacks auto-dismiss | | après NAV |
| 5 | **D.6** | À faire | FAB Relance | | après snacks |
| 6 | D.7→D.9 | Plus tard | FAB Appel / Entretien / Contact | | après D.6 |
| 7 | E.10→F.12 | Plus tard | Shell re-tap / FAB contacts / double retour | | après FAB |
| 8 | **APK-BUILD-01** | À valider | Rebuild sans Zip + install | **OK agent 04/08** | 1.0.42 install Samsung — confirmer porteur |
| 8b | **PILOTAGE-PERF** | À tester | Page pilotage trop lente | **PARTIEL 10/08** | summary crashes + defer + dynamic |
| 8c | **AUDIT-QA-01** | Plus tard | Audit QA exhaustif DEV/PROD USER/ADMIN | | [`AUDIT_QA_EXHAUSTIF.md`](AUDIT_QA_EXHAUSTIF.md) — après gate B |
| 9 | **DEPLOY-C1→C3** | À faire | Portainer + NPM + OTA préprod | | parallèle C |
| 10 | **DEPLOY-MAKE** | À tester | Make up-preprod / upgrade-to-* | | script livré |
| — | **MOB-ENT-01** | Terminées | Hub entreprise Capgemini | **OK 29/07** | |
| — | WEB-LOGIN / EMU | Terminées | | **OK** | |

---

## Correctifs session (état)

| ID | À faire | Décision | Notes |
|----|---------|----------|-------|
| **MOB-ENT-01** | Hub entreprise (apps/contacts/relances/entretiens/appels) | **OK 29/07** | Capgemini contacts + hub |
| **MOB-LIST-01** | Infos cartes listes tous onglets | **PARTIEL** → À valider | métadonnées 1.0.40 |
| **MOB-HUB-01** | Liens croisés fiches (app/contact/relance/entretien/appel) | | ◀ **maintenant** |
| **MOB-NAV-01** | Bouton retour système | | après HUB |
| **APK-BUILD-01** | Rebuild sans Zip kernel_blob | **OK agent 04/08** | build 1.0.42 + install Samsung ; KGP = warn |
| **WEB-LOGIN-01** | Login bandeau FR sans overlay Next | **OK 22/07** | |
| **EMU-LIVE-01** | Aperçu live ADB | **OK 22/07** | |
| **MOB-SNACK-01** | AppSnack auto-dismiss | | après NAV |
| **PILOTAGE-UI-04** | Tableau suite logique + écriture md | | |
| **PILOTAGE-UI-05** | Fiche détail / PARTIEL / Plus tard / Terminées | | |
| **PILOTAGE-KANBAN** | Contraste colonnes **clair+sombre** + promo inbox + onglets STATUS/PLAN/ERRORS | | Re-test UI (moteur `jtKanban`) |
| **PILOTAGE-PERF** | Page `/backoffice/pilotage` trop lente | **PARTIEL agent 10/08** | À tester — quick-wins livrés |
| **AUDIT-QA-01** | Audit boutons/pages/API/délais/erreurs (DEV+PROD, USER+ADMIN) | | Plus tard — détail `AUDIT_QA_EXHAUSTIF.md` |

---

## B2 — Navigation + FAB + admin

| Point | À faire | Décision (OK / KO + détail) | Notes |
|-------|---------|-----------------------------|-------|
| A.1–A.2c | Navigation retour | **OK** | déjà fait |
| B.3 | USER drawer sans Administration | **OK 22/07** | |
| B.4 | ADMIN impersonnaliser → hub | **OK 22/07** | |
| C.5 | Liste Relances sans crash | **OK 22/07** | crash setState corrigé APK 1.0.31 |
| **D.6** | FAB → Relance | | ◀ **à remplir** |
| D.7 | FAB → Appel | | |
| D.8 | FAB → Entretien | | |
| D.9 | FAB → Contact | | |
| E.10 | Re-tap Candidatures | | |
| E.11 | Contacts → FAB + | | |
| F.12 | Accueil double retour | | |

**OK global B2** (quand D→F OK) :

```text
OK Mobile — navigation retour, admin, relances, ajouts candidature
```

---

## B3 — SMTP OVH `@jobbingtrack.com`

| # | Action | Décision | Notes |
|---|--------|----------|-------|
| 1 | Upgrade MX Plan OVH | | ⏸ après B2 |
| 2 | Créer noreply@ + security@ | | |
| 3 | DKIM + DMARC | | |
| 4 | `.env` préprod/prod SMTP | | sans coller secrets |
| 5 | Smokes mail OK | | |

Réponse : `OK Étape3 SMTP jobbingtrack.com` ou `KO …`

---

## B4 — Agent email admin

| # | Action | Décision | Notes |
|---|--------|----------|-------|
| 1 | Activer agent (admin) | | ⏸ après B3 |
| 2 | Triage / boîte visible | | |

Réponse : `OK Étape4 Agent email admin` ou `KO …`

---

## B5 — Consentements RGPD `/agent`

| # | Action | Décision | Notes |
|---|--------|----------|-------|
| 1 | Sync mobile → web consentements | | ⏸ après B4 |

Réponse : `OK Étape5 Consentements RGPD` ou `KO …`
