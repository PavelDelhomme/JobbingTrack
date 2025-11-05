# 📧 MailHog - Guide Ultra-Rapide

## 🎯 C'est Quoi MailHog ?

**MailHog** = Serveur SMTP **FICTIF** qui intercepte TOUS les emails

```
Application envoie email
    ↓
MailHog intercepte
    ↓
Email JAMAIS envoyé réellement
    ↓
Visible sur http://localhost:8025
```

**Parfait pour développement** :
- ✅ Aucun email envoyé réellement (sécurité)
- ✅ Pas besoin de domaine
- ✅ Pas besoin de configuration DNS
- ✅ Interface web pour voir tous les emails
- ✅ Installation en 1 commande

---

## 🚀 Installation (Sur Manjaro)

```bash
# Installer MailHog
yay -S mailhog

# C'est tout !
```

---

## ⚡ Utilisation

### Terminal 1 : Lancer MailHog
```bash
mailhog
```

**Sortie normale** :
```
[HTTP] Binding to address: 0.0.0.0:8025
[SMTP] Binding to address: 0.0.0.0:1025
```

**Laissez ce terminal ouvert !** MailHog tourne en arrière-plan.

---

### Terminal 2 : Configuration

```bash
# Éditer .env
nano backend/auth-service/.env
```

**Copier-coller exactement ça** :
```env
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=JobbingTrack <noreply@localhost>
FRONTEND_URL=http://localhost:5173
```

**Redémarrer le service** :
```bash
docker-compose restart auth-service
```

---

### Terminal 2 : Tester

```bash
make test-email-verification
```

**OU tester manuellement** :
```bash
# 1. Ouvrir navigateur
http://localhost:5173/register

# 2. Créer un compte
# Email : test@example.com
# Password : Test123!
# etc.

# 3. Ouvrir interface MailHog
http://localhost:8025

# 4. Voir l'email de vérification !
# → Cliquer sur l'email
# → Voir le contenu HTML
# → Copier le lien de vérification
# → Le tester dans le navigateur
```

---

## 🎨 Interface MailHog

Ouvrir : **http://localhost:8025**

Vous verrez :
```
┌─────────────────────────────────────────────┐
│  MailHog                                    │
├─────────────────────────────────────────────┤
│  📧 Inbox (2 messages)                      │
│                                             │
│  ✉️ JobbingTrack - Vérification Email       │
│     De: JobbingTrack <noreply@localhost>   │
│     À: test@example.com                     │
│     Date: 05/11/2025 14:00                  │
│                                             │
│  🎉 JobbingTrack - Bienvenue !              │
│     De: JobbingTrack <noreply@localhost>   │
│     À: test@example.com                     │
│     Date: 05/11/2025 14:00                  │
└─────────────────────────────────────────────┘
```

**Cliquer sur un email** → Voir le contenu complet HTML

---

## ❓ Questions Fréquentes

**Q: Les emails sont vraiment envoyés ?**  
R: **NON !** MailHog les intercepte. Aucun email n'est envoyé réellement.

**Q: J'ai besoin d'un domaine ?**  
R: **NON !** Pas pour le développement local.

**Q: Je dois configurer OVH ?**  
R: **NON !** OVH n'est nécessaire que pour la production.

**Q: delhomme.ovh est utilisé ?**  
R: **NON !** Pas touché en dev local. Seulement si production.

**Q: Je dois acheter jobbingtrack.fr ?**  
R: **NON !** Seulement si tu veux un domaine dédié en production.

**Q: MailHog doit rester ouvert ?**  
R: **OUI !** Laisse le terminal ouvert pendant que tu développes.

**Q: Comment arrêter MailHog ?**  
R: Ctrl+C dans le terminal où mailhog tourne.

---

## 🔍 Vérifier que ça Marche

### Test 1 : MailHog est lancé
```bash
# Ouvrir
http://localhost:8025

# Devrait afficher interface MailHog
# Si erreur → MailHog pas lancé
```

### Test 2 : Application peut se connecter
```bash
# Vérifier config
cat backend/auth-service/.env | grep SMTP

# Devrait afficher :
# SMTP_HOST=localhost
# SMTP_PORT=1025
```

### Test 3 : Email envoyé
```bash
# Lancer test
make test-email-verification

# Vérifier http://localhost:8025
# → Devrait voir emails
```

---

## 🆘 Dépannage

**MailHog ne démarre pas** :
```bash
# Vérifier si déjà lancé
ps aux | grep mailhog

# Tuer si déjà lancé
pkill mailhog

# Relancer
mailhog
```

**Interface web ne s'ouvre pas** :
```bash
# Vérifier port 8025 libre
lsof -i :8025

# Si occupé, tuer processus
kill -9 PID

# Relancer MailHog
mailhog
```

**Emails n'arrivent pas** :
```bash
# 1. Vérifier MailHog lancé
ps aux | grep mailhog

# 2. Vérifier .env
cat backend/auth-service/.env | grep SMTP_HOST
# Doit être : SMTP_HOST=localhost

# 3. Vérifier logs auth-service
docker logs jobbingtrack-auth-service --tail 20
```

---

## 🎯 Résumé

**Pour DEV (maintenant)** :
```bash
yay -S mailhog
mailhog
# → Configurer .env avec localhost
# → C'est tout !
```

**Pour PRODUCTION (plus tard)** :
```bash
# Choix A : Utiliser delhomme.ovh
# Choix B : Acheter jobbingtrack.fr
# → Configuration OVH (5 minutes)
# → Voir STATUS.md section 1.12
```

---

**Tu n'as besoin de RIEN pour le moment !** ✨

**Juste** : `yay -S mailhog` et `mailhog`

Tout le reste (domaine, OVH, DNS) c'est **SEULEMENT pour production** !

