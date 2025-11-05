# 🚀 Démarrage Rapide SMTP - Développement Local

## ⚡ Solution Simple avec MailHog (5 minutes)

### Étape 1 : Installer MailHog
```bash
yay -S mailhog
# OU
wget https://github.com/mailhog/MailHog/releases/download/v1.0.1/MailHog_linux_amd64
chmod +x MailHog_linux_amd64
sudo mv MailHog_linux_amd64 /usr/local/bin/mailhog
```

### Étape 2 : Lancer MailHog
```bash
mailhog
# → SMTP server: localhost:1025
# → Web interface: http://localhost:8025
```

### Étape 3 : Configuration .env
```bash
# backend/auth-service/.env
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=JobbingTrack <noreply@localhost>
FRONTEND_URL=http://localhost:5173
```

### Étape 4 : Redémarrer
```bash
docker-compose restart auth-service
```

### Étape 5 : Tester
```bash
make test-email-verification
# → Voir emails sur http://localhost:8025
```

---

## ✅ C'est Tout !

Tous les emails seront interceptés et visibles sur http://localhost:8025

**Aucun email n'est envoyé réellement** (parfait pour le développement)

---

## 📚 Pour Production avec OVH

**Voir STATUS.md section 1.12 → "Option 2 : OVH Email"**

```bash
# Configuration simple OVH
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@votre-domaine.com
SMTP_PASS=votre-mot-de-passe-ovh
```

---

**Tout est documenté dans STATUS.md section 1.12** 📖

