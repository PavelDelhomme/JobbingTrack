# TODOs à valider (phase active uniquement)

> **Process** : voir [`PILOTAGE.md`](PILOTAGE.md).  
> Tu remplis **uniquement** ce fichier pour la phase en cours. Pas d’autres phases ici.  
> **UI** : `/backoffice/pilotage` → onglet **Tableau de suivi** (OK/KO écrit ici automatiquement en dev/préprod).

**Phase active** : **B — Gate pré-prod mobile**  
**Point exact** : **MOB-ENT-01** (seul **En cours** Kanban)  
**APK** : **1.0.37+37** · Samsung (contacts UI fix)

> **Kanban** : badge = **colonne** (carte En cours = « En cours », pas « À reprendre »).

---

## Suite logique (files — pas toutes en cours)

| # | ID | Colonne | À faire | Décision | Notes |
|---|----|---------|---------|----------|-------|
| 1 | **MOB-ENT-01** | ▶ En cours | Capgemini contacts Marie/Luc | | API OK · re-test APK 1.0.37 |
| 2 | **APK-BUILD-01** | À valider | Rebuild sans Zip + install | **PARTIEL agent** | 1.0.37 |
| 3 | **MOB-SNACK-01** | À faire | Snacks auto-dismiss | | après MOB-ENT |
| 4 | **D.6** | À faire | FAB Relance | | après snacks |
| 5 | D.7→F.12 | Plus tard | FAB / shell | | après D.6 |
| 6 | **DEPLOY-C1→C3** | À faire | Portainer + NPM + OTA préprod | | parallèle C |
| 7 | **DEPLOY-MAKE** | À tester | Make up-preprod / upgrade-to-* | | script livré |
| 8 | SMTP-B3 / EMAIL-TRIAGE | Plus tard | SMTP domaine + agent mails | | post gate |
| — | WEB-LOGIN / EMU | Terminées | | **OK** | |

---

## Correctifs session (état)

| ID | À faire | Décision | Notes |
|----|---------|----------|-------|
| **MOB-ENT-01** | Entreprises + **contacts liés** | **REWORK 22/07** → re-test | ◀ **maintenant** · Capgemini |
| **APK-BUILD-01** | Rebuild sans Zip kernel_blob | **PARTIEL 27/07** | 1.0.36+36 ADB OK — valider ouverture |
| **WEB-LOGIN-01** | Login bandeau FR sans overlay Next | **OK 22/07** | |
| **EMU-LIVE-01** | Aperçu live ADB | **OK 22/07** | |
| **MOB-SNACK-01** | AppSnack auto-dismiss | | après MOB-ENT |
| **PILOTAGE-UI-04** | Tableau suite logique + écriture md | | |
| **PILOTAGE-UI-05** | Fiche détail / PARTIEL / Plus tard / Terminées | | |
| **PILOTAGE-KANBAN** | Contraste colonnes **clair+sombre** + promo inbox + onglets STATUS/PLAN/ERRORS | | Re-test UI (moteur `jtKanban`) |

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
