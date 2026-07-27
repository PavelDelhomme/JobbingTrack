# Pilotage JobbingTrack

Dernière mise à jour : **27 juillet 2026**

## ▶ Où on en est

**Focus (1 seule) : APK-BUILD-01** — Rebuild APK sans Zip `kernel_blob`  
Ensuite (pas « en cours ») : MOB-ENT-01 → MOB-SNACK-01 → D.6 → …

UI Kanban : **[`https://jobbingtrack.localhost:5443/backoffice/pilotage`](https://jobbingtrack.localhost:5443/backoffice/pilotage)** → onglet **Kanban**

## Kanban ADHD (règle d’or)

| Colonne | Sens | WIP |
|---------|------|-----|
| Inbox retours | Bugs/suggestions utilisateurs (app) | ∞ |
| Inbox erreurs | Crashes / erreurs auto | ∞ |
| **À faire** | Prêt, **pas démarré** | ∞ |
| **▶ En cours** | **UNE** carte focus | **1** |
| À tester | Preuves `TODOS_A_TESTER` | ∞ |
| À valider | Gate porteur `TODOS_A_VALIDER` | ∞ |
| À reprendre | KO / REWORK | ∞ |
| Plus tard | Reporté | ∞ |
| Terminées | OK / DONE | ∞ |

Ne mets **jamais** toute la file en « En cours ». Clique **En cours** sur **une** carte seulement.

## Fichiers sync live

| Fichier | Rôle |
|---------|------|
| `TODOS.md` | À faire / backlog |
| `TODOS_A_TESTER.md` | Preuves tests |
| `TODOS_A_VALIDER.md` | Validations + Point exact |
| `TODOS_DONE.md` | Archive OK |
| `validation-board.json` | Colonnes, focus, checklists — **ADMIN API only** (jamais `/public`) |
| `PILOTAGE.md` | Ce fichier |
| Docs liés (UI Fichiers) | `STATUS.md`, `BACKLOG.md`, `PLAN.md`, `ERRORS.md`, `RESOLUTIONS.md` |

Sécurité : `validation-board.json` et l’édition md passent uniquement par `/api/pilotage/*` (ADMIN+). Pas de static public pour le board.

Décisions UI (OK/KO/PARTIEL/Plus tard/REWORK) + **déplacement de colonne** → écriture md + JSON.

## Onglets UI

1. **Kanban** — colonnes + focus TDAH + inbox retours/erreurs  
2. **Liste détaillée** — suites / cycles / catalogues md  
3. **Vue synthèse** — snapshot  
4. **Fichiers bruts** — édition SUPER_ADMIN  

## Phases

| Phase | Statut |
|-------|--------|
| **B** gate mobile | Focus APK-BUILD → MOB-ENT → D.6… |
| C déploiement | parallèle |
| D backoffice | board Kanban |

## Règle agent

Lire ce fichier → **focus** Kanban / Point exact → `TODOS_A_TESTER`.  
Une tâche à la fois.

UI Kanban : classes sémantiques `@/lib/ui` (`jtKanban`) — pas de pastels Tailwind dans le board.
