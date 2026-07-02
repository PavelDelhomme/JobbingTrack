# Documentation JobbingTrack

[Retour au README principal](../README.md) | **[STATUS — état courant](STATUS.md)** | [Navigation](navigation.md) | [Index](INDEX.md)

Dernière mise à jour : 2 juillet 2026

Ce dossier centralise la documentation. **Point d’entrée produit** : **[STATUS.md](STATUS.md)** (où en est le projet, priorités, faits récents).

## À lire en premier

**Porteur (validation produit)** :

1. **[pilotage/GUIDE_VALIDATION_PORTEUR.md](pilotage/GUIDE_VALIDATION_PORTEUR.md)** — **checklist mobile étape par étape** (étape 2 active).
2. **[pilotage/TODOS_A_VALIDER.md](pilotage/TODOS_A_VALIDER.md)** — cocher / répondre OK ou KO.

**Vue globale** :

1. **[STATUS.md](STATUS.md)** — état courant, priorités.
2. **[pilotage/PILOTAGE.md](pilotage/PILOTAGE.md)** — flux porteur/agent.

**Agent / backlog** (ne pas confondre avec validation porteur) :

- **[pilotage/TODOS.md](pilotage/TODOS.md)** — backlog technique.
- **[project/PLAN.md](project/PLAN.md)** — plan global par lots A–H.

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

- [**Guide validation porteur (mobile 1→5)**](pilotage/GUIDE_VALIDATION_PORTEUR.md) ← **commencer ici**
- [À valider par le porteur](pilotage/TODOS_A_VALIDER.md)
- [Validé par le porteur](pilotage/TODOS_DONE.md)
- [**Actions porteur déploiement VPS**](production/PORTEUR_ACTIONS_DEPLOIEMENT.md) ← checklist exacte
- [À valider avant production](production/A_VALIDER_AVANT_PRODUCTION.md)
- [Suivi déploiement](production/DEPLOIEMENT_PRODUCTION.md)
- [Stack Portainer](production/PORTAINER_STACK.md)
- [Pipeline mobile OTA](production/MOBILE_RELEASE_PIPELINE.md)
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
