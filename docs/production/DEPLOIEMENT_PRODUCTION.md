# Déploiement préproduction / production

Dernière mise à jour : 2 juillet 2026

## Rôle

Suivi de ce qui est **préparé dans Git** vs **déployé et validé** sur VPS.

État actuel : **infra prête dans Git** (`feat/deploy-portainer-production`) — **aucun déploiement VPS confirmé** par le porteur.

**Checklist porteur (actions exactes)** : [`PORTEUR_ACTIONS_DEPLOIEMENT.md`](PORTEUR_ACTIONS_DEPLOIEMENT.md)

## File de déploiement

| Élément | Environnement | Statut agent | Statut porteur | Référence |
|---------|---------------|--------------|----------------|-----------|
| Compose Portainer Git | preprod | [x] Livré | [ ] Stack créée | `deploy/production/docker-compose.yml` |
| Variables secrets (Portainer) | preprod | [x] `.env.example` | [ ] Rempli hors Git | `deploy/production/.env.example` |
| NPM + HTTPS | preprod | [x] Doc | [ ] Proxy hosts OK | `PORTAINER_STACK.md` |
| Registry GHCR + CI | preprod/prod | [x] Workflow | [ ] 1er push images | `build-push-images.yml` |
| OTA mobile (API + app) | preprod | [x] Code | [ ] Test Samsung dev | `MOBILE_RELEASE_PIPELINE.md` |
| Backoffice push releases | preprod | [x] Page UI | [ ] Upload + promote | `/backoffice/administration/mobile-releases` |
| Stack VPS running | preprod | — | [ ] | `PREMIER_DEPLOIEMENT.md` |
| SMTP réel `@jobbingtrack.com` | preprod | [x] Doc OVH | [ ] | Bloqué étape mobile 320 |
| Security Audit images prod | GitHub | [ ] | [ ] Trivy avant prod | `docs/ci-cd/README.md` |
| Gate 9 étapes préprod | preprod | [x] Doc gate | [ ] | `A_VALIDER_AVANT_PRODUCTION.md` |
| Backoffice KPI hub (Sessions) | preprod | — | [ ] | Retour 22/06 |
| Backoffice admin user actions | preprod | — | [ ] | Retour 22/06 |
| Abonnement & facturation | post-MVP | Shell UI | [ ] | — |

## Guides

| Fichier | Usage |
|---------|--------|
| [`PORTEUR_ACTIONS_DEPLOIEMENT.md`](PORTEUR_ACTIONS_DEPLOIEMENT.md) | **Commencer ici** — ordre des actions porteur |
| [`PORTAINER_STACK.md`](PORTAINER_STACK.md) | Référence technique Portainer + NPM |
| [`MOBILE_RELEASE_PIPELINE.md`](MOBILE_RELEASE_PIPELINE.md) | OTA Android / iOS |
| [`../../deploy/production/PREMIER_DEPLOIEMENT.md`](../../deploy/production/PREMIER_DEPLOIEMENT.md) | 1er deploy pas à pas |

## Règle

Une ligne ne passe dans `VALIDATION_PRODUCTION.md` que lorsque le porteur a validé le comportement réel en préprod/prod.
