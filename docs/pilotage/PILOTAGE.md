# Pilotage JobbingTrack

Dernière mise à jour : **19 août 2026**

## ▶ Où on en est

**Focus (1 seule) : MOB-HUB-01** — hubs détail + liens croisés  
**MOB-LIST-01** → **À valider** (métadonnées listes APK 1.0.40+) — **re-test en même temps que HUB**  
**MOB-ENT-01** → **OK**

Suite : **MOB-NAV-01** → **MOB-SNACK-01** → **D.6** FAB · Parallèle DEPLOY-C*

APK **1.0.42** · Rebuild/install Samsung si absent · Pilotage : https://jobbingtrack.localhost:5443/backoffice/pilotage

**19/08** : tests agent relancés (front OK, stack OK, Samsung **non branché**) — **validation porteur MOB-HUB pas encore faite** (checklist Kanban 0/6).

Correctifs 04/08 (pour pouvoir valider HUB) : **nouvel onglet backoffice** sans refresh de la page source ; **build APK** anti-Zip `kernel_blob` (purge `compressed_assets` seulement + dependsOn copyFlutter). Warning Kotlin/KGP = non bloquant (`builtInKotlin=false`).

**10/08** : lenteur `/backoffice/pilotage` → carte **PILOTAGE-PERF** (À tester) + quick-wins (crashes summary, inbox différée). Focus reste **MOB-HUB-01**.

**10/08** : carte **AUDIT-QA-01** (Plus tard) + checklist [`AUDIT_QA_EXHAUSTIF.md`](AUDIT_QA_EXHAUSTIF.md) — audit boutons/pages/API/délais/erreurs USER+ADMIN · DEV+PROD · web+mobile. **Ne pas démarrer** avant fin gate B.

`make run-mobile` : étapes **1/5…5/5**. Sans rebuild : `SKIP_BUILD=1 make run-mobile`

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

**UI** : clic carte → **fiche à droite** (desktop ≥1024px) ou **popup** (mobile). Déplacement = sélecteur / recherche de colonne (une carte = une colonne).

### Ce que le Kanban n’est pas

Le board est une **file phase active** (curated), **pas** un dump de tous les `.md` de `docs/`.  
`docs/pilotage/TODOS.md` + backlog BL-26 / PLAN restent la source large ; seules les cartes seedées apparaissent.  
Coche « Afficher colonnes calmes » pour voir **Plus tard** / **OK**.

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
| **B** gate mobile | MOB-ENT OK → LIST à valider → **HUB en cours** → NAV → snacks/FAB |
| C déploiement | parallèle |
| D backoffice | board Kanban |

## Règle agent

Lire ce fichier → **focus** Kanban / Point exact → `TODOS_A_TESTER`.  
Une tâche à la fois.

UI Kanban : classes sémantiques `@/lib/ui` (`jtKanban`) — pas de pastels Tailwind dans le board.
