# Logs de pilotage

Dernière mise à jour : 21 mai 2026

## Rôle

Journal court des décisions de pilotage. Le journal projet détaillé reste `docs/STATUS.md`; les erreurs connues restent `docs/ERRORS.md`.

## 21 mai 2026

- Mise en place d’un flux bloquant : `PILOTAGE.md` → `TODOS_A_VALIDER.md` → `TODOS_A_VERIFIER.md` → `docs/TODOS.md`.
- Séparation des validations locales porteur (`TODOS_A_VALIDER.md`), validations faites (`TODOS_DONE.md`) et gates préprod/prod (`A_VALIDER_AVANT_PRODUCTION.md`, `DEPLOIEMENT_PRODUCTION.md`, `VALIDATION_PRODUCTION.md`).
- Règle décidée : ne pas avancer sur une nouvelle feature tant qu’un P0 porteur reste ouvert dans `TODOS_A_VALIDER.md`.
