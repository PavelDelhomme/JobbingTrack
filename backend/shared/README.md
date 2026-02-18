# Backend shared

Utilitaires partagés entre les microservices JobbingTrack.

## centralLogger (`utils/centralLogger.js`)

Logger centralisé qui envoie les logs **ERROR**, **WARN** et **FATAL** au metrics-aggregator (`POST /api/v1/persistence/logs`).

- **Variables d'environnement** : `METRICS_SERVICE_URL` ou `METRICS_AGGREGATOR_URL` (défaut : `http://jobbingtrack-metrics-aggregator:3014`). `ENABLE_CENTRAL_LOGGING=false` pour désactiver.
- **Usage** : `const logger = require('./shared/utils/centralLogger'); logger.error('Message', { userId: '123' });`
- Les niveaux INFO/DEBUG ne sont pas envoyés au serveur (seulement en console locale).

### Déployer centralLogger dans un autre service

1. Copier `backend/shared/utils/centralLogger.js` vers `backend/<service>/src/utils/centralLogger.js`.
2. Dans le logger Winston du service : ajouter un transport qui appelle `centralLogger.addLog(level, message, metadata)` pour ERROR, WARN, FATAL (voir auth-service pour CentralLoggerTransport).
3. Le service doit avoir `axios` et `METRICS_AGGREGATOR_URL` ou `METRICS_SERVICE_URL`.

**Déjà déployé** : auth-service, application-service, security-service.

## logger-filter (`logger-filter.js`)

Filtres Winston pour réduire le bruit en développement (erreurs P2021, tables absentes, etc.).

- **Exports** : `filterP2021Errors`, `filterP2021InPrintf`.
- **Usage** : dans le logger Winston de chaque service, ajouter le format et le printf qui utilisent ces filtres. En local on peut importer depuis `backend/shared/logger-filter.js` ; en Docker chaque service garde une copie locale (`src/utils/logger-filter.js`) car le build n’inclut pas `shared`. Garder cette copie en sync avec le fichier shared.

Voir auth-service, application-service, security-service, etc. pour l’intégration.
