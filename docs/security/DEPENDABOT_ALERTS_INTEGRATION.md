# Intégration Dependabot Alerts

Objectif : utiliser les alertes Dependabot/GitHub comme source supply-chain complémentaire du scanner CVE local, puis les enregistrer dans la table `vulnerabilities` du `security-service`.

## État 12/05/2026

- Le modèle Prisma `Vulnerability` existe déjà dans `backend/security-service/prisma/schema.prisma`.
- Le `security-service` sait déjà upsert des vulnérabilités issues de `scripts/security/cve-scan.py` et créer des `SecurityAlert` pour les nouvelles surfaces `critical` / `high`.
- Les mises à jour npm du 12/05 ont supprimé les audits runtime sur `frontend`, `backend/api-gateway`, `backend/application-service`, `backend/auth-service`, `backend/deployment-service` et `backend/workflow-service`.
- L'import Dependabot est branché côté serveur via `securityService.analyzeDependabotAlerts()` et `POST /api/v1/vulnerabilities/dependabot/import`.
- Le job planifié reste désactivé par défaut (`DEPENDABOT_ALERTS_ENABLED=false`) et exige un token serveur (`DEPENDABOT_ALERTS_TOKEN` ou `GITHUB_TOKEN`) seulement quand il est activé.
- Les alertes `mobile/package-lock.json` vues dans GitHub ne correspondent pas au checkout actuel : `mobile/` est une app Flutter sans `package-lock.json`. Si GitHub continue de les afficher, vérifier la branche scannée, les artefacts historiques ou un ancien fichier supprimé.

## Mapping proposé

Chaque alerte Dependabot doit être normalisée vers `Vulnerability` :

| Dependabot | `Vulnerability` |
| --- | --- |
| `number` | `metadata.dependabotAlertNumber` |
| `security_advisory.ghsa_id` | `metadata.ghsaId` |
| `security_advisory.cve_id` | `cveId` si présent |
| `security_advisory.summary` | `title` |
| `security_advisory.description` | `description` |
| `security_vulnerability.package.name` | `affectedComponent` |
| `security_vulnerability.vulnerable_version_range` | `metadata.vulnerableRange` |
| `security_vulnerability.first_patched_version` | `remediation` |
| `dependency.manifest_path` | `metadata.manifestPath` |
| `state` | `status` (`open`, `resolved`, `dismissed`) |

Déduplication recommandée : `source=dependabot`, `manifestPath`, `package`, `ghsaId`/`cveId`.

## Flux implémenté

1. Récupérer les alertes via GitHub API `/repos/:owner/:repo/dependabot/alerts`.
2. Normaliser vers la forme `Vulnerability`.
3. Upsert dans `security-service` via `title + affectedComponent`, cohérent avec le scanner CVE local.
4. Créer une `SecurityAlert` uniquement pour une nouvelle vulnérabilité `critical` ou `high` encore ouverte.
5. Planifier un job léger si `DEPENDABOT_ALERTS_ENABLED=true`.

## Variables

- `DEPENDABOT_ALERTS_ENABLED=false` par défaut.
- `DEPENDABOT_ALERTS_CRON` pour la cadence.
- `DEPENDABOT_ALERTS_TOKEN` ou `GITHUB_TOKEN` en environnement serveur uniquement.
- `DEPENDABOT_ALERTS_MAX_PAGES` pour borner la pagination.
- `DEPENDABOT_ALERTS_REPOSITORY` au format `owner/repo`.
- `DEPENDABOT_ALERTS_STATE=open` par défaut.
- `DEPENDABOT_ALERTS_TIMEOUT_MS` pour borner l'appel GitHub.

## Garde-fous

- Ne jamais exposer le token GitHub côté frontend.
- Ne jamais bloquer le runtime applicatif si GitHub est indisponible.
- Conserver les états `dismissed` avec justification dans `metadata` plutôt que supprimer l'historique.
- Les alertes issues d'anciens fichiers absents du checkout doivent être classées `stale_manifest_missing` après vérification de branche.
