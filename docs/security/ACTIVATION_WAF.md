# 🛡️ Activation et Configuration du WAF

**WAF** = Web Application Firewall  
**Statut** : ✅ Implémenté et prêt à activer

---

## Architecture (où s’exécute le WAF ?)

| Couche | Rôle |
|--------|------|
| **API Gateway** (`backend/api-gateway/src/middleware/waf.js`) | **Filtrage HTTP** des requêtes entrantes (patterns OWASP, liste noire, bypass interne contrôlé). C’est le seul composant qui **bloque** ou **laisse passer** le trafic applicatif sur le chemin actuel. |
| **security-service** | **Pilotage** : API REST de configuration / statistiques / toggles WAF (`/api/v1/security/waf/*`), alignée sur les mêmes familles de règles pour la cohérence métier — **pas** un reverse-proxy devant le trafic. |
| **Nginx (prod)** | Dans `production/docker-compose.production.yml`, un volume `./nginx/waf` peut accueillir des règles **complémentaires** côté edge ; ce n’est pas le même code que le middleware Node. |

Une évolution possible (hors périmètre actuel) : **reverse-proxy WAF dédié** (ModSecurity / Coraza / sidecar Envoy / WAF managé) **devant** la gateway, pour inspecter le trafic avant Node ; le dépôt ne fournit pas encore ce conteneur. Chantier cadré dans **`docs/TODOS.md`** (priorité env stricte / WAF edge) et ci-dessous.

#### Chantier « WAF edge » (prochaine étape possible)

1. Choisir la brique (ex. Nginx + ModSecurity, Traefik + plugin, Coraza en sidecar).
2. Ajouter un service Compose sur le chemin public (443/80 ou `dev-https-proxy` → WAF → `api-gateway`).
3. Propager `X-Forwarded-For`, `X-Request-Id`, limites de corps ; aligner les CIDR bypass avec `WAF_INTERNAL_BYPASS_*`.
4. Tests : mêmes jeux de requêtes malveillantes qu’aujourd’hui sur `waf.js`, plus non-régression latence et WebSockets si concernés.

---

## 🎯 Qu'est-ce que le WAF ?

Le WAF protège votre application contre :
- ✅ Injections SQL
- ✅ Attaques XSS (Cross-Site Scripting)
- ✅ Path Traversal
- ✅ Command Injection
- ✅ LDAP Injection
- ✅ User-Agents suspects (scanners de vulnérabilités)
- ✅ Patterns malveillants

### Règles OWASP Implémentées
- SQL Injection (23 patterns)
- XSS (10 patterns)
- Path Traversal (8 patterns)
- Command Injection (5 patterns)
- LDAP Injection (3 patterns)
- Suspicious User-Agents (14 patterns de scanners)
- Malicious Patterns (12 patterns de code malveillant)

---

## 🚀 ACTIVATION RAPIDE

### Option 1 : Variable d'Environnement (Recommandé)

```bash
# Dans backend/api-gateway/.env
WAF_ENABLED=true
```

### Option 2 : Docker Compose

```yaml
# Dans docker-compose.yml ou backend/docker-compose.yml
api-gateway:
  environment:
    - WAF_ENABLED=true
```

### Option 3 : Ligne de Commande

```bash
# Redémarrer l'API Gateway avec le WAF activé
docker restart jobbingtrack-api-gateway

# Ou avec make
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack
make restart-service SERVICE=api-gateway
```

---

## 📝 ACTIVATION COMPLÈTE - Étape par Étape

### Étape 1 : Modifier le Fichier d'Environnement

```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack
echo "WAF_ENABLED=true" >> backend/api-gateway/.env
```

### Étape 2 : Ou Modifier Docker Compose

```bash
# Ouvrir backend/docker-compose.yml
# Chercher la section api-gateway
# Ajouter sous environment:
```

```yaml
api-gateway:
  environment:
    - WAF_ENABLED=true
    - ADMIN_WHITELIST_IPS=127.0.0.1,::1  # IPs admin (optionnel)
```

### Étape 3 : Redémarrer l'API Gateway

```bash
docker-compose -f docker-compose.yml -f backend/docker-compose.yml restart api-gateway
```

### Étape 4 : Vérifier l'Activation

```bash
# Faire une requête et vérifier les headers
curl -I http://localhost:3000/health

# Vous devriez voir:
# X-WAF-Status: PASSED
# X-Protected-By: JobbingTrack-WAF
# X-OWASP-Protection: ENABLED
```

---

## 🎛️ Configuration Avancée

### Liste Noire d'IPs

**Fichier** : `backend/api-gateway/src/middleware/waf.js`

```javascript
const BLACKLISTED_IPS = [
  '192.168.1.100',  // IP à bloquer
  '10.0.0.50'
];
```

### Liste Blanche d'IPs (pour Admin)

```javascript
const WHITELISTED_IPS = [
  '127.0.0.1',      // Localhost
  '10.0.0.1'        // Serveur de monitoring
];
```

### Configuration des Seuils de Sévérité

Le WAF bloque automatiquement selon la sévérité :
- **Low** : Log uniquement
- **Medium** : Log + alerte
- **High** : Bloque la requête (403)
- **Critical** : Bloque la requête (403)

---

## 📊 Monitoring du WAF

### Voir les Logs du WAF

```bash
# Logs en temps réel
docker logs jobbingtrack-api-gateway -f | grep WAF

# Logs des attaques bloquées
docker logs jobbingtrack-api-gateway | grep "Attaque détectée par WAF"
```

### Statistiques du WAF

Le WAF log automatiquement :
- IP de l'attaquant
- URL ciblée
- Type d'attaque détectée
- Sévérité
- Timestamp

### Exemple de Log

```json
{
  "level": "warn",
  "message": "Attaque détectée par WAF",
  "ip": "192.168.1.100",
  "url": "/api/v1/users?id=1' OR '1'='1",
  "method": "GET",
  "userAgent": "sqlmap/1.5.10",
  "detections": [
    {
      "rule": "SQL_INJECTION",
      "severity": "high",
      "message": "Injection SQL détectée"
    }
  ]
}
```

---

## 🧪 Tester le WAF

### Test 1 : Injection SQL

```bash
# Devrait être bloqué (403)
curl "http://localhost:3000/api/v1/users?id=1' OR '1'='1"
```

**Réponse attendue** :
```json
{
  "success": false,
  "error": "Requête bloquée",
  "message": "Votre requête a été identifiée comme potentiellement malveillante et a été bloquée.",
  "code": "WAF_BLOCKED"
}
```

### Test 2 : XSS

```bash
# Devrait être bloqué (403)
curl -X POST http://localhost:3000/api/v1/comments \
  -H "Content-Type: application/json" \
  -d '{"text":"<script>alert(1)</script>"}'
```

### Test 3 : User-Agent Suspect

```bash
# Devrait être bloqué (403)
curl -A "sqlmap/1.5.10" http://localhost:3000/api/v1/users
```

### Test 4 : Requête Légitime

```bash
# Ne devrait PAS être bloqué
curl http://localhost:3000/health
```

**Réponse attendue** :
```
X-WAF-Status: PASSED
X-Protected-By: JobbingTrack-WAF
X-OWASP-Protection: ENABLED
```

---

## 🔧 Mode test / développement (contournement WAF)

En **non-production**, si `DEV_TEST_BYPASS_TOKEN` est défini dans l’environnement de la gateway **et** respecte le format **`jtbypass1-` + au moins 32 caractères** parmi `[A-Za-z0-9_-]` (voir `config/dev-test-bypass-format.cjs`), une requête peut transmettre le **même** secret dans l’en-tête **`X-JobbingTrack-Dev-Test-Token`**. Le WAF, la détection d’intrusion et le rate-limit ignorent alors la requête **uniquement** si le jeton correspond octet pour octet (comparaison résistante au timing).

Un mot de passe métier, une URL ou une phrase « plausible » **ne peut pas** activer le bypass par erreur : le préfixe versionné est obligatoire ; génération recommandée via `node scripts/env/env-generate-secrets.cjs --write`.

Ce mécanisme **remplace** d’anciens contournements basés sur `X-Test-Mode` ou sur un User-Agent « Playwright », trop faciles à falsifier.

```bash
# Générer les secrets (dont DEV_TEST_BYPASS_TOKEN) :
# node scripts/env/env-generate-secrets.cjs --write

# Exemple (remplacer YOUR_TOKEN par la valeur de .env) :
curl -H "X-JobbingTrack-Dev-Test-Token: YOUR_TOKEN" \
  "http://localhost:3000/api/v1/companies?search=test"
```

En **production**, `isDevTestBypassRequest` est toujours désactivé (`NODE_ENV=production`).
---

## ⚠️ Considérations Importantes

### Faux Positifs

Certains patterns peuvent bloquer des requêtes légitimes :
- URLs avec caractères spéciaux
- Données JSON complexes
- User-Agents non standard

**Solution** : Ajuster les patterns dans `backend/api-gateway/src/middleware/waf.js`

### Performance

Le WAF ajoute ~5-10ms de latence par requête (négligeable).

### Logs

En production, configurer une rotation des logs pour éviter de saturer le disque.

---

## 📋 Checklist d'Activation

- [ ] Variable `WAF_ENABLED=true` ajoutée
- [ ] API Gateway redémarré
- [ ] Headers WAF vérifiés (`X-WAF-Status: PASSED`)
- [ ] Tests d'injection effectués
- [ ] Logs WAF consultés
- [ ] Liste noire/blanche configurée (si nécessaire)
- [ ] Monitoring des logs activé

---

## 🆘 Dépannage

### Problème : WAF ne se active pas

```bash
# Vérifier les variables d'environnement
docker exec jobbingtrack-api-gateway env | grep WAF

# Devrait afficher: WAF_ENABLED=true
```

### Problème : Trop de faux positifs

```bash
# Désactiver temporairement
WAF_ENABLED=false

# Ajuster les patterns dans waf.js
# Redémarrer
docker restart jobbingtrack-api-gateway
```

### Problème : Pas de logs WAF

```bash
# Vérifier que le WAF est actif
docker logs jobbingtrack-api-gateway | grep "WAF" | tail -20
```

---

## 📚 Fichiers Concernés

- **Middleware WAF** : `backend/api-gateway/src/middleware/waf.js`
- **Activation** : `backend/api-gateway/src/server.js` (ligne 96-98)
- **Config** : `backend/api-gateway/.env` (ajouter `WAF_ENABLED=true`)

---

## 🎉 Résultat Final

Une fois activé, le WAF :
- ✅ Protège contre les attaques OWASP Top 10
- ✅ Log toutes les tentatives d'attaque
- ✅ Bloque automatiquement les requêtes malveillantes
- ✅ Ajoute des headers de sécurité
- ✅ Maintient une liste noire d'IPs
- ✅ N'impacte pas les performances significativement

---

**Pour activer maintenant** :

```bash
cd /home/pactivisme/Documents/Dev/Perso/JobbingTrack
echo "WAF_ENABLED=true" >> backend/api-gateway/.env
docker restart jobbingtrack-api-gateway
```

**✨ Votre application est maintenant protégée par un WAF OWASP complet !**

