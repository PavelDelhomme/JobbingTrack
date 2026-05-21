# Pilotage JobbingTrack

Dernière mise à jour : 21 mai 2026

## Règle principale

Avant toute nouvelle tâche, lire dans cet ordre :

1. `PILOTAGE.md`
2. `TODOS_A_VALIDER.md`
3. `TODOS_A_VERIFIER.md`
4. `docs/TODOS.md`
5. `BRANCHES.md`

Tant que `TODOS_A_VALIDER.md` contient une validation porteur bloquante non résolue, ne pas avancer sur une nouvelle fonctionnalité. Exceptions autorisées : corriger un problème remonté par le porteur, mettre à jour le pilotage, ou préparer une preuve nécessaire à la validation.

## Rôle des fichiers

| Fichier | Rôle |
|---------|------|
| `PILOTAGE.md` | Point d’entrée obligatoire et état du flux. |
| `TODOS_A_VALIDER.md` | Validations porteur locales/visuelles/fonctionnelles à faire avant la suite. |
| `TODOS_A_VERIFIER.md` | Vérifications techniques agent avant de demander une validation porteur. |
| `TODOS_DONE.md` | Éléments validés par le porteur, archivés proprement. |
| `docs/TODOS.md` | Backlog technique ordonné, pas une preuve de validation produit. |
| `A_VALIDER_AVANT_PRODUCTION.md` | Gate préprod/prod à exécuter après validations locales. |
| `DEPLOIEMENT_PRODUCTION.md` | Éléments préparés/déployés en préprod/prod mais pas encore validés production. |
| `VALIDATION_PRODUCTION.md` | Éléments validés en préprod/prod réelle. |
| `docs/STATUS.md` | Journal de ce qui a été fait et validé techniquement. |
| `docs/BACKLOG.md` | Idées, dettes et sujets reportés hors file courte. |
| `BRANCHES.md` | Conventions branches/commits. |

## État actuel

Statut : **validation porteur locale à vider avant reprise de nouvelles features**.

Priorité immédiate :

1. Valider accès HTTPS/backoffice et pages sécurité/statistiques listées dans `TODOS_A_VALIDER.md`.
2. Valider ou bloquer les rapports sécurité backoffice.
3. Décider le traitement des menaces historiques/lab sans purge automatique.
4. Seulement ensuite reprendre les tâches techniques de `docs/TODOS.md`.

## Flux de travail

1. L’agent fait une modification technique ou documentaire.
2. L’agent renseigne `TODOS_A_VERIFIER.md` pour ses preuves techniques.
3. Si le rendu ou le comportement doit être vu par le porteur, l’agent ajoute une ligne dans `TODOS_A_VALIDER.md`.
4. Le porteur valide ou signale un problème.
5. Si validé : déplacer vers `TODOS_DONE.md`.
6. Si problème : créer ou remonter une tâche dans `docs/TODOS.md`, puis corriger avant d’avancer.
7. Pour préprod/prod : passer ensuite par `A_VALIDER_AVANT_PRODUCTION.md`, `DEPLOIEMENT_PRODUCTION.md`, puis `VALIDATION_PRODUCTION.md`.

## Branches

Suivre `BRANCHES.md` :

- `docs/...` pour organisation documentaire et pilotage.
- `fix/...` pour bug ou régression.
- `feat/...` pour nouvelle fonctionnalité.
- `security/...` pour campagne sécurité dédiée.

Ne pas mélanger validation porteur, production et nouvelle feature dans un même commit si ce n’est pas le même sujet.
