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
| Shim racine env | ~~9 wrappers~~ supprimés 17/06 | Make + docs → **`scripts/env/`** uniquement |
| Dossier `scripts/` surchargé | ~90 fichiers mélangés | Sous-dossiers par domaine (voir Lot H `TODOS.md`) |
| Doc obsolète | Chemins `scripts/…` vs `scripts/mobile/…` | MAJ au déplacement, pas après |
| Doublons | Wrappers Make + script npm + copie shell | Une source de vérité + wrapper minimal |

## État après Lot H1 (17/06)

| Zone | Fichiers | Verdict |
|------|----------|---------|
| Racine `scripts/` | `README.md` + `run-all-tests-with-reports.sh` | OK — plus de doublons env |
| `scripts/env/` | 11 fichiers (`.cjs` + `.js` + `.sh`) | **Canonique** pour `.env` |
| `scripts/mobile/` | ~90 fichiers | Le plus gros volume ; sous-dossiers `lib/setup/smoke/email/test` |
| `scripts/db/` vs `database/` | 16 shell/SQL vs 3 Node legacy | Ne pas fusionner — rôles différents |
| `scripts/ops/` | 30 fichiers | Bootstrap agent, rapports HTML, inventaire — candidat tri H2 |
| `scripts/fixes/` | ~~5 correctifs~~ | **Archivé** → `scripts/legacy/fixes/` |
| `scripts/utils/` | 13 utilitaires | Plusieurs `debug-*` / `test-*` legacy DB |

### Prochain lot (reste — avant prod)

1. Lot H bis — audit secrets (`scripts/security/secrets-scan.sh`).
2. Lot E — revue doc complète.
3. Pas de fusion `database/` → `db/` sans revue migration Node.

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
| 1 | H0 | Inventaire `scripts/` + `SCRIPTS_INVENTORY.md` à jour | **17/06** : `inventory-scripts.cjs` 250 scripts ; wrappers env/mobile documentés ; audit § mobile dans `NON_REFERENCED_SCRIPTS_AUDIT.md` |
| 2 | H1 | Regrouper / supprimer morts ; shims documentés | **17/06** : wrappers env supprimés ; Make → `scripts/env/` |
| 2b | H2 | Archivage legacy + tri ops | **17/06** : `scripts/legacy/` (fixes, utils debug, migrations, campagnes ops, HTML) ; `@used-by` mobile/lib ; inventaire `@used-by` |
| 3 | H0 | Doc : hubs ≤ 150 lignes, liens INDEX/navigation | **17/06** : INDEX scripts + legacy ; détail hubs = lot avant prod |
| 4 | H bis | Audit secrets (`.env` seule source) | secrets-scan — **avant prod** |
| 5 | — | **Reprise** validation mobile étape 1 | **EN COURS** — porteur Samsung |

## Fichiers pilotage liés

- [`../pilotage/TODOS.md`](../pilotage/TODOS.md) § Lot H, Lot E
- [`../pilotage/TODOS_A_VALIDER.md`](../pilotage/TODOS_A_VALIDER.md) — file mobile **en pause**
- [`../scripts/SCRIPTS_INVENTORY.md`](../scripts/SCRIPTS_INVENTORY.md)

## Make / CLI

- Cible Make = **alias documenté** ; procédure complète = markdown sous `docs/` ou `scripts/*/README.md`.
- Ne pas dupliquer la logique : Make appelle le script canonique sous `scripts/<domaine>/`.
