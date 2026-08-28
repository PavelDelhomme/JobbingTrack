# DNS OVH — jobbingtrack.com (guide porteur)

> **Zone** : `jobbingtrack.com`  
> **IP VPS** : `95.111.227.204` (Contabo / pavel-server)  
> **Panel** : https://www.ovh.com/manager/ → **Noms de domaine** → **jobbingtrack.com** → onglet **Zone DNS**

---

## 1. Ce qui doit exister (checklist)

| Sous-domaine (champ OVH) | Type | Cible | Rôle | État attendu |
|--------------------------|------|-------|------|--------------|
| *(vide = `@`)* | **A** | `95.111.227.204` | Vitrine prod `jobbingtrack.com` | ✅ déjà OK |
| `www` | **A** | `95.111.227.204` | Vitrine prod `www.jobbingtrack.com` | ✅ déjà OK |
| `api` | **A** | `95.111.227.204` | API prod | ✅ déjà OK |
| **`backoffice`** | **A** | `95.111.227.204` | **Admin prod** → login/backoffice | ❌ **À CRÉER** |
| `preprod` | **A** | `95.111.227.204` | Vitrine préprod | ✅ déjà OK |
| `api-preprod` | **A** | `95.111.227.204` | API préprod | ✅ déjà OK |
| **`backoffice-preprod`** | **A** | `95.111.227.204` | **Admin préprod** | ❌ **À CRÉER** |

Vérifier depuis ton PC :

```bash
dig +short backoffice.jobbingtrack.com
dig +short backoffice-preprod.jobbingtrack.com
# Les deux doivent répondre : 95.111.227.204
```

---

## 2. Créer un enregistrement A dans OVH (répéter 2 fois)

### Enregistrement A — `backoffice`

1. OVH Manager → **Web Cloud** → **Noms de domaine** → cliquer **jobbingtrack.com**
2. Onglet **Zone DNS**
3. Bouton **Ajouter une entrée** (ou **Add an entry**)
4. Choisir le type **A**
5. Remplir :
   - **Sous-domaine** : `backoffice`  
     *(ne pas mettre `backoffice.jobbingtrack.com` entier — seulement `backoffice`)*
   - **Cible / Target** : `95.111.227.204`
   - **TTL** : laisser par défaut (ex. 3600)
6. **Valider** / **Suivant** → **Confirmer**

→ URL finale : **https://backoffice.jobbingtrack.com**

### Enregistrement A — `backoffice-preprod`

Même procédure, sous-domaine : **`backoffice-preprod`**

→ URL finale : **https://backoffice-preprod.jobbingtrack.com**

---

## 3. Propagation DNS

- Souvent **5 à 30 minutes** ; parfois jusqu’à 1 h.
- Tant que `dig +short backoffice.jobbingtrack.com` ne renvoie **rien**, **ne pas** demander le certificat Let's Encrypt dans NPM (échec garanti).

---

## 4. Après propagation — NPM (Proxy Hosts)

Quand `dig` répond `95.111.227.204` pour les deux :

### Option A — script (recommandé)

1. Ouvrir https://nginx.delhomme.ovh et te connecter
2. F12 → Console → récupérer le token :
   ```javascript
   JSON.parse(localStorage.getItem('nginx-proxy-manager-tokens'))[0].t
   ```
3. Sur ton PC (depôt JobbingTrack) :
   ```bash
   NPM_TOKEN='coller_le_jwt_ici' bash scripts/deploy/setup-npm-backoffice-hosts.sh
   ```

### Option B — interface NPM (manuel)

https://nginx.delhomme.ovh → **Hosts** → **Proxy Hosts** → **Add Proxy Host**

**Host prod admin**

| Champ | Valeur |
|-------|--------|
| Domain Names | `backoffice.jobbingtrack.com` |
| Scheme | `http` |
| Forward Hostname | `jobbingtrack-prod-frontend` |
| Forward Port | `3000` |
| Block Common Exploits | ✅ |
| Websockets | ✅ |
| SSL | Request a new SSL Certificate (Let's Encrypt) |
| Force SSL | ✅ |
| Email | ton email (ex. admin@delhomme.ovh) |

**Host préprod admin**

| Domain Names | `backoffice-preprod.jobbingtrack.com` |
| Forward Hostname | `jobbingtrack-preprod-frontend` |
| Forward Port | `3000` |
| SSL | idem Let's Encrypt |

---

## 5. Smoke tests finaux

```bash
curl -fsS -o /dev/null -w "vitrine:%{http_code}\n" https://jobbingtrack.com/
curl -fsS -o /dev/null -w "backoffice:%{http_code}\n" https://backoffice.jobbingtrack.com/login
curl -fsS https://api.jobbingtrack.com/health
```

Navigateur :

1. **https://jobbingtrack.com** → page vitrine « Pilote ta recherche… »
2. **https://backoffice.jobbingtrack.com** → page **login** admin
3. Login `admin@jobbingtrack.com` + mot de passe `.env` → **/backoffice**

---

## 6. Rappel architecture (déjà en place côté serveur)

| Composant | État |
|-----------|------|
| GitHub `dev` + CI GHCR `:dev` / `:latest` | ✅ |
| Portainer `jobbingtrack-prod` + `jobbingtrack-preprod` | ✅ |
| NPM vitrine + API (hosts 19–22) | ✅ |
| NPM backoffice (hosts admin) | ⏳ après DNS + étape 4 |
| Aucun port Docker publié (NPM only) | ✅ |

Ne **pas** pointer `jobbingtrack.com` vers Nextcloud ou un autre service : cible **toujours** `jobbingtrack-prod-frontend:3000` dans NPM.
