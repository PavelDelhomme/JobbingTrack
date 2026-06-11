# Déploiement préproduction / production

Dernière mise à jour : 21 mai 2026

## Rôle

Ce fichier suit ce qui est préparé ou déployé en préprod/prod, mais pas encore validé comme fonctionnel en production.

État actuel : **aucun déploiement production réel**.

## File de déploiement

| Élément | Environnement | Statut déploiement | Validation attendue | Retour |
|---------|---------------|--------------------|---------------------|--------|
| Préprod VPS / Portainer / NPM / OVH | preprod | [ ] Non démarré | Domaine HTTPS, stack Compose, secrets hors Git, healthchecks OK. | |
| SMTP réel préprod | preprod | [ ] Non démarré | Transport SMTP fournisseur réel, MailHog absent du chemin final, reset/vérification + alerte sécurité reçus, `EmailLog` `SENT`. | |
| Registry Docker / images | preprod/prod | [ ] Non démarré | Images construites, taguées, scannées, rollback possible. | |
| Security Audit images prod | GitHub | [ ] À lancer avant déploiement | Artefact `trivy-prod-image-reports` classé. | |
| Stack production réelle | prod | [ ] Non démarré | À renseigner seulement quand un serveur prod existe. | |

## Règle

Une ligne ne passe dans `VALIDATION_PRODUCTION.md` que lorsque le porteur a validé le comportement réel en préprod/prod.
