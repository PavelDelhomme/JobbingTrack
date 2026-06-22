# Documentation JobbingTrack

[Retour au README principal](../README.md) | **[STATUS — état courant](STATUS.md)** | [Navigation](navigation.md) | [Index](INDEX.md)

Dernière mise à jour : 22 juin 2026

Ce dossier centralise la documentation. **Point d’entrée produit** : **[STATUS.md](STATUS.md)** (où en est le projet, priorités, faits récents).

## À lire en premier

1. **[STATUS.md](STATUS.md)** — état courant, priorités, journal des livraisons.
2. **[pilotage/PILOTAGE.md](pilotage/PILOTAGE.md)** — flux porteur/agent (obligatoire avant une tâche).
3. **[pilotage/TODOS_A_VALIDER.md](pilotage/TODOS_A_VALIDER.md)** — validations porteur bloquantes.
4. **[pilotage/TODOS.md](pilotage/TODOS.md)** — backlog technique ordonné (cases à cocher).
5. **[project/PLAN.md](project/PLAN.md)** — plan global par lots A–H.

## Fichiers de suivi (rôles)

| Fichier | Rôle |
|---------|------|
| [STATUS.md](STATUS.md) | **État du projet** — à suivre en premier |
| [pilotage/TODOS.md](pilotage/TODOS.md) | Tâches à faire, ordre de travail |
| [project/PLAN.md](project/PLAN.md) | Plan complet, lots, validation porteur |
| [project/BACKLOG.md](project/BACKLOG.md) | Backlog agile (reporté, dettes) |
| [project/RESOLUTIONS.md](project/RESOLUTIONS.md) | Résolutions et correctifs actés |
| [troubleshooting/ERRORS.md](troubleshooting/ERRORS.md) | Erreurs actives, pièges connus |
| [INDEX.md](INDEX.md) | Index thématique (GitHub, recherche rapide) |
| [navigation.md](navigation.md) | Liens partagés entre README de sous-dossiers |

> Les fichiers `PLAN.md`, `TODOS.md`, `BACKLOG.md`, `RESOLUTIONS.md`, `ERRORS.md` **à la racine de `docs/`** sont des **redirects** vers les chemins ci-dessus (compatibilité des anciens liens).

## Validation et production

- [À valider par le porteur](pilotage/TODOS_A_VALIDER.md)
- [Validé par le porteur](pilotage/TODOS_DONE.md)
- [À valider avant production](production/A_VALIDER_AVANT_PRODUCTION.md)
- [Checklist preprod / production](operations/PREPROD_PRODUCTION_CHECKLIST.md)

## Structure `docs/`

```text
docs/
├── README.md              ← ce fichier
├── STATUS.md              ← ÉTAT COURANT (hub principal)
├── INDEX.md               ← index thématique
├── navigation.md          ← liens partagés
├── PLAN.md … ERRORS.md    ← redirects (compatibilité)
├── _meta/                 ← generate-pdfs.js, pdf-style.css (voir _meta/README.md)
├── pilotage/              ← PILOTAGE, TODOS, TODOS_A_*
├── project/               ← PLAN, BACKLOG, RESOLUTIONS (voir project/README.md)
├── production/            ← gate préprod/prod
├── development/           ← BRANCHES, LOGS, DOCKER_LOGS
├── troubleshooting/       ← ERRORS.md, runbooks login/Postgres
├── mobile/ · security/ · tests/ · deployment/ …
└── archive/               ← docs obsolètes conservées
```

Audit et restructuration : [operations/DOCUMENTATION_AUDIT_PLAN.md](operations/DOCUMENTATION_AUDIT_PLAN.md) · [project/STRUCTURE_DOCUMENTATION.md](project/STRUCTURE_DOCUMENTATION.md)

## Démarrage technique

- [Getting started](getting-started/README.md)
- [Variables d'environnement](deployment/environment-variables/README.md)
- [Émulateur mobile + ADB](mobile/EMULATEUR_ADB.md)
- [Tests](tests/README.md)
