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
| P0 | Correctif Firewall backoffice | Déblocage IP + garde-fous règles globales couverts par `env npm test -- --runTestsByPath tests/firewall-unblock-ip.test.js --verbose --runInBand` OK (6/6) ; `env npm run type-check` OK ; `env npm run lint` OK avec warnings historiques uniquement. | [x] |
| P0 | Rapport sécurité frais pour backoffice | `python3 scripts/security/cve-scan.py --output-dir tests/results/security --timeout-sec 60` OK ; API `/api/test-reports/all` liste `security-results-cve-20260521-201336` en premier ; `/api/test-reports/view` OK ; `/api/test-reports/download` OK (`cve-20260521-201336-summary.md`). | [x] |
| P1 | UX rendu rapports sécurité | Rendu CVE Markdown amélioré dans `/api/test-reports/view` : cartes synthèse, priorités à trier, tableau responsive, markdown brut repliable ; `env npm run type-check` OK ; `env npm run lint` OK avec warnings historiques ; smoke API view OK. | [x] |
| P1 | Validation frontend si fichier UI touché | `env npm run type-check` OK ; `env npm run lint` OK avec warnings historiques uniquement ; pas de Jest frontend ciblé existant pour `firewall/page.tsx`. | [x] |

## Vérifications récurrentes

- Lire `PILOTAGE.md` avant de choisir une prochaine tâche.
- Contrôler `TODOS_A_VALIDER.md` avant de commencer une feature.
- Ne travailler que sur la première ligne ouverte de `TODOS_A_VALIDER.md`; attendre validation porteur avant la suivante.
- Si une validation porteur échoue, créer une tâche dans `docs/TODOS.md` et traiter ce problème avant la suite.
- Après chaque livrable, mettre à jour `TODOS_A_VERIFIER.md`, `TODOS_A_VALIDER.md` ou `TODOS_DONE.md` selon le cas.
