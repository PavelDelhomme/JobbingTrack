# À valider avant préproduction / production

Dernière mise à jour : 8 juin 2026

## Rôle

Ce fichier démarre seulement quand les validations locales de `TODOS_A_VALIDER.md` sont suffisamment propres. Il sert au gate préprod/prod simulé ou réel.

Pour l’instant, aucune production réelle n’est lancée sur serveur.

## Préconditions

| Précondition | Statut |
|--------------|--------|
| `TODOS_A_VALIDER.md` ne contient plus de P0 bloquant | [ ] |
| Suite complète locale récente verte (`scripts/run-all-tests-with-reports.sh`, exit 0, rapport `tests/results/<horodatage>/` lu) | [ ] |
| Rapports sécurité P0 récupérés ou régénérés | [ ] |
| Findings `critical/high` triés | [ ] |
| Accès aux détails bruts sécurité protégé par réauth forte, audit et no-store | [ ] |
| Alertes email critiques configurées vers adresses dev/admin porteur | [ ] |
| Exposition publique serveur/conteneurs/réseau minimisée et stratégie leurres/masquage validée | [ ] |
| Déploiement VPS/Portainer/NPM préparé hors secrets Git | [ ] |
| Sauvegarde/restauration BDD testée au moins en simulation | [ ] |

## Gate préprod/prod

| Validation | Environnement cible | Preuve attendue | Statut | Retour |
|------------|---------------------|-----------------|--------|--------|
| Variables prod strictes | preprod | Pas de secret faible/fallback dev, `.env` hors Git, `SECURITY_INTERNAL_SECRET`, `METRICS_API_KEY`, SMTP, Redis, Postgres validés. | [ ] | |
| Emails SMTP réels | preprod | `SMTP_HOST` fournisseur réel (pas MailHog/localhost), TLS cohérent, secrets hors Git, reset/vérification + alerte sécurité reçus dans une boîte réelle, `EmailLog` `SENT`. | [ ] | |
| HTTPS public / reverse proxy | preprod | Domaine API/front en HTTPS public, `TRUST_PROXY_HOPS` cohérent, WAF inspecte le trafic public. | [ ] | |
| Security Audit GitHub images prod | GitHub/preprod | Workflow manuel `scan_prod_images=true`, artefact `trivy-prod-image-reports`, décisions `HIGH/CRITICAL`. | [ ] | |
| Ports exposés | preprod | Seuls frontend/API/proxy publics ; Postgres/Redis/services internes non exposés Internet. | [ ] | |
| Login admin et backoffice | preprod | Login OK, pages clés sans 401/403/500. | [ ] | |
| Logs et alertes sécurité | preprod | WAF/logs/alertes mail critiques observables, sans fuite de secrets. | [ ] | |
| Détails sensibles rapports sécurité | preprod | Notes brutes/payloads/proofs CVE accessibles seulement après réauth forte, jeton court non rejouable, rôle élevé, audit append-only, pas de cache. | [ ] | |
| Tests offensifs contrôlés | preprod/lab | Shell/URL/command injection, headers spoofing, remote host/path traversal vérifiés par service exposé, uniquement en environnement autorisé. | [ ] | |
| Masquage infos infra / leurres | preprod/prod | Erreurs/bannières/versions publiques génériques ; Docker/Portainer/metrics non exposés ; éventuels leurres isolés et documentés. | [ ] | |
| Sauvegarde / restauration | preprod | Backup test, restauration testée, procédure rollback connue. | [ ] | |

Quand une ligne est réellement déployée mais pas encore validée en environnement cible, la déplacer vers `DEPLOIEMENT_PRODUCTION.md`.
