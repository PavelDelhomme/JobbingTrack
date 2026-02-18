# Architecture – Périmètre sécurité

## Règle générale

**Tout ce qui relève de la sécurité** (firewall, politiques, WAF, logs de sécurité, analytics sécurité, menaces, vulnérabilités) est géré par **un seul conteneur** : le **security-service**. Les données associées sont stockées dans **une base dédiée**, accessible **uniquement** par ce conteneur.

## Où sont les données ?

| Donnée | Stockage | Accès |
|--------|----------|--------|
| Logs de sécurité (SecurityLog) | Base **security-service** (`security_logs`) | Uniquement security-service |
| Règles firewall (FirewallRule) | Base security-service | Uniquement security-service |
| IPs bloquées, menaces | Base security-service | Uniquement security-service |
| Alertes (SecurityAlert), métriques (SecurityMetric) | Base security-service | Uniquement security-service |
| Config WAF (état, règles) | Mémoire / base security-service | Uniquement security-service |

La base du security-service ne doit **pas** être exposée en dehors du réseau du conteneur. Aucun autre service (API Gateway, metrics-aggregator, frontend) n’a de connexion directe à cette base.

## Comment le backoffice y accède

- Le **frontend** (backoffice) n’accède **jamais** à la base sécurité.
- Il passe toujours par l’**API** :  
  **Frontend** → **API Gateway** (auth) → **security-service** → **base sécurité**.
- Seuls les endpoints exposés par le security-service (firewall, policies, WAF, logs, threats, etc.) sont utilisés. C’est la seule voie d’accès “hors conteneur”.

En résumé : **données dans un conteneur + base dédiée, accès “vers l’extérieur” uniquement via l’API (et donc via le frontend/backoffice qui appelle cette API).**

## Metrics-aggregator : envoyer ou pas ?

Deux options cohérentes :

### Option A (recommandée) : tout rester dans le security-service

- **Aucun** envoi de données de sécurité vers le metrics-aggregator.
- Tous les tableaux de bord “sécurité” (logs, firewall, politiques, analytics sécurité) s’appuient sur les APIs du security-service.
- Avantages : périmètre clair, pas de duplication de données sensibles (IPs, logs détaillés), moindre surface d’attaque.

### Option B : agrégats uniquement vers le metrics-aggregator

- Le security-service peut envoyer **uniquement des agrégats non sensibles** au metrics-aggregator (ex. : `POST /api/v1/persistence/security/snapshot` avec des **compteurs** : nombre de blocages WAF, nombre de tentatives de login échouées, etc. — **sans** IP, sans user id, sans logs bruts).
- Utile si tu veux un **tableau de bord ops unifié** (système + conteneurs + indicateurs sécurité) au même endroit.
- Les données détaillées (logs, IPs, règles, etc.) restent **uniquement** dans la base du security-service et ne sont consultables que via son API (donc via le backoffice qui appelle cette API).

Recommandation : **Option A** par défaut ; n’ajouter l’Option B que si tu as un besoin explicite de dashboard unifié dans le metrics-aggregator.

## Résumé

- **Firewall, politiques, analytics sécurité, logs sécurité** → gérés par le **conteneur security-service**.
- **Stockage** → base **sécurisée** attachée à ce conteneur, **non accessible** en dehors (hors du security-service).
- **Accès “externe”** → **uniquement** via l’API (Frontend → Gateway → security-service) ; pas d’accès direct à la DB depuis le frontend ou un autre service.
- **Metrics-aggregator** → soit rien (tout rester dans le security-service), soit uniquement des **agrégats non sensibles** pour un dashboard commun.
