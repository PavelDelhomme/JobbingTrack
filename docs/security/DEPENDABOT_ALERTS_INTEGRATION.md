# Intégration Dependabot Alerts

Objectif : utiliser les alertes Dependabot/GitHub comme source supply-chain complémentaire du scanner CVE local, puis les enregistrer dans la table `vulnerabilities` du `security-service`.

## État 12/05/2026

- Le modèle Prisma `Vulnerability` existe déjà dans `backend/security-service/prisma/schema.prisma`.
- Le `security-service` sait déjà upsert des vulnérabilités issues de `scripts/security/cve-scan.py` et créer des `SecurityAlert` pour les nouvelles surfaces `critical` / `high`.
- Les mises à jour npm du 12/05 ont supprimé les audits runtime sur `frontend`, `backend/api-gateway`, `backend/application-service`, `backend/auth-service`, `backend/deployment-service` et `backend/workflow-service`.
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
| `state` | `status` (`open`, `fixed`, `dismissed`) |

Déduplication recommandée : `source=dependabot`, `manifestPath`, `package`, `ghsaId`/`cveId`.

## Flux cible

1. Récupérer les alertes via GitHub API ou `gh api /repos/:owner/:repo/dependabot/alerts`.
2. Normaliser vers la forme `Vulnerability`.
3. Upsert dans `security-service` sans dupliquer les résultats du scanner CVE local.
4. Créer une `SecurityAlert` uniquement pour une nouvelle vulnérabilité `critical` ou `high` encore ouverte.
5. Ajouter un job planifié léger, désactivable par env, pour ne pas dépendre uniquement des emails GitHub.

## Variables prévues

- `DEPENDABOT_ALERTS_ENABLED=false` par défaut tant que l'intégration n'est pas branchée.
- `DEPENDABOT_ALERTS_CRON` pour la cadence.
- `GITHUB_TOKEN` ou secret dédié en environnement serveur uniquement.
- `DEPENDABOT_ALERTS_REPOSITORY` au format `owner/repo`.

## Garde-fous

- Ne jamais exposer le token GitHub côté frontend.
- Ne jamais bloquer le runtime applicatif si GitHub est indisponible.
- Conserver les états `dismissed` avec justification dans `metadata` plutôt que supprimer l'historique.
- Les alertes issues d'anciens fichiers absents du checkout doivent être classées `stale_manifest_missing` après vérification de branche.
