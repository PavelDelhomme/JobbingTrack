# Statistiques projet JobbingTrack

**Dernière mise à jour** : Février 2026

---

## Services

- **21+ services** avec healthchecks : API Gateway, auth, microservices métier (application, company, contact, interview, call, event, followup, profile, notification, workflow), security, deployment, **agrégateur d’observabilité** (metrics-aggregator), monitoring-c, log-collector, postgres, redis, frontend.
- **make status** : affiche 21/21 services actifs (healthy/unhealthy/starting).

---

## Observabilité

- **monitoring-c** (C) : métriques système et conteneurs (CPU, mémoire, disque, réseau, santé).
- **log-collector-c** (C) : logs des conteneurs (stdout/stderr, niveau, message).
- **Agrégateur d’observabilité** (metrics-aggregator, Node) : regroupe monitoring-c + Docker + centralLogger, traite (filtre JobbingTrack), persiste en tables distinctes, expose au backoffice (une seule API, port 5004).
- Ancien stack Prometheus/Grafana/Loki supprimé.

---

## Persistance

- **PostgreSQL** : tables distinctes (system_metrics, container_metrics, container_logs, service_availability, security_metrics, etc.) via agrégateur + schéma auth-service.
- **make db-push-all** : crée toutes les tables (Prisma 9 services + init-system-metrics.sql + init-key-tables.sql). Ne pas lancer db-push-security / db-push-deployment seuls sur une base partagée.

---

## Vue d’ensemble par domaine

| Domaine | Statut |
|--------|--------|
| API REST (Gateway + microservices) | Opérationnel |
| Observabilité (collecte monitoring-c, log-collector-c) | Opérationnel |
| Agrégateur d’observabilité (metrics-aggregator) | Opérationnel (tables via make db-push-all) |
| Historique métriques (Analytics, périodes 1h → 30j) | En place |
| Sécurité / Firewall | Partiel (à finaliser ; WAF/détection actuels = mock) |
| Comptes (auth-service, JWT, rôles) | Opérationnel |
| Application mobile (Flutter) | En cours (à connecter API) |

Voir **STATUS.md** pour la liste des actions à faire et **RESOLUTIONS.md** pour ce qui est résolu ou validé.
