# Pilotage JobbingTrack

Dernière mise à jour : **27 juillet 2026**

## ▶ Où on en est

**Focus (1 seule) : MOB-ENT-01** — fiche entreprise = hub lié  
Liste : plus de CTA « Voir candidatures & contacts ».  
Détail Capgemini : candidatures + contacts + **relances** + **entretiens** + **appels**.  
APK **1.0.39** · Ensuite : MOB-SNACK-01 → D.6 · Parallèle DEPLOY-C*

UI Kanban : badges = **colonne**. Rafraîchir `/backoffice/pilotage`.

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
Coche « Afficher colonnes calmes » pour voir **Plus tard** / **OK**. Après APK-BUILD → **MOB-ENT** (Rework) ou **MOB-SNACK** / **D.6** / **DEPLOY-C*** (À faire).

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
