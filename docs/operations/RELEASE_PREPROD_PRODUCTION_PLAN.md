# Plan release, préprod, production et conformité

Objectif : cadrer ce qui devra être vérifié avant de fusionner `dev` vers une branche de production et avant de publier les applications web/mobile. Ce document ne remplace pas `PLAN.md` / `TODOS.md` : il sert de check-list transverse release.

## Séquence cible

1. **Développement courant** : travail sur branches fonctionnelles, merge vers `dev` quand les tests ciblés passent.
2. **Branche tests complets** : branche dédiée depuis `dev` pour campagne complète backend, frontend, API, services, BDD, sécurité, performances, mobile, Playwright, qualité, erreurs et délivrables.
3. **Branche préprod** : branche/stage après correction des tests complets, déployée sur serveur préprod avec secrets, base, stockage et URLs distincts de la prod.
4. **Bêta mobile** : builds Android/iOS pointant vers préprod, distribués via canaux beta adaptés.
5. **Validation prod** : gel de version, vérification licences/conformité, sauvegarde/restauration, scans sécurité, puis merge contrôlé vers branche prod.
6. **Production réelle** : déploiement backend/API/backoffice/web + publication mobile selon les modalités validées.

## Campagne tests complets

- API : contrats gateway, auth, erreurs, rate limit, CORS, WAF, authz.
- Backend/services : health, CRUD critiques, jobs, emails, logs, BDD, migrations.
- Frontend/backoffice/web : type-check, unitaires, navigation, accessibilité, responsive, erreurs utilisateur.
- Mobile : smoke, parcours métier, offline/sync si activé, crash reporting, builds release.
- Sécurité : B15 complet (`gitleaks`, Trivy, `nmap`, `jwt_tool`, ZAP, injections, IDOR, secrets, TLS).
- Performance : resource budget 40-60 min, API load, frontend, métriques, coûts monitoring.
- Données : seed, base test vs base principale, export/import, purge, sauvegarde/restauration.
- Délivrables : artefacts Docker, APK/AAB/IPA, changelog, release notes, rollback.

## Préprod

- Serveur préprod séparé de prod, avec domaines dédiés (`preprod-*`) et secrets distincts.
- Base préprod distincte, données anonymisées ou de test, jamais dump prod brut non anonymisé.
- Déploiement automatisé ou semi-automatisé depuis une branche préprod.
- Monitoring, alertes mail, logs sécurité et sauvegardes activés comme en prod.
- Scans sécurité actifs autorisés uniquement dans cette fenêtre et avec limites documentées.

## Licences et conformité dépendances

- Inventorier licences de tous les packages Node, Rust, Flutter/Dart, Docker images, outils CI et services/API externes.
- Identifier contraintes copyleft, attribution, redistribution mobile, SaaS/API, obligations de notice.
- Décider de la licence applicable au projet ou aux sous-parties (backend, frontend, mobile, scripts/outils) seulement après inventaire.
- Produire un fichier de notices/licences pour les dépendances et l’application si publication externe.
- Vérifier aussi les conditions des services tiers : SMTP, stores mobile, threat-intel, hébergement, analytics/crash reporting.

## RGPD, retours utilisateurs et rapports d’erreurs

- Définir les données collectées : compte, logs, erreurs, crash reports, métriques, analytics, sécurité.
- Minimiser et pseudonymiser les données ; masquer tokens, mots de passe, emails complets et payloads sensibles.
- Ajouter consentement/paramètres pour analytics et crash reporting quand nécessaire.
- Prévoir export/suppression des données utilisateur, rétention par catégorie, audit des accès.
- Centraliser les retours utilisateurs et rapports d’erreurs : source, version app, device, requestId/correlationId, service, horodatage, statut de traitement.
- Exploiter les rapports dans le backoffice avec filtres, tri, liens vers logs corrélés, et sans fuite de secrets.

## Déploiement et mises à jour

- Backend/API : build images, scan, push registry, déploiement préprod/prod, migration BDD contrôlée, rollback.
- Frontend/backoffice/web : build, tests, publication, invalidation cache, rollback.
- Mobile Android/iOS : versioning, channels beta/prod, store requirements, signature, changelog, rollback selon store.
- Desktop Linux/Windows/macOS : plus tard, à traiter comme cible séparée si le produit le justifie.
- Automatisation : définir quelles branches déclenchent build/test/deploy, et quelles validations humaines restent obligatoires.

## Structure GitHub / mono-repo vs multi-repo

À décider avant industrialisation CI/CD lourde.

Options :

- **Mono-repo actuel** : cohérence contrats API/front/mobile, changements atomiques, CI centralisée. Risque : pipelines plus lourds et droits d’accès moins segmentés.
- **Repos séparés backend / frontend / mobile** : pipelines et releases indépendants, droits plus fins. Risque : synchronisation contrats, versions et migrations plus complexe.
- **Hybride** : garder mono-repo tant que le produit évolue vite ; extraire plus tard mobile ou infra si cadence/release/équipes divergent.

Critères de décision :

- fréquence de release par surface ;
- nécessité de droits d’accès distincts ;
- poids CI/CD ;
- contrat API versionné ;
- distribution mobile indépendante ;
- simplicité de rollback.

## Gates avant prod

- Tests complets verts ou exceptions datées et validées.
- Préprod validée manuellement et techniquement.
- Scans sécurité P0 traités ou justifiés.
- Licences et notices prêtes.
- RGPD, rétention, consentement et suppression/export cadrés.
- Sauvegarde/restauration testée.
- Monitoring/alerting actif.
- Rollback documenté.
