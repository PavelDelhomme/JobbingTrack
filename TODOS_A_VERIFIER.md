# TODOs à vérifier par l’agent

Dernière mise à jour : 21 mai 2026

## Rôle

Ce fichier liste ce que l’agent doit vérifier techniquement avant de demander une validation porteur. Une ligne vérifiée par l’agent ne vaut pas validation produit.

## Vérifications ouvertes

| Priorité | Vérification agent | Preuve attendue | Statut |
|----------|--------------------|-----------------|--------|
| P0 | Cohérence du nouveau système de pilotage | Liens mis à jour vers `PILOTAGE.md`, `TODOS_A_VALIDER.md`, `TODOS_A_VERIFIER.md`; ancienne référence `A_VALIDER_VERIFIER.md` supprimée ou remplacée. | [x] |
| P0 | Règle Cursor de pilotage | `.cursor/rules/pilotage-validation.mdc` existe et impose la lecture du pilotage avant action. | [x] |
| P0 | Docs de suivi accessibles | `docs/README.md`, `docs/TODOS.md`, `docs/security/README.md`, `TRAITER_IMMEDIATEMENT.md` pointent vers les bons fichiers. | [x] |
| P1 | Validation frontend si fichier UI touché | `npm run type-check` OK ; `npm run lint` OK avec warnings historiques uniquement ; pas de Jest ciblé car changement de libellé statique seulement. | [x] |

## Vérifications récurrentes

- Lire `PILOTAGE.md` avant de choisir une prochaine tâche.
- Contrôler `TODOS_A_VALIDER.md` avant de commencer une feature.
- Si une validation porteur échoue, créer une tâche dans `docs/TODOS.md` et traiter ce problème avant la suite.
- Après chaque livrable, mettre à jour `TODOS_A_VERIFIER.md`, `TODOS_A_VALIDER.md` ou `TODOS_DONE.md` selon le cas.
