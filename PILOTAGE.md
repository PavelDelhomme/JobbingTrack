# Pilotage JobbingTrack

Dernière mise à jour : 11 juin 2026 (mode avance rapide porteur — validations groupées en fin de lot)

## Règle principale

Avant toute nouvelle tâche, lire dans cet ordre :

1. `PILOTAGE.md`
2. `TODOS_A_VALIDER.md`
3. `TODOS_A_VERIFIER.md`
4. `docs/TODOS.md`
5. `BRANCHES.md`

Tant que `TODOS_A_VALIDER.md` contient une validation porteur bloquante non résolue, ne pas avancer sur une nouvelle fonctionnalité **sauf demande explicite du porteur de valider en lot plus tard**. Mode actuel (11/06) : le porteur autorise l’agent à **préparer plusieurs lignes P1** (preuves dans `TODOS_A_VERIFIER.md`) sans archiver dans `TODOS_DONE.md` tant que le OK explicite n’est pas donné. L’ordre de `TODOS_A_VALIDER.md` reste la file de validation ; l’agent peut implémenter/corriger en parallèle les sujets déjà ouverts (P1A tests offensifs, P1B temps de réponse, P1C menu Tests/Rapports, responsive).

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

Statut : **validation porteur locale en cours** — P0 HTTPS, Backoffice sécurité, Rapports sécurité, comparaison CVE, menaces lab, localisation CVE, alertes email critiques et **P1C sécurité titres/libellés/navigation** validés localement.

Exception porteur 15/06 : avant de reprendre les prochains lots produit, traiter en priorité le lot **P1D CI/PR/déploiement** : GitHub Actions opérationnelles sur `dev`/PR, PR ouvertes clarifiées, gate Prettier/type/lint/tests remis au vert, et trajectoire préprod Portainer documentée sans coût supplémentaire.

Priorité immédiate stricte :

1. Traiter le lot exceptionnel **P1D CI/PR/déploiement** demandé le 15/06 avant toute nouvelle fonctionnalité : workflows GitHub actifs et alignés sur `dev`, échec Prettier corrigé, jobs non masqués par des `skipped` injustifiés, PR #7 clarifiée/fermée ou reprise, stratégie préprod Portainer cadrée.
2. Reprendre ensuite la première ligne ouverte de `TODOS_A_VALIDER.md` : **Statistics — onglet Sécurité cohérent avec `/security`**.
3. Attendre validation explicite du porteur ou corriger le problème signalé.
4. Déplacer la ligne validée vers `TODOS_DONE.md`.
5. Passer seulement ensuite à la ligne suivante de `TODOS_A_VALIDER.md` (P1A/P1B/P1C/P1D, une ligne à la fois).
6. Reprendre `docs/TODOS.md` uniquement quand les validations porteur bloquantes sont validées ou explicitement reclassées.

## Flux de travail

1. L’agent fait une modification technique ou documentaire.
2. L’agent renseigne `TODOS_A_VERIFIER.md` pour ses preuves techniques.
3. Si le rendu ou le comportement doit être vu par le porteur, l’agent ajoute une ligne dans `TODOS_A_VALIDER.md`.
4. **Fin de lot obligatoire** : vérifier si les workflows GitHub doivent évoluer avec le lot, lancer/contrôler les checks adaptés, créer/mettre à jour une PR seulement pour les changements significatifs, puis envoyer le récap email des modifications via `notification-service` aux destinataires habituels. Ne pas avancer au lot suivant si la CI/PR du lot est cassée ou si le récap email n’est pas tracé clairement dans `TODOS_A_VERIFIER.md`.
5. Le porteur valide ou signale un problème.
6. Si validé : déplacer vers `TODOS_DONE.md`.
7. Si problème : créer ou remonter une tâche dans `docs/TODOS.md`, puis corriger avant d’avancer.
8. Pour préprod/prod : passer ensuite par `A_VALIDER_AVANT_PRODUCTION.md`, `DEPLOIEMENT_PRODUCTION.md`, puis `VALIDATION_PRODUCTION.md`.
9. **Fin de journée / avant push majeur** : gate suite complète documenté dans `TODOS_A_VALIDER.md` § « Gate technique fin de journée / avant push majeur » (`scripts/run-all-tests-with-reports.sh` + lecture `tests/results/<horodatage>/`). Ne pas le lancer au milieu d’un P0/P1 sauf demande explicite du porteur. Checklist longue : `docs/tests/TESTS_END.md`.

## Branches

Suivre `BRANCHES.md` :

- `docs/...` pour organisation documentaire et pilotage.
- `fix/...` pour bug ou régression.
- `feat/...` pour nouvelle fonctionnalité.
- `security/...` pour campagne sécurité dédiée.

Ne pas mélanger validation porteur, production et nouvelle feature dans un même commit si ce n’est pas le même sujet.
