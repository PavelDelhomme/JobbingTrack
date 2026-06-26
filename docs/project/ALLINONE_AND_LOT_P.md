# AllInOne, JobbingTrack et Lot P — relation et contrats

Dernière mise à jour : **26 juin 2026** — branche `feat/bl26-backlog-porteur-26juin`

## En bref

| Question | Réponse |
|----------|---------|
| **AllInOne remplace JobbingTrack ?** | Non. C’est un **socle réutilisable** (backoffice, metrics, monitoring) pour d’autres produits (Cloudity, VTCBuilder…). |
| **JobbingTrack utilise AllInOne aujourd’hui ?** | **Non.** Aucune dépendance `@allinone/*` dans ce dépôt. JT garde son code natif (Next.js backoffice + `metrics-aggregator-service`). |
| **Pourquoi parler d’AllInOne alors ?** | AllInOne **s’aligne sur les API de JobbingTrack** pour pouvoir, plus tard, extraire ou réutiliser ce que JT fait déjà. |
| **Quand extraire ?** | **Après prod stable** — phase **E / Lot P** (`PILOTAGE.md`, `BACKLOG.md`). Ne pas ralentir mobile étapes 2→5. |

## Rôle de chaque brique

```
┌─────────────────────────────────────────────────────────────┐
│  JobbingTrack (aujourd’hui — produit hôte)                  │
│  • frontend/backoffice/performances, statistics, …          │
│  • metrics-aggregator-service                               │
│  • monitoring-agent-rs + tables system_metrics / snapshots  │
└───────────────────────────┬─────────────────────────────────┘
                            │ contrat API (référence)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  AllInOne (projet séparé — futur socle réutilisable)        │
│  • @allinone/api-client, @allinone/monitoring, mock-api     │
│  • servicePrefix configurable (jobbingtrack-, vtcbuilder-…)   │
│  • Consomme le MÊME format que JT quand branché sur JT      │
└─────────────────────────────────────────────────────────────┘
```

**AllInOne ne est pas branché dans JobbingTrack** : c’est l’inverse conceptuellement — AllInOne apprend à parler comme JT pour préparer l’extraction Lot P.

## Contrat API metrics (référence partagée)

Endpoint historique système (canonique JobbingTrack) :

```http
GET /api/v1/persistence/system/metrics?startDate=…&endDate=…&limit=…
```

Réponse : lignes avec au minimum :

```json
{
  "timestamp": "2026-06-17T16:39:00.000Z",
  "cpuUsagePercent": 23.9,
  "memoryUsagePercent": 55.45
}
```

Historique par conteneur :

```http
GET /api/v1/persistence/containers/:name/metrics?…
```

Liste live conteneurs (Performances) :

```http
GET /api/v1/docker/services/all?light=1
GET /api/v1/docker/services/all?light=1&refresh=1
```

**Ancien format simplifié** (`/persistence/system/metrics/cpu`) : **non utilisé** par le backoffice JT. AllInOne a été corrigé pour utiliser le format ci-dessus.

Proxy frontend JT (anti-adblock uBlock) :

| Chemin navigateur | Rôle |
|-------------------|------|
| `/api/mon/*` | Alias → metrics-aggregator |
| `/api/persist/*` | Alias → persistence routes |
| `/api/metrics-aggregator/*` | Chemin historique (toujours supporté) |

## Ce que JobbingTrack a livré sur la branche BL-26 (26/06)

Correctifs **natifs JT** (indépendants d’AllInOne) :

1. **Proxy `/api/mon`** + nginx `:5443` — fin des 404 Performances.
2. **`docker/services/all?light=1`** — chargement ~2 s au lieu de timeouts ; cache client 60 s + prefetch sous-nav.
3. **Cartes CPU/RAM live** (`/performances/cpu-memory`) — alignées sur le **dernier point `system_metrics`** (graphe host), plus la moyenne Docker (~2 % / ~19 %) qui trompait.
4. **Mobile étape 2** — FAB accueil, entretiens, appels, seed réaliste, analytics ON par défaut.
5. **Hygiène scripts** — throttle API seed, prune `tests/results`, fix Make benchmark.

Détail technique : `docs/scripts/AUDIT_CLEANUP_2026-06-26.md`.

## Lot P — extraction future (post-prod)

Quand le gate prod sera ouvert (`BACKLOG.md` § Lot P) :

1. Inventorier les « moteurs » déjà génériques (`PerformancePageShell`, `analytics.service`, agent Rust…).
2. Publier packages (`@cloudity/admin-shell` ou `@allinone/*` selon repo cible).
3. JobbingTrack **consommera** ces packages — aujourd’hui il **est** la référence implémentation.
4. Créer `PLATFORM_EXTRACTION_PLAN.md` au kick-off.

**AllInOne** peut servir de bac à sable ou monorepo cible pour cette extraction ; **JobbingTrack reste la source de vérité produit** jusqu’à bascule explicite porteur.

## Vérifications rapides (stack JT locale)

```bash
# Proxy anti-adblock
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5003/api/mon/docker/services/all?light=1

# Historique système (format AllInOne aligné)
curl -s "http://127.0.0.1:5003/api/persist/system/metrics?limit=3" | head -c 400
```

Attendu : HTTP **200** ; JSON avec `cpuUsagePercent` / `memoryUsagePercent`.

## Références

- `docs/pilotage/PILOTAGE.md` — phase E bloquée avant prod
- `docs/project/BACKLOG.md` — Lot P périmètre modules
- `docs/scripts/AUDIT_CLEANUP_2026-06-26.md` — correctifs 26/06 détaillés
- `docs/pilotage/TODOS_A_VERIFIER.md` — preuves agent + reste validation porteur
