# À valider avant préproduction / production

Dernière mise à jour : 22 juin 2026

## Rôle

Ce fichier démarre seulement quand les validations locales de `TODOS_A_VALIDER.md` sont suffisamment propres. Il sert au gate **préprod** (environnement contrôlé, pas encore ouvert au public) puis **prod**.

Pour l’instant, aucune production réelle n’est lancée sur serveur (Portainer/NPM à monter).

## Enchaînement obligatoire (étape par étape)

Le porteur valide **chaque étape** avant la suivante. L’agent prépare les preuves ; seul le porteur coche GO.

| # | Étape | Fichier / commande | GO porteur |
|---|--------|-------------------|------------|
| 1 | Validations locales P0/P1/D mobile | `TODOS_A_VALIDER.md` → `TODOS_DONE.md` | [ ] |
| 2 | Hub tests backoffice D8 | UI admin + smokes sans terminal | [ ] |
| 3 | Suite tests + rapports | `scripts/run-all-tests-with-reports.sh` | [ ] |
| 4 | Rapport impact release (vide structuré) | `docs/security/SECURITY_RELEASE_IMPACT_REPORT.template.md` | [ ] |
| 5 | Matrice plateformes | `docs/mobile/COMPATIBILITE_PLATEFORMES.md` | [ ] |
| 6 | Déploiement **préprod** VPS (Portainer, NPM, secrets hors Git) | `DEPLOIEMENT_PRODUCTION.md` | [ ] |
| 7 | Tests identiques préprod (Android, iOS si dispo, web, API) | Reprendre matrice §4 du rapport | [ ] |
| 8 | Audit sécurité final + tri critical/high | Rapports P0 + Trivy prod | [ ] |
| 9 | GO production | Porteur explicite → `VALIDATION_PRODUCTION.md` | [ ] |

> **Préprod** = stack derrière NPM, accès restreint, possibilité de rollback. **Prod** = ouverture réelle — uniquement après ligne 9.

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
| **Hub tests backoffice (D8)** — lancer smokes mobile + suite principale depuis UI admin ; config appareil ADB/AVD et comptes test sans terminal ; émulateur mobile = vrai ADB (pas iframe factice) | [ ] |

## Gate préprod/prod

| Validation | Environnement cible | Preuve attendue | Statut | Retour |
|------------|---------------------|-----------------|--------|--------|
| **Hub tests & émulateur mobile (D8)** | local / preprod | Depuis backoffice : choix appareil ADB réel ou AVD, lancement smokes mobile + rapports ; config test (équivalent `.env`) sans secrets en clair ; Parcours utilisateur + hub Tests unifiés. Voir `docs/TODOS.md` § D8. | [ ] | |
| Variables prod strictes | preprod | Pas de secret faible/fallback dev, `.env` hors Git, `SECURITY_INTERNAL_SECRET`, `METRICS_API_KEY`, SMTP, Redis, Postgres validés. | [ ] | |
| Emails SMTP réels | preprod | `SMTP_HOST` fournisseur réel (pas MailHog/localhost), TLS cohérent, secrets hors Git, reset/vérification + alerte sécurité reçus dans une boîte réelle, `EmailLog` `SENT`. | [ ] | |
| HTTPS public / reverse proxy | preprod | Domaine API/front en HTTPS public, `TRUST_PROXY_HOPS` cohérent, WAF inspecte le trafic public. | [ ] | |
| Security Audit GitHub images prod | GitHub/preprod | Workflow manuel `scan_prod_images=true`, artefact `trivy-prod-image-reports`, décisions `HIGH/CRITICAL`. | [ ] | |
| Ports exposés | preprod | Seuls frontend/API/proxy publics ; Postgres/Redis/services internes non exposés Internet. | [ ] | |
| Login admin et backoffice | preprod | Login OK, pages clés sans 401/403/500. | [ ] | |
| Refresh ciblé backoffice / budget CPU-RAM | preprod | Audit pages lourdes : aucun auto-refresh ne recharge toute une page ; seuls les composants utiles se rafraîchissent, onglet masqué respecté, requêtes obsolètes annulées, CPU/RAM navigateur + conteneur frontend mesurés et acceptables. | [ ] | |
| Logs et alertes sécurité | preprod | WAF/logs/alertes mail critiques observables, sans fuite de secrets. | [ ] | |
| Migration `audit_logs` (B7) | preprod/prod | **Après validations locales B7/B8** — appliquer migration Prisma ciblée `audit_logs` sur `security-service` en préprod/prod (pas de `db push --accept-data-loss` sur schéma complet). Vérifier `GET /api/v1/security/audit` et export `security_export` après migration. **Reporté volontairement** : ne pas bloquer la suite Lot B local ; gate explicite avant prod. | [ ] | Preuve agent 16/06 : table créée localement de façon ciblée ; smoke API B7/B8 OK. |
| Détails sensibles rapports sécurité | preprod | Notes brutes/payloads/proofs CVE accessibles seulement après réauth forte, jeton court non rejouable, rôle élevé, audit append-only, pas de cache. | [ ] | |
| Tests offensifs contrôlés | preprod/lab | Shell/URL/command injection, headers spoofing, remote host/path traversal vérifiés par service exposé, uniquement en environnement autorisé. | [ ] | |
| Masquage infos infra / leurres | preprod/prod | Erreurs/bannières/versions publiques génériques ; Docker/Portainer/metrics non exposés ; éventuels leurres isolés et documentés. | [ ] | |
| Sauvegarde / restauration | preprod | Backup test, restauration testée, procédure rollback connue. | [ ] | |
| POC frontend vanilla (Lot I) | preprod / branche isolée | Spike HTML + templates + JS pur sur 1–2 pages backoffice lourdes ; rapport `docs/frontend/POC_VANILLA_FRONTEND.md` avec métriques (bundle, RAM, LCP) et décision **go/no-go** migration vs conserver Next/TS. **Ne bloque pas** le déploiement si décision = « garder Next ». | [ ] | |

Quand une ligne est réellement déployée mais pas encore validée en environnement cible, la déplacer vers `DEPLOIEMENT_PRODUCTION.md`.
