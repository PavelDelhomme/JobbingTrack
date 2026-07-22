# Pilotage JobbingTrack

Dernière mise à jour : **22 juillet 2026**

> **Porteur — par où commencer ?**  
> **[`GUIDE_VALIDATION_PORTEUR.md`](GUIDE_VALIDATION_PORTEUR.md)** → puis [`TODOS_A_VALIDER.md`](TODOS_A_VALIDER.md)  
> **Position exacte** : **Phase B · Étape 2 (B2) · D — FAB · D.6 Relance**  
> **Ne pas** valider via [`TODOS.md`](TODOS.md) (backlog agent).

## Feuille de route — ordre strict

| Phase | Contenu | Statut | Règle |
|-------|---------|--------|-------|
| **A — Mobile Lot D** | App Flutter, smokes, hub admin | En cours via B | Code + smokes agent |
| **B — Gate pré-prod mobile** | Validations porteur **B1→B5** | **B2 active → D.6** | Une étape à la fois ; OK explicite |
| **C — Déploiement VPS / OTA** | Portainer, NPM, releases | Préparé — porteur VPS | Parallèle de B |
| **D — Triage / P1B–P1C backoffice** | UX, graphes, Statistics | **Reporté** | Après clôture B (sauf correctif bloquant) |
| **E — Plateforme admin OSS** | Extraction Cloudity | Après prod | Ne pas démarrer avant A+B+C |

**Travail porteur — deux files** :

1. **Mobile B** : guide § B2-D.6 → débloquer SMTP B3  
2. **Déploiement C** : [`PORTEUR_ACTIONS_DEPLOIEMENT.md`](../production/PORTEUR_ACTIONS_DEPLOIEMENT.md)

## Rôle des fichiers

| Fichier | Rôle |
|---------|------|
| `PILOTAGE.md` | Point d’entrée + phases |
| `TODOS_A_VALIDER.md` | Validations porteur (**position exacte B2-D.6**) |
| `TODOS_A_VERIFIER.md` | Preuves techniques agent |
| `TODOS_DONE.md` | OK porteur archivés |
| `TODOS.md` | Backlog technique agent (pas validation produit) |
| `GUIDE_VALIDATION_PORTEUR.md` | Checklist Samsung étape par étape |

## Règle principale

Avant toute tâche : `PILOTAGE` → `TODOS_A_VALIDER` → `TODOS_A_VERIFIER` → `TODOS.md`.

Tant qu’une validation **bloquante** mobile (B1–B5) est ouverte : pas de nouvelle feature hors phase A, sauf demande explicite.  
P1A/P1B/P1C backoffice = **phase D**, reportés.

## État actuel (22/07)

- **B1** inscription ✅  
- **B2** : A/B/C ✅ · **D.6 Relance ▶** · E/F ⏸ · APK **1.0.31+31**  
- Crash Flutter Relances corrigé (ShellTabRegistry post-frame)  
- P1C partiel (mode sombre / popup / couleurs conteneurs) noté ; backlog graphes % + budget mémoire 101 Go  
- Synthèse Performances : sanitize % absurdes (axes Y) livré agent — re-check porteur après refresh  

## Flux

1. Porteur valide le **point exact** indiqué dans `TODOS_A_VALIDER` (`OK Étape2-D6…`)  
2. Agent corrige si KO, preuves dans `TODOS_A_VERIFIER`  
3. OK global étape → archive `TODOS_DONE` → étape suivante  
