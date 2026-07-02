# Pilotage JobbingTrack

Point d’entrée pour le flux porteur / agent.

## Porteur (validation produit)

| Fichier | Rôle |
|---------|------|
| **[GUIDE_VALIDATION_PORTEUR.md](GUIDE_VALIDATION_PORTEUR.md)** | **Commencer ici** — checklist étape par étape (mobile 1→5, VPS) |
| **[TODOS_A_VALIDER.md](TODOS_A_VALIDER.md)** | Registre officiel OK/KO + archivage |
| **[PILOTAGE.md](PILOTAGE.md)** | Ordre des phases A→E |

## Agent + historique

| Ordre | Fichier | Rôle |
|------|---------|------|
| 1 | **[PILOTAGE.md](PILOTAGE.md)** | Source de vérité du flux et règles bloquantes |
| 2 | **[TODOS_A_VALIDER.md](TODOS_A_VALIDER.md)** | Ce que le **porteur** doit valider manuellement |
| 3 | **[TODOS_A_VERIFIER.md](TODOS_A_VERIFIER.md)** | Ce que l’agent doit vérifier techniquement |
| 4 | **[TODOS_DONE.md](TODOS_DONE.md)** | Archivage après OK porteur explicite |
| 5 | **[TRAITER_IMMEDIATEMENT.md](TRAITER_IMMEDIATEMENT.md)** | Checklist agent en début de session |

Backlog technique (**pas** validation porteur) : **[TODOS.md](TODOS.md)**.

Production / préprod : **[../production/](../production/)** — **commencer par** [`PORTEUR_ACTIONS_DEPLOIEMENT.md`](../production/PORTEUR_ACTIONS_DEPLOIEMENT.md) (checklist porteur VPS + OTA), puis `A_VALIDER_AVANT_PRODUCTION.md`, `DEPLOIEMENT_PRODUCTION.md`, `VALIDATION_PRODUCTION.md`.

Git et logs dev : **[../development/BRANCHES.md](../development/BRANCHES.md)**, **[../development/LOGS.md](../development/LOGS.md)** (journal pilotage), **[../development/DOCKER_LOGS.md](../development/DOCKER_LOGS.md)** (commandes Docker / make logs).
