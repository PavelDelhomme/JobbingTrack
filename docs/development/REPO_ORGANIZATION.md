# Organisation du dépôt — scripts, docs, processus

Dernière mise à jour : 17 juin 2026  
Branche chantier : `chore/repo-scripts-docs-hygiene`  
Reprise validation mobile : **après** ce triage (étape 1 / 5 en pause — voir `STATUS.md`).

## Objectif

Réduire duplication, supprimer fichiers morts, clarifier l’arborescence **scripts/** / **tools/** / **tests/** et aligner **docs/** + **`make help`** avant tests finaux et prod.

Standards rédaction : [`DOCUMENTATION_STANDARDS.md`](DOCUMENTATION_STANDARDS.md).

## Problèmes constatés (exemples)

| Symptôme | Exemple | Action cible |
|----------|---------|--------------|
| Shim racine quasi vide | `scripts/env-align-with-example.cjs` → délègue à `scripts/env/` | Garder shim **documenté** ou supprimer après grep Makefile/CI |
| Dossier `scripts/` surchargé | ~90 fichiers mélangés | Sous-dossiers par domaine (voir Lot H `TODOS.md`) |
| Doc obsolète | Chemins `scripts/…` vs `scripts/mobile/…` | MAJ au déplacement, pas après |
| Doublons | Wrappers Make + script npm + copie shell | Une source de vérité + wrapper minimal |

## Arborescence cible (scripts/)

```
scripts/
├── README.md              # Index script → usage → doc (make help miroir)
├── env/                   # .env, alignement, secrets scan helpers
├── mobile/                # smokes, setup APK, ADB (déjà amorcé)
├── ops/                   # bootstrap admin, email agent, one-shot ops
├── db/                    # migrations, push, ensure-* 
├── testing/               # runners agrégés (hors tests/ Jest)
├── security/              # secrets-scan, audit
└── legacy/                # shims dépréciés (date sunset) — vide à terme
```

Règle : **aucun script sans** en-tête `# Usage:` + entrée dans `scripts/README.md` ou README du sous-dossier.

## Processus avant chaque validation porteur

1. Lire `PILOTAGE.md` → `TODOS_A_VALIDER.md` (file ouverte).
2. Agent : preuves dans `TODOS_A_VERIFIER.md`.
3. **Si déplacement script** : grep références (Makefile, CI, docs) **avant** merge.
4. Porteur : OK/KO sur comportement, pas sur structure seule.
5. Archiver OK → `TODOS_DONE.md`.

Pendant **triage repo** : pas de nouvelle feature mobile ; corrections KO validation uniquement.

## Phases de travail (cette branche)

| # | Lot | Contenu | Preuve |
|---|-----|---------|--------|
| 1 | H0 | Inventaire `scripts/` + `SCRIPTS_INVENTORY.md` à jour | grep + tableau README |
| 2 | H1 | Regrouper / supprimer morts ; shims documentés | CI smoke ciblés |
| 3 | H0 | Doc : hubs ≤ 150 lignes, liens INDEX/navigation | `DOCUMENTATION_STANDARDS.md` |
| 4 | H bis | Audit secrets (`.env` seule source) | secrets-scan |
| 5 | — | **Reprise** validation mobile étape 1 (`VALIDATION_ETAPE_1_INSCRIPTION.md`) | OK porteur ligne 319 |

## Fichiers pilotage liés

- [`../pilotage/TODOS.md`](../pilotage/TODOS.md) § Lot H, Lot E
- [`../pilotage/TODOS_A_VALIDER.md`](../pilotage/TODOS_A_VALIDER.md) — file mobile **en pause**
- [`../scripts/SCRIPTS_INVENTORY.md`](../scripts/SCRIPTS_INVENTORY.md)

## Make / CLI

- Cible Make = **alias documenté** ; procédure complète = markdown sous `docs/` ou `scripts/*/README.md`.
- Ne pas dupliquer la logique : Make appelle le script canonique sous `scripts/<domaine>/`.
