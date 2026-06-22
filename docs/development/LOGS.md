# Logs de pilotage

Dernière mise à jour : 17 juin 2026

> **Logs Docker / `make logs` / bruit health checks** : voir **[DOCKER_LOGS.md](DOCKER_LOGS.md)** (commandes, `[undefined]`, filtres).

## Rôle

Journal court des décisions de pilotage. Le journal projet détaillé reste `docs/STATUS.md`; les erreurs connues restent `docs/ERRORS.md`.

## 8 juin 2026

- Demandes sécurité porteur ajoutées au pilotage : alertes email critiques JobbingTrack vers adresses dev/admin porteur, localisation réelle des CVE dans JobbingTrack (ex. `CVE-2026-49975`), tests offensifs contrôlés par conteneur/service (remote host, shell/command injection, URL injection, headers spoofing), et stratégie VPS/Portainer de réduction d’exposition / leurres contrôlés.
- `../pilotage/TODOS_A_VALIDER.md` garde la première ligne P0 **Comparaison de rapports sécurité (CVE)** ; les nouvelles demandes sont ajoutées à la suite (`P0` CVE applicatives, `P1A` sécurité ops, gates préprod/prod).
- Retour porteur comparaison CVE : chiffres énormes et difficilement actionnables (`331 critical`, `3300 high`), `Absent/skipped` peu clairs, `Échoué partout` trompeur. À faire : tri/filtres par exploitabilité/service, regroupement Docker/node, et flux séparé détails bruts sous réauth forte (jeton court non rejouable, audit, no-store).

## 21 mai 2026 (suite)

- Validation porteur P0 : **Accès HTTPS local complet** — confirmé par le porteur ; archivé dans `../pilotage/TODOS_DONE.md`, retiré de `../pilotage/TODOS_A_VALIDER.md`.
- Prochaine ligne ouverte : **Backoffice sécurité utilisable**.
- Retour porteur P0 **Backoffice sécurité utilisable** : navigation/titres OK, mais correction demandée sur Firewall (déblocage IP en 400, rafraîchissement règles après édition). Notes forensics lab reportées dans `docs/TODOS.md`.
- Correctif Firewall ajouté : règles créées/modifiées depuis le backoffice obligatoirement ciblées par IP source ; port destination optionnel uniquement pour restreindre cette IP. Test backend ciblé 6/6 OK, type-check/lint frontend OK.
- Validation porteur P0 : **Backoffice sécurité utilisable** — confirmé par le porteur (modification IP règle OK) ; archivé dans `../pilotage/TODOS_DONE.md`. Prochaine ligne : **Rapports sécurité** dans `/b4ck0ff1ce/test-reports`.
- Retour porteur P0 **Rapports sécurité visibles** : anciens rapports CVE visibles mais pas de rapport frais attendu. Génération locale effectuée via `python3 scripts/security/cve-scan.py --output-dir tests/results/security --timeout-sec 60` ; l’API liste `security-results-cve-20260521-201336`.
- Retour porteur complémentaire : validation partielle côté rapports sécurité, rendu CVE/PDF trop brut par rapport aux rapports de tests classiques ; amélioration UX reportée dans `docs/TODOS.md`.
- Correctif UX rapports sécurité : `summary.md` CVE rendu en HTML structuré (cartes synthèse, priorités, tableau responsive, brut repliable) dans `/api/test-reports/view`.
- Validation porteur P0 : **Rapports sécurité visibles dans le backoffice** — confirmé par le porteur ; archivé dans `../pilotage/TODOS_DONE.md`.
- Pilotage : section **Gate technique fin de journée / avant push majeur** ajustée dans `../pilotage/TODOS_A_VALIDER.md` (suite `run-all-tests-with-reports.sh`, preuve `tests/results/<horodatage>/`, ligne P1D). Décision 21/05 : ne pas lancer la campagne complète pendant le P0 courant ; garder les tests ciblés puis faire le gate complet en fin de session.
- Régression porteur : **comparaison rapports CVE** (`Rapport non trouvé`, puis comparaison `0` partout / trop pauvre) — correctif `resolveReport.ts` + compare route + UI dédiée sécurité (surfaces, Critical/High/Medium/Low/Info, écarts). L’API de comparaison ne renvoie pas les notes/payloads bruts et force `no-store`.

## 21 mai 2026

- Mise en place d’un flux bloquant : `PILOTAGE.md` → `../pilotage/TODOS_A_VALIDER.md` → `../pilotage/TODOS_A_VERIFIER.md` → `docs/TODOS.md`.
- Séparation des validations locales porteur (`../pilotage/TODOS_A_VALIDER.md`), validations faites (`../pilotage/TODOS_DONE.md`) et gates préprod/prod (`A_VALIDER_AVANT_PRODUCTION.md`, `DEPLOIEMENT_PRODUCTION.md`, `VALIDATION_PRODUCTION.md`).
- Règle décidée : ne pas avancer sur une nouvelle feature tant qu’un P0 porteur reste ouvert dans `../pilotage/TODOS_A_VALIDER.md`.
