# Monitoring CVE continu et alertes mail critiques

## Objectif

JobbingTrack doit surveiller les CVE connues sur toute sa surface technique :

- dépendances Node : frontend, backend, gateway, security-service, services métier, tests/outils ;
- Rust : workspace `monitoring/rust` ;
- images Docker : conteneurs `jobbingtrack-*`, PostgreSQL, Redis, MailHog et images de base ;
- mobile Flutter : suivi `pubspec.yaml`, plugins natifs et advisories éditeurs.

La surveillance ne doit pas devenir une charge permanente. Le bon modèle est un scan périodique, différentiel et notifiant uniquement les changements importants.

## Commandes disponibles

Scan local non bloquant :

```bash
make test-cve-scan
```

Scan CI bloquant à partir de `high` :

```bash
CVE_SCAN_STRICT=1 CVE_SCAN_FAIL_ON=high make test-cve-scan
```

Scan avec images des conteneurs en cours :

```bash
CVE_SCAN_DOCKER=1 make test-cve-scan
```

Scan d’une image précise :

```bash
python3 scripts/security/cve-scan.py --docker --docker-image jobbingtrack-api-gateway:latest
```

Les rapports sont écrits dans `tests/results/security/cve-<timestamp>/` et ne sont pas versionnés.

## Fonctionnement cible en production

Le `security-service` doit piloter ce flux, mais pas lancer un scan lourd toutes les minutes.

État implémenté :

- `securityService.analyzeVulnerabilities()` lance `scripts/security/cve-scan.py` si la racine projet est accessible ;
- un verrou applicatif empêche deux scans CVE simultanés ;
- la cadence par défaut du scheduler est `CVE_SCAN_CRON=17 */6 * * *` ;
- Docker est désactivé par défaut (`CVE_SCAN_DOCKER=0`) pour éviter une charge forte et Docker-in-Docker ;
- le conteneur `security-service` reçoit les surfaces du monorepo en lecture seule sous `/scan` et écrit ses rapports sous `/tmp/jobbingtrack-cve-results` ;
- les surfaces avec vulnérabilités sont persistées dans `vulnerabilities` et les nouvelles surfaces `high` / `critical` créent une `security_alert`.

Cadence recommandée :

- dépendances Node/Rust : toutes les 6 à 12 heures ;
- images Docker : une fois par jour et après rebuild/déploiement ;
- base advisories scanner : mise à jour automatique par l’outil, ou cache local géré par Trivy/cargo-audit/npm ;
- scan manuel immédiat : bouton admin réservé super admin, avec réauthentification récente.

Garde-fous de performance :

- un seul scan à la fois, verrou applicatif obligatoire ;
- timeout par surface scannée ;
- pas de scan Docker complet par défaut sur toutes les images locales ;
- comparaison avec le dernier rapport pour notifier uniquement les nouvelles CVE ou les aggravations ;
- résumé court en base, rapport détaillé sur disque/stockage interne sécurisé ;
- pas de secrets dans les rapports.

## Alertes email critiques

Une alerte email doit partir si :

- une CVE `critical` apparaît sur une surface runtime ;
- une CVE `high` touche `api-gateway`, `auth-service`, `security-service`, `frontend` ou une image exposée ;
- une CVE déjà connue passe à une sévérité plus haute ;
- un scanner attendu échoue plusieurs fois de suite sur une surface critique.

Pour éviter le spam :

- envoyer un mail immédiat pour `critical` nouveau ;
- grouper les `high` dans un digest périodique, sauf surface critique ;
- appliquer un cooldown par CVE/surface ;
- inclure le lien vers le rapport interne et les commandes de reproduction.

Adresse de destination :

- configurable dans l’interface admin ;
- modification protégée par réauthentification récente ;
- changement journalisé dans les logs sécurité ;
- confirmation par email avant activation de la nouvelle adresse.

## Score de sécurité

Le score de la vue `/backoffice/security` est volontairement différent du score performance.

Il part de `100` et retire :

- `min(40, menaces * poidsMenaces)` ;
- `min(30, max(0, logsAnalysés - 20) * poidsBruitLogs)` ;
- `10` points si des IPs sont bloquées, plafonné à `20` ;
- `poidsWafOff` si le WAF est désactivé.

Les curseurs de pondération servent à ajuster la sensibilité d’affichage :

- **Menaces** : impact de chaque menace structurée ;
- **Bruit logs** : sévérité donnée à un volume élevé de logs sécurité ;
- **WAF off** : pénalité fixe si la protection WAF est coupée.

CPU, mémoire, disque, charge/core, temps de réponse et conteneurs actifs ne doivent pas entrer dans ce score : ce sont des signaux performance/infra, à corréler ailleurs.

## Rétention des logs sécurité

État actuel : le scheduler supprime les logs de sécurité après 90 jours.

Politique recommandée :

- logs bruts consultables en backoffice : 90 jours ;
- agrégats/statistiques : 12 à 24 mois ;
- événements critiques, actions admin sensibles, confirmations email et changements de configuration sécurité : 1 à 3 ans selon besoin légal ;
- export long terme : stockage append-only/chiffré, hors base applicative si volumétrie élevée.

## Protection des logs sécurité

Les logs sécurité sont eux-mêmes sensibles. Ils peuvent contenir IP, endpoints, user-agent, payloads d’attaque, identifiants techniques et informations d’investigation.

Exigences :

- accès réservé aux rôles `SUPER_ADMIN` / rôle sécurité dédié ;
- réauthentification récente pour export, suppression, purge, téléchargement massif ou lecture payload brut ;
- journalisation de chaque consultation sensible ;
- pagination obligatoire, pas de chargement massif par défaut ;
- masquage par défaut des payloads trop sensibles, affichage complet uniquement sur action explicite ;
- chiffrement en transit et au repos en production ;
- sauvegardes protégées et restaurations testées ;
- interdiction de committer les rapports ou dumps contenant des secrets.

## Prochaines implémentations

1. Ajouter une table/entité de déduplication fine `cveId + package + surface` pour passer d’un résumé par surface à un suivi par CVE.
2. Ajouter les préférences mail sécurité avec réauthentification et confirmation email.
3. Envoyer les alertes email `critical` et les digests `high`.
4. Ajouter la pagination complète des logs sécurité avec total réel et filtres.
5. Ajouter un bouton de scan manuel réservé super admin, avec réauthentification récente.
