# Pilotage JobbingTrack

Dernière mise à jour : **22 juillet 2026**

## ▶ Où on en est

**Phase B · B2 · D.6 FAB Relance** · APK `1.0.32+32`  
Correctifs session : **MOB-ENT-01** · **WEB-LOGIN-01** · **EMU-LIVE-01** · **MOB-ARCH-01** (`flutter-mobile-app` UI kit)  
UI : [`/backoffice/pilotage`](http://localhost:5003/backoffice/pilotage)  
App prod Samsung : dossier **`mobile/`** · proto refactor UI : **`flutter-mobile-app/`**

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
