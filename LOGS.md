# Logs de pilotage

Dernière mise à jour : 21 mai 2026

## Rôle

Journal court des décisions de pilotage. Le journal projet détaillé reste `docs/STATUS.md`; les erreurs connues restent `docs/ERRORS.md`.

## 21 mai 2026 (suite)

- Validation porteur P0 : **Accès HTTPS local complet** — confirmé par le porteur ; archivé dans `TODOS_DONE.md`, retiré de `TODOS_A_VALIDER.md`.
- Prochaine ligne ouverte : **Backoffice sécurité utilisable**.
- Retour porteur P0 **Backoffice sécurité utilisable** : navigation/titres OK, mais correction demandée sur Firewall (déblocage IP en 400, rafraîchissement règles après édition). Notes forensics lab reportées dans `docs/TODOS.md`.
- Correctif Firewall ajouté : règles créées/modifiées depuis le backoffice obligatoirement ciblées par IP source ; port destination optionnel uniquement pour restreindre cette IP. Test backend ciblé 6/6 OK, type-check/lint frontend OK.
- Validation porteur P0 : **Backoffice sécurité utilisable** — confirmé par le porteur (modification IP règle OK) ; archivé dans `TODOS_DONE.md`. Prochaine ligne : **Rapports sécurité** dans `/b4ck0ff1ce/test-reports`.
- Retour porteur P0 **Rapports sécurité visibles** : anciens rapports CVE visibles mais pas de rapport frais attendu. Génération locale effectuée via `python3 scripts/security/cve-scan.py --output-dir tests/results/security --timeout-sec 60` ; l’API liste `security-results-cve-20260521-201336`.
- Retour porteur complémentaire : validation partielle côté rapports sécurité, rendu CVE/PDF trop brut par rapport aux rapports de tests classiques ; amélioration UX reportée dans `docs/TODOS.md`.
- Correctif UX rapports sécurité : `summary.md` CVE rendu en HTML structuré (cartes synthèse, priorités, tableau responsive, brut repliable) dans `/api/test-reports/view`.
- Validation porteur P0 : **Rapports sécurité visibles dans le backoffice** — confirmé par le porteur ; archivé dans `TODOS_DONE.md`.
- Pilotage : section **Gate technique fin de journée / avant push majeur** ajustée dans `TODOS_A_VALIDER.md` (suite `run-all-tests-with-reports.sh`, preuve `tests/results/<horodatage>/`, ligne P1D). Décision 21/05 : ne pas lancer la campagne complète pendant le P0 courant ; garder les tests ciblés puis faire le gate complet en fin de session.
- Régression porteur : **comparaison rapports CVE** (`Rapport non trouvé`, puis comparaison `0` partout / trop pauvre) — correctif `resolveReport.ts` + compare route + UI dédiée sécurité (surfaces, Critical/High/Medium/Low/Info, écarts). L’API de comparaison ne renvoie pas les notes/payloads bruts et force `no-store`.

## 21 mai 2026

- Mise en place d’un flux bloquant : `PILOTAGE.md` → `TODOS_A_VALIDER.md` → `TODOS_A_VERIFIER.md` → `docs/TODOS.md`.
- Séparation des validations locales porteur (`TODOS_A_VALIDER.md`), validations faites (`TODOS_DONE.md`) et gates préprod/prod (`A_VALIDER_AVANT_PRODUCTION.md`, `DEPLOIEMENT_PRODUCTION.md`, `VALIDATION_PRODUCTION.md`).
- Règle décidée : ne pas avancer sur une nouvelle feature tant qu’un P0 porteur reste ouvert dans `TODOS_A_VALIDER.md`.
