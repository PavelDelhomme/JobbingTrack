# Pilotage JobbingTrack

Dernière mise à jour : **22 juillet 2026**

## ▶ Où on en est

**Phase B · MOB-ENT-01 contacts entreprise (REWORK) · puis B2-D.6** · APK `1.0.34+34`  
Correctifs session : **WEB-LOGIN-01 OK** · **EMU-LIVE-01 OK** · **MOB-ENT-01 REWORK** (liste OK, contacts détail à reprendre) · **PILOTAGE-UI-05** (+ section Terminées)  
UI : **[`https://jobbingtrack.localhost:5443/backoffice/pilotage`](https://jobbingtrack.localhost:5443/backoffice/pilotage)** (HTTPS obligatoire — pas `localhost:5003`)  
App prod Samsung : dossier **`mobile/`** · proto : **`flutter-mobile-app/`** (`lib/main.dart` → `lib/core/app.dart`)

Guide décisions OK/KO/PARTIEL : [`GUIDE_VALIDATION_PORTEUR.md`](GUIDE_VALIDATION_PORTEUR.md).

## Process (fichiers)

| Fichier | Rôle |
|---------|------|
| [`TODOS.md`](TODOS.md) | **Source de vérité** — à faire + récemment fait |
| [`TODOS_A_TESTER.md`](TODOS_A_TESTER.md) | Tests & résultats (ex-`TODOS_A_VERIFIER`) |
| [`TODOS_A_VALIDER.md`](TODOS_A_VALIDER.md) | **Uniquement** validations porteur de la phase active |
| [`TODOS_DONE.md`](TODOS_DONE.md) | Archivage OK concluants |
| [`GUIDE_VALIDATION_PORTEUR.md`](GUIDE_VALIDATION_PORTEUR.md) | Checklist Samsung courte |
| [`../STATUS.md`](../STATUS.md) | État projet + ce process |

Flux : `TODOS` → tests dans `A_TESTER` → **OK** → `DONE` · **KO** → retour `TODOS`.

### Backoffice — Tableau de suivi

Page **Pilotage / Suivi des tâches** (`/backoffice/pilotage`) :

1. Onglet **Tableau de suivi** — validation riche : cycles (ex. FAB mobile), fiches détail avec sous-critères, **OK / PARTIEL / KO / REWORK / Plus tard**, réordonner ▲▼. État dans `validation-board.json` + sync `TODOS_A_VALIDER.md` + preuve `TODOS_A_TESTER.md`. Section **Terminées** : fusion chronologique de « Récemment terminé » (`TODOS.md`), décisions OK/KO (`A_VALIDER` + board), archive `TODOS_DONE.md` — mise à jour auto à chaque OK/KO (prepend dans `TODOS.md`).
2. Onglet **Vue synthèse** — snapshot `suivi-actif.json`.
3. Onglet **Fichiers bruts** — édition markdown/json (SUPER_ADMIN).

**Écriture** (actions + PUT fichiers) : uniquement si `JT_RUNTIME_ENV` ∈ `development|dev|local|preprod|staging|test|ci` (pas `production` / `prod`). Auth : lecture ADMIN+, actions SUPER_ADMIN.

**Sync UI ↔ fichiers** :
- Fichiers → UI : à chaque chargement / rafraîchir.
- UI → fichiers : actions board écrivent `validation-board.json` + décision résumée dans `TODOS_A_VALIDER.md`.
- Layout responsive : panneau détail desktop · bottom sheet mobile.

## Branches / commits

Suivre [`../development/BRANCHES.md`](../development/BRANCHES.md) :  
`feat/…`, `fix/…`, `docs/…` — jamais commit direct sur `main`/`dev`.

## Phases

| Phase | Contenu | Statut |
|-------|---------|--------|
| A | Mobile Lot D (code/smokes) | via B |
| **B** | Gate validation porteur B1→B5 | **B2-D.6** |
| C | Déploiement VPS/OTA | parallèle |
| D | Backoffice P1 / hygiène / pilotage UI | après B (sauf correctifs demandés) |

## Règle agent

Avant toute tâche : lire ce fichier → `TODOS.md` (section **En cours**) → `TODOS_A_TESTER.md`.  
Ne pas élargir hors item ouvert sauf demande explicite porteur.
