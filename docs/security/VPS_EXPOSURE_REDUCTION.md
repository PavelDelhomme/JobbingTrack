# Réduction d'exposition VPS / Portainer — design P1A

**Statut** : cadrage documentaire (11/06/2026). Aucun déploiement honeypot ou leurre en production sans validation porteur et fenêtre dédiée.

## Objectif

Réduire la surface d'attaque du VPS hébergeant JobbingTrack (Portainer, Nginx Proxy Manager, stack Docker) **avant** d'envisager des leurres ou de la désinformation active.

## Principes (ordre de priorité)

1. **Moins de ports publics** : seuls NPM (443/80) et éventuellement SSH bastion ; Postgres, Redis, metrics-aggregator, MailHog, ports `800x` **non publiés** sur Internet.
2. **Réseaux Docker segmentés** : stack applicative sur un bridge dédié ; NPM sur un réseau partagé uniquement avec `frontend` et `api-gateway`.
3. **Portainer / NPM admin** : accès restreint par IP allowlist, authentification forte, pas d'exposition sur le FQDN public applicatif si évitable (VPN ou tunnel).
4. **Secrets hors Git** : variables Portainer, rotation SMTP/DB/JWT documentée dans `docs/deployment/environment-variables/`.
5. **Surveillance externe** : watchdog hors stack (voir `docs/TODOS.md` — alerte si JobbingTrack tombe totalement).

## Leurres / désinformation (phase ultérieure)

Uniquement si la réduction d'exposition ci-dessus est en place et auditée :

| Option | Intérêt | Risques / garde-fous |
|--------|---------|----------------------|
| Faux banner / version sur endpoint isolé | Ralentir scans automatisés | Ne pas exposer de vraies données ; journaliser ; isoler du réseau applicatif |
| Honeypot SSH/TCP sur IP secondaire | Détecter scans | Ne pas partager credentials réels ; alerting dédié ; conformité légale |
| Faux chemins admin (`/wp-admin`, etc.) | Bruit pour bots | Rate limit ; pas de fuite stack réelle ; logs corrélés security-service |

**Interdit sans cadre** : leurres sur le domaine de production réelle utilisé par les utilisateurs, ou honeypot mélangeant trafic légitime et piège.

## Liens

- Déploiement VPS : `docs/deployment/VPS_PORTAINER_NPM_OVH.md`
- Durcissement Compose : `docs/security/COMPOSE_RUNTIME_HARDENING.md`
- Matrice tests : `docs/security/SECURITY_TESTING_MATRIX.md`
- Validation porteur : `TODOS_A_VALIDER.md` — ligne **P1A Leurres / désinformation contrôlée VPS-Portainer**

## Preuve attendue (validation porteur)

- Lecture de ce document + confirmation que la **réduction d'exposition** prime sur les leurres.
- Inventaire ports publics VPS (hors Git) : liste attendue vs constat `nmap` lab.
- Décision explicite : leurres reportés / acceptés en préprod isolée / refusés.
