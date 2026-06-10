# Pilotage JobbingTrack

Dernière mise à jour : 11 juin 2026 (P1A alertes email validé porteur ; prochaine ligne : tests offensifs contrôlés)

## Règle principale

Avant toute nouvelle tâche, lire dans cet ordre :

1. `PILOTAGE.md`
2. `TODOS_A_VALIDER.md`
3. `TODOS_A_VERIFIER.md`
4. `docs/TODOS.md`
5. `BRANCHES.md`

Tant que `TODOS_A_VALIDER.md` contient une validation porteur bloquante non résolue, ne pas avancer sur une nouvelle fonctionnalité. L’agent doit traiter **uniquement la première ligne ouverte** de `TODOS_A_VALIDER.md`. Exceptions autorisées : corriger un problème remonté par le porteur sur cette ligne, mettre à jour le pilotage, ou préparer une preuve nécessaire à cette validation précise. Ne pas lancer les validations suivantes en parallèle.

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

Statut : **validation porteur locale en cours** — P0 HTTPS, Backoffice sécurité, Rapports sécurité, comparaison CVE, menaces lab, localisation CVE et alertes email critiques validés localement.

Priorité immédiate stricte :

1. Traiter la première ligne ouverte de `TODOS_A_VALIDER.md` : **Tests offensifs contrôlés par conteneur JobbingTrack**.
2. Attendre validation explicite du porteur ou corriger le problème signalé.
3. Déplacer la ligne validée vers `TODOS_DONE.md`.
4. Passer seulement ensuite à la ligne suivante de `TODOS_A_VALIDER.md` (P1A/P1B/P1C, une ligne à la fois).
5. Reprendre `docs/TODOS.md` uniquement quand les validations porteur bloquantes sont validées ou explicitement reclassées.

## Flux de travail

1. L’agent fait une modification technique ou documentaire.
2. L’agent renseigne `TODOS_A_VERIFIER.md` pour ses preuves techniques.
3. Si le rendu ou le comportement doit être vu par le porteur, l’agent ajoute une ligne dans `TODOS_A_VALIDER.md`.
4. Le porteur valide ou signale un problème.
5. Si validé : déplacer vers `TODOS_DONE.md`.
6. Si problème : créer ou remonter une tâche dans `docs/TODOS.md`, puis corriger avant d’avancer.
7. Pour préprod/prod : passer ensuite par `A_VALIDER_AVANT_PRODUCTION.md`, `DEPLOIEMENT_PRODUCTION.md`, puis `VALIDATION_PRODUCTION.md`.
8. **Fin de journée / avant push majeur** : gate suite complète documenté dans `TODOS_A_VALIDER.md` § « Gate technique fin de journée / avant push majeur » (`scripts/run-all-tests-with-reports.sh` + lecture `tests/results/<horodatage>/`). Ne pas le lancer au milieu d’un P0/P1 sauf demande explicite du porteur. Checklist longue : `docs/tests/TESTS_END.md`.

## Branches

Suivre `BRANCHES.md` :

- `docs/...` pour organisation documentaire et pilotage.
- `fix/...` pour bug ou régression.
- `feat/...` pour nouvelle fonctionnalité.
- `security/...` pour campagne sécurité dédiée.

Ne pas mélanger validation porteur, production et nouvelle feature dans un même commit si ce n’est pas le même sujet.
