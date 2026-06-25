# Standards documentation — JobbingTrack

Dernière mise à jour : 17 juin 2026

## Quand mettre à jour la doc

Obligatoire **avant** les tests finaux complets (`make tests`, gate `A_VALIDER_AVANT_PRODUCTION.md`) et **avant** déploiement préprod/prod, dans cet ordre de travail :

1. **Phase D — Lot H** : réorg scripts, tests, tools, syntaxe, sécurité dépôt.
2. **Phase D — Lot E** : revue et découpage des `.md`.
3. **Lot H bis** : audit secrets (`.env` seule source des valeurs réelles).

Toute modification de chemins, commandes, variables env, API ou parcours utilisateur **doit** être reflétée dans la doc **dans le même lot** — pas après merge prod.

## Règle de taille (fichiers `.md`)

| Type | Limite cible | Exemples |
|------|--------------|----------|
| **Hub / sujet unique** | **≤ 150 lignes** | `docs/mobile/VALIDATION_ETAPE_1_INSCRIPTION.md`, `docs/development/DOCKER_LOGS.md` |
| **Fiche technique** | **≤ 120 lignes** | README d’un sous-dossier `scripts/mobile/setup/` |
| **Exceptions (pas de plafond strict)** | Structurer par sections | `pilotage/TODOS.md`, `TODOS_A_VALIDER.md`, `TODOS_A_VERIFIER.md`, `TODOS_DONE.md`, `project/BACKLOG.md`, `troubleshooting/ERRORS.md`, `INDEX.md`, `navigation.md`, `project/PLAN.md`, `project/RESOLUTIONS.md`, `STATUS.md` |

Si un sujet dépasse **150 lignes** : **scinder** en plusieurs fichiers précis + lien depuis un hub court (ex. `docs/mobile/README.md` → fiches par validation).

## Contenu attendu

Chaque doc technique doit couvrir, quand applicable :

- **Quoi** — une seule responsabilité par fichier.
- **Pour qui** — porteur, agent, ops.
- **Prérequis** — stack, `.env`, appareil.
- **Commandes** — chemins réels (éviter « lancer make X » sans cible ; préférer script sous-jacent documenté).
- **Preuve** — ce qui prouve OK/KO (sortie smoke, capture, colonne `TODOS_A_VALIDER`).
- **Liens** — vers pilotage, pas de duplication des longues checklists.

## Parallèle avec `make help`

Pour chaque cible **Make** encore utilisée en doc ou ops :

1. Texte **`##`** ou commentaire de cible dans le `Makefile` = **résumé une ligne** (comme `make help`).
2. Doc détaillée = fichier sous `docs/development/` ou `scripts/<domaine>/README.md`.
3. Règle : **help Make = index** ; **markdown = procédure complète**.

Exemple : doc « rebuild APK mobile » → `bash scripts/mobile/setup/build-apk-debug.sh` + entrée équivalente dans `scripts/mobile/README.md` ; le Makefile ne duplique pas la checklist porteur.

## Code et fonctions

- **Backend / frontend** : JSDoc ou commentaire bloc sur fonctions publiques non évidentes (contrat API, effets BDD, sécurité).
- **Scripts Node/shell** : en-tête `# Usage:` + prérequis (10 lignes max en tête de fichier).
- **Flutter** : doc dart sur services exposés (`ApiService`, providers) — une phrase sur effet réseau / offline.

Ne pas documenter l’évident ; documenter ce qui casse en prod ou en validation porteur.

## Checklist agent (fin Lot H / avant gate prod)

- [ ] Aucun lien mort vers anciens chemins (`docs/TODOS.md` → stubs OK).
- [ ] Chaque script déplacé : grep références + MAJ doc + README domaine.
- [ ] Hubs ≤ 150 lignes ; sujets longs éclatés.
- [ ] `make help` (ou README scripts) aligné sur les commandes documentées.
- [ ] `STATUS.md` + `TODOS_A_VERIFIER.md` : preuves post-refonte.
- [ ] Porteur : revalidation ciblée si parcours mobile/backoffice touché.

## Fichiers liés

- Pilotage : [`../pilotage/PILOTAGE.md`](../pilotage/PILOTAGE.md)
- Lot E / H : [`../pilotage/TODOS.md`](../pilotage/TODOS.md) § Lot E, Lot H
- Gate prod : [`../production/A_VALIDER_AVANT_PRODUCTION.md`](../production/A_VALIDER_AVANT_PRODUCTION.md)
