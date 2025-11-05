# 📧 Configuration SMTP - Résumé

## 🎯 Votre Situation

Vous avez un compte OVH et voulez envoyer des emails de vérification.

---

## ✅ Solution Simple pour VOUS

### Pour DÉVELOPPEMENT LOCAL (maintenant)

**Utiliser MailHog** (serveur SMTP local qui intercepte les emails) :

```bash
# 1. Installer (1 commande sur Manjaro)
yay -S mailhog

# 2. Lancer dans un terminal
mailhog

# 3. Éditer backend/auth-service/.env
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=JobbingTrack <noreply@localhost>
FRONTEND_URL=http://localhost:5173

# 4. Redémarrer
docker-compose restart auth-service

# 5. Tester
make test-email-verification
# → Voir emails sur http://localhost:8025
```

**Temps total : 5 minutes**

---

### Pour PRODUCTION (sur votre VPS)

**Utiliser OVH Email** (le plus simple avec votre compte existant) :

```bash
# 1. Créer adresse email chez OVH
# → https://www.ovh.com/manager/web/
# → Emails → Créer : redacted@example.invalid
# → Définir mot de passe

# 2. Sur votre VPS, éditer .env production
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=redacted@example.invalid
SMTP_PASS=le-mot-de-passe-defini-chez-ovh
SMTP_FROM=JobbingTrack <redacted@example.invalid>
FRONTEND_URL=https://votre-domaine.com

# 3. Redémarrer sur VPS
docker-compose restart auth-service

# 4. Tester
# S'inscrire sur votre site → Email arrive vraiment ✅
```

**Coût : ~1€/mois**  
**Temps configuration : 10 minutes**

---

## 📚 Autres Options (si besoin plus tard)

Toutes détaillées dans **STATUS.md section 1.12** :

| Option | Complexité | Coût | Quand utiliser |
|--------|-----------|------|----------------|
| **MailHog** | ⭐ Facile | Gratuit | Développement local |
| **OVH Email** | ⭐⭐ Moyen | ~1€/mois | Production (recommandé pour vous) |
| **Postfix VPS** | ⭐⭐⭐⭐ Difficile | Gratuit | Si >1000 emails/jour |
| **Docker Postfix** | ⭐⭐⭐ Moyen | Gratuit | Staging |

---

## 🎯 Ce que je vous recommande

### Aujourd'hui (développement)
```bash
yay -S mailhog
mailhog
# → Configurer .env avec localhost:1025
# → C'est tout ! Emails sur http://localhost:8025
```

### Quand vous déployez en production
```bash
# 1. Créer email OVH : redacted@example.invalid
# 2. Configurer .env avec ssl0.ovh.net
# 3. C'est tout ! OVH gère le reste (DNS, DKIM, etc.)
```

---

## ❓ FAQ

**Q: Dois-je installer Postfix localement ?**  
R: NON ! MailHog suffit pour le développement.

**Q: Postfix est obligatoire sur le VPS ?**  
R: NON ! OVH Email est plus simple et suffit.

**Q: Quand utiliser Postfix sur VPS ?**  
R: Si vous envoyez >1000 emails/jour ou voulez contrôle total.

**Q: MailHog envoie vraiment des emails ?**  
R: NON ! Il les intercepte (parfait pour développement).

**Q: OVH gère SPF/DKIM/DMARC ?**  
R: OUI ! Tout est automatique.

---

## 📖 Documentation Complète

**STATUS.md section 1.12** contient :
- ✅ Guide MailHog complet
- ✅ Guide OVH Email complet
- ✅ Guide Postfix VPS complet (10 étapes)
- ✅ Configuration Docker
- ✅ Tests et dépannage
- ✅ Monitoring

**Total : 850 lignes de documentation**

---

## ✨ Résumé

**Maintenant** : MailHog (5 minutes)  
**Production** : OVH Email (10 minutes)  
**Optionnel** : Postfix VPS (si beaucoup d'emails)

**Tout est dans STATUS.md !** 📖
