# Logs sécurité — compression et rétention

Objectif : limiter la croissance de `security_logs` sans perdre les preuves utiles à l’investigation. Ce document cadre la stratégie ; aucune purge destructive ne doit être activée sans dry-run, sauvegarde et validation porteur.

## État actuel

| Couche | Comportement actuel |
|--------|---------------------|
| Table | `security_logs` stocke chaque événement en ligne PostgreSQL (`message`, `metadata`, endpoint, IP, score, blocage). |
| API | `/api/v1/security/logs` accepte `limit`, `offset`, `startDate`, `endDate`, `level`, `category` et retourne une pagination. |
| UI logs | `/b4ck0ff1ce/security/logs` pagine par URL et conserve la page au refresh. |
| UI vue d’ensemble | `/b4ck0ff1ce/security` lit 30 jours avec plafond `SECURITY_LOGS_FETCH_LIMIT = 2000` et signale le résultat tronqué. |

## Classes de rétention proposées

| Classe | Exemples | Chaud en BDD | Archive compressée | Suppression finale |
|--------|----------|--------------|---------------------|--------------------|
| Critique | `critical`, blocage WAF/firewall, incident confirmé, CVE exploitable | 180 jours | 2 ans minimum | Après validation manuelle |
| Haute | `error`, menace non critique, auth suspecte confirmée | 90 jours | 1 an | Après dry-run |
| Standard | `warning`, bruteforce rejeté, scan lab, anomalies réseau non bloquées | 45 jours | 180 jours | Automatique après archive vérifiée |
| Bruit contrôlé | `info`, health/security heartbeat, faux positif lab marqué | 14 jours | 60 à 90 jours | Automatique après archive vérifiée |

Les événements liés à un incident ouvert, à un `requestId` référencé dans un rapport, ou à un export forensics doivent être exclus de la purge tant que l’incident n’est pas clôturé.

## Stratégie recommandée

1. **Mesurer avant d’agir** : taille table/index, top `eventType`, volume par jour, poids de `message` et `metadata`.
2. **Archiver sans perte** : exporter les lignes froides en JSONL gzip par période et classe (`security-logs/YYYY/MM/security_logs_<class>_<date>.jsonl.gz`) avec manifest SHA-256.
3. **Conserver les métadonnées requêtables** : garder en BDD une ligne résumé optionnelle (`archive_manifest`) ou une table d’index d’archive : période, classe, nombre, hash, chemin, date d’export.
4. **Purger uniquement après vérification** : compter lignes source/export, vérifier hash, tester une restauration locale, puis supprimer par lots bornés.
5. **Restaurer à la demande** : prévoir un script qui relit un manifest et réimporte dans une table temporaire pour investigation, sans écraser la table active.

## Dry-run disponible

Le script suivant ne modifie rien : il exécute uniquement des `SELECT` sur `security_logs` via le conteneur PostgreSQL et affiche la taille de table ainsi que les candidats à l’archive par classe.

```bash
node scripts/security/security-logs-retention-dry-run.cjs
```

## Export archive (sans purge)

Exporte un lot de candidats vers `data/archives/security-logs/<date>/` (ignoré par Git) :

```bash
node scripts/security/security-logs-archive-export.cjs
node scripts/security/security-logs-archive-export.cjs --class=noise --limit=2000
node scripts/security/security-logs-archive-export.cjs --all --limit=1000
```

Produit pour chaque classe : `<class>.jsonl.gz` + `manifest.json` (compteurs, SHA-256, politique de rétention). **Aucune ligne n’est supprimée** de `security_logs`.

## Restauration contrôlée (sans écraser la table active)

Vérifie un export puis, si demandé explicitement, charge les lignes dans une table de staging :

```bash
node scripts/security/security-logs-archive-restore.cjs --class=noise
node scripts/security/security-logs-archive-restore.cjs --class=noise --load-staging
node scripts/security/security-logs-archive-restore.cjs --all --load-staging --truncate-staging
```

Le mode par défaut vérifie uniquement `manifest.json`, les SHA-256 gzip, le nombre de lignes et la forme JSONL. `--load-staging` crée/alimente `public.security_logs_restore_staging` (`payload jsonb`, `row_id`, classe, fichier, date source) et **n’insère jamais** dans `public.security_logs`.

Variables optionnelles :

| Variable | Défaut | Usage |
|----------|--------|-------|
| `POSTGRES_CONTAINER` | `jobbingtrack-postgres` | Nom du conteneur PostgreSQL à interroger. |
| `SECURITY_LOGS_RETENTION_CRITICAL_DAYS` | `180` | Fenêtre chaude BDD pour les événements critiques. |
| `SECURITY_LOGS_RETENTION_HIGH_DAYS` | `90` | Fenêtre chaude BDD pour les événements hauts. |
| `SECURITY_LOGS_RETENTION_STANDARD_DAYS` | `45` | Fenêtre chaude BDD pour les warnings/anomalies standard. |
| `SECURITY_LOGS_RETENTION_NOISE_DAYS` | `14` | Fenêtre chaude BDD pour le bruit contrôlé. |
| `SECURITY_LOGS_ARCHIVE_DIR` | `data/archives/security-logs/<date>` | Répertoire de sortie des exports gzip. |
| `SECURITY_LOGS_ARCHIVE_BATCH` | `5000` | Nombre max de lignes exportées par classe et par exécution. |

## Options techniques

| Option | Avantages | Limites | Décision |
|--------|-----------|---------|----------|
| JSONL gzip hors BDD | Simple, sans migration lourde, bon taux de compression, restaurable | Recherche moins immédiate dans les archives | Recommandé en premier |
| Colonne compressée en BDD | Garde tout dans PostgreSQL | Migrations et requêtes plus complexes, gain variable sur JSONB | À évaluer plus tard |
| Partitionnement temporel | Purge rapide par partition, bon pour gros volumes | Migration plus structurante | Pertinent si volume quotidien élevé |
| Timescale/hypertables | Compression native temps-série | Dépendance supplémentaire | Non prioritaire |

## Garde-fous d’implémentation

- Mode par défaut : **dry-run** avec rapport de volume et liste des périodes touchées.
- Variables d’activation explicites, jamais de purge implicite au démarrage.
- Batchs limités pour éviter les verrous longs (`DELETE ... WHERE id IN (...) LIMIT` via sélection préalable).
- Logs d’audit append-only pour chaque archive/purge : opérateur, période, classe, nombre, hash manifest.
- Aucun secret, token ou payload sensible ne doit être affiché dans les rapports de dry-run.

## Critères de validation

- Le backoffice indique clairement quand une liste est tronquée ou filtrée par période.
- Un export gzip peut être vérifié par hash et restauré dans une table temporaire.
- Une purge dry-run et une purge réelle sur données de test produisent le même nombre attendu.
- Les incidents critiques restent accessibles même après archivage des logs standards.
