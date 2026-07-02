# Déploiement préproduction / production

Dernière mise à jour : 17 juin 2026

## Rôle

Ce fichier suit ce qui est préparé ou déployé en préprod/prod, mais pas encore validé comme fonctionnel en production.

État actuel : **infra Portainer préparée dans Git** (`deploy/production/`) — **aucun déploiement VPS réel lancé** par le porteur.

Guide stack : [`PORTAINER_STACK.md`](PORTAINER_STACK.md) · Compose : [`../../deploy/production/docker-compose.yml`](../../deploy/production/docker-compose.yml)

## File de déploiement

| Élément | Environnement | Statut déploiement | Validation attendue | Retour |
|---------|---------------|--------------------|---------------------|--------|
| Préprod VPS / Portainer / NPM / OVH | preprod | [ ] Compose + doc prêts ; stack non créée sur VPS | `deploy/production/`, `PORTAINER_STACK.md`, secrets Portainer | |
| Registry Docker / images | preprod/prod | [ ] Workflow GHCR ajouté | `build-push-images.yml` — activer packages GHCR au premier push | |
| SMTP réel préprod | preprod | [ ] Non démarré | Transport SMTP fournisseur réel, MailHog absent du chemin final, reset/vérification + alerte sécurité reçus, `EmailLog` `SENT`. | |
| Security Audit images prod | GitHub | [ ] À lancer avant déploiement | Artefact `trivy-prod-image-reports` classé. | |
| Stack production réelle | prod | [ ] Non démarré | À renseigner seulement quand un serveur prod existe. | |
| Backoffice KPI hub (Sessions actives) | preprod | Carte hub cohérente avec destination ; comptes test exclus ou séparés. Voir `A_VALIDER_AVANT_PRODUCTION.md`. | [ ] | Retour porteur 22/06 — écart 2 vs ~100 au clic. |
| Backoffice admin utilisateur (vérif / reset / delete) | preprod | Actions fiche user OK ; stats conservées si suppression. | [ ] | Retour porteur 22/06 — resend vérif Network Error. |
| Abonnement & facturation | preprod / post-MVP | Modèle économique + APIs `/billing`. | [ ] | Shell UI seulement aujourd’hui. |

## Règle

Une ligne ne passe dans `VALIDATION_PRODUCTION.md` que lorsque le porteur a validé le comportement réel en préprod/prod.
