# 📱 Accès au Backoffice depuis le Réseau Local

## 🔍 Problème

Lorsque vous essayez d'accéder à `localhost:5003/backoffice` depuis votre téléphone portable, vous obtenez "service temporarily unavailable" car `localhost` sur votre téléphone fait référence au téléphone lui-même, pas à votre ordinateur.

## ✅ Solution

### 1. Trouver l'IP Locale de Votre Ordinateur

Exécutez cette commande sur votre ordinateur :

```bash
ip route get 8.8.8.8 | awk '{print $7}' | head -1
```

Ou :

```bash
ip addr show | grep -E "inet.*192\.168\.|inet.*10\.|inet.*172\.(1[6-9]|2[0-9]|3[0-1])\." | grep -v "127.0.0.1" | grep -v "172.17.0.1" | head -1 | awk '{print $2}' | cut -d'/' -f1
```

Vous devriez obtenir une IP comme `192.168.1.134` ou `192.168.0.10`.

### 2. Accéder depuis Votre Téléphone

Sur votre téléphone, connecté au **même réseau Wi-Fi** que votre ordinateur, utilisez :

```
http://VOTRE_IP_LOCALE:5003/backoffice
```

Par exemple :
```
http://192.168.1.134:5003/backoffice
```

### 3. Vérifier le Firewall

Si cela ne fonctionne toujours pas, vérifiez que le port 5003 n'est pas bloqué par le firewall :

#### Sur Arch Linux (firewalld) :
```bash
sudo firewall-cmd --add-port=5003/tcp --permanent
sudo firewall-cmd --reload
```

#### Sur Ubuntu/Debian (ufw) :
```bash
sudo ufw allow 5003/tcp
sudo ufw reload
```

#### Sur iptables :
```bash
sudo iptables -A INPUT -p tcp --dport 5003 -j ACCEPT
```

### 4. Vérifier que le Service Écoute sur Toutes les Interfaces

Le service doit écouter sur `0.0.0.0` (toutes les interfaces), pas seulement sur `127.0.0.1` (localhost).

Vérifiez avec :
```bash
netstat -tuln | grep :5003
# ou
ss -tuln | grep :5003
```

Vous devriez voir :
```
tcp  0  0  0.0.0.0:5003  0.0.0.0:*  LISTEN
```

Si vous voyez `127.0.0.1:5003`, le service n'écoute que sur localhost.

### 5. Configuration Docker

Le `docker-compose.yml` est déjà configuré correctement :
```yaml
ports:
  - "0.0.0.0:${FRONTEND_PORT:-5003}:${FRONTEND_INTERNAL_PORT:-3000}"
```

Et Next.js est configuré pour écouter sur `0.0.0.0` :
```json
"dev": "next dev -H 0.0.0.0"
```

## 🔧 Dépannage

### Le service ne répond pas depuis le téléphone

1. **Vérifiez que vous êtes sur le même réseau Wi-Fi**
   - Votre téléphone et votre ordinateur doivent être sur le même réseau

2. **Vérifiez l'IP de votre ordinateur**
   ```bash
   hostname -I
   # ou
   ip addr show
   ```

3. **Testez depuis votre ordinateur avec l'IP locale**
   ```bash
   curl http://VOTRE_IP_LOCALE:5003
   ```

4. **Vérifiez les logs du conteneur**
   ```bash
   docker logs jobbingtrack-frontend --tail 50
   ```

5. **Redémarrez le service si nécessaire**
   ```bash
   docker restart jobbingtrack-frontend
   ```

### Le service répond mais les API ne fonctionnent pas

Les variables d'environnement `NEXT_PUBLIC_API_URL` doivent pointer vers l'IP locale, pas `localhost`.

Vérifiez dans `.env` ou `docker-compose.yml` :
```bash
NEXT_PUBLIC_API_URL=http://VOTRE_IP_LOCALE:5002
NEXT_PUBLIC_AUTH_SERVICE_URL=http://VOTRE_IP_LOCALE:5005
NEXT_PUBLIC_METRICS_URL=http://VOTRE_IP_LOCALE:5004
```

Puis redémarrez le conteneur :
```bash
docker restart jobbingtrack-frontend
```

## 📝 Notes

- L'IP locale peut changer si vous vous reconnectez à un autre réseau Wi-Fi
- Si vous utilisez un VPN, cela peut affecter l'accès réseau local
- Certains routeurs peuvent bloquer la communication entre appareils (isolation AP)

