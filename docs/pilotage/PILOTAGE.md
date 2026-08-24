# Pilotage JobbingTrack

Dernière mise à jour : **24 août 2026**

## ▶ Où on en est

**Focus (1 seule) : DEPLOY-GHA-01** — DNS restant + Portainer + NPM sur **jobbingtrack.com** (style YTMusic)  
**Local** : MailHog UI **8125** (Cloudity Mailpit garde 8025) — ✅  
**DNS** : `@`/`www` ✅ · `api` / `preprod` / `api-preprod` ❌  
**Mobile** : OTA sur **Nothing Phone** après HTTPS préprod (étape J)  
**Après deploy** : **BACKEND-CLEAN-01** (mutualiser logger/email entre services) — pas maintenant  

Guide : **[`DEPLOY.md`](../../DEPLOY.md)** · Checklist **complète A→J** : [`TODOS.md`](TODOS.md) ▶ En cours  

MOB-HUB / MOB-LIST en pause jusqu’à préprod OK.

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
| **B** gate mobile | MOB-ENT OK → HUB/LIST en pause → reprise après deploy VPS |
| **C** déploiement | **DEPLOY-GHA-01 en cours** → DEPLOY-C1→C3 porteur |
| D backoffice | board Kanban |

## Règle agent

Lire ce fichier → **focus** Kanban / Point exact → `TODOS_A_TESTER`.  
Une tâche à la fois.

UI Kanban : classes sémantiques `@/lib/ui` (`jtKanban`) — pas de pastels Tailwind dans le board.
