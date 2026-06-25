# OVH — MX Plan `jobbingtrack.com` vs `maily.ovh`

Dernière mise à jour : 25 juin 2026

[← Index emails](README.md) | [SMTP](SMTP_CONFIGURATION.md) | [Comptes dev](COMPTES_EMAIL_DEV_ET_TESTS.md)

## Constat porteur (25/06/2026)

Sur l’espace client OVH, le domaine **`jobbingtrack.com`** affiche :

| Indicateur | Valeur observée | Interprétation |
|------------|-----------------|----------------|
| État du service | Actif | Le domaine est bien géré chez OVH |
| Offre MX Plan | **`redirect`** | **Redirections uniquement** — pas de boîtes mail hébergées |
| Quota comptes email | **0 / 0** | Aucun compte `@jobbingtrack.com` créable |
| Quota redirections | 0 / 1000 | Les alias/redirections sont possibles |
| Champs MX | `mx1.mail.ovh.net` (prio 1), `mx2` (5), `mx3` (100) | DNS MX corrects pour OVH |
| SPF zone DNS | `v=spf1 include:mx.ovh.com -all` | Aligné OVH — OK pour envoi via comptes OVH |
| Filer email | `-` | Pas de boîte active sur ce MX Plan |

Message OVH : **« Vous n'avez pas la possibilité de créer de compte email »** → cohérent avec l’offre **redirect** et le quota **0/0**.

En parallèle, **`maily.ovh`** dispose d’un MX Plan avec comptes réels (ex. `noreply@maily.ovh`) utilisé aujourd’hui pour l’authentification SMTP (`ssl0.ovh.net:587`).

## Pourquoi ce n’est pas un bug DNS

Les enregistrements MX et SPF de `jobbingtrack.com` sont **corrects** pour recevoir/envoyer via l’infra OVH **si** des comptes mail existent. Le blocage vient de l’**abonnement** : l’offre actuelle ne fournit **aucune** boîte, seulement des redirections (forward).

Tant que l’offre reste `redirect` avec quota `0/0`, impossible de créer `noreply@jobbingtrack.com`, `security@jobbingtrack.com`, etc. comme comptes SMTP authentifiés.

## Objectif produit (préprod / production)

Passer l’identité visible des emails applicatifs sur **`@jobbingtrack.com`** :

- Vérification compte, reset mot de passe
- Digest agent email (`noreply@jobbingtrack.com` ou alias dédié)
- Alertes sécurité (`security@jobbingtrack.com`)
- Meilleure légitimité (SPF/DKIM/DMARC alignés sur le domaine produit)

**Interdit en prod** : continuer indéfiniment avec `noreply@maily.ovh` comme expéditeur authentifié tout en affichant `@jobbingtrack.com` dans `SMTP_FROM` (risque SPF/DMARC fail, spam, rejet).

## Actions OVH à prévoir (porteur)

1. **Espace client OVH** → `jobbingtrack.com` → **Emails** → vérifier l’offre actuelle (`redirect`).
2. **Commander ou upgrader** vers une offre avec **comptes mail** :
   - **MX Plan** (1 à 200 comptes selon offre), ou
   - **Email Pro** (comptes individuels), ou
   - **Zimbra** si besoin collaboratif.
3. Après activation, créer au minimum :
   - `noreply@jobbingtrack.com` — transactionnel (vérif, reset, digest)
   - `security@jobbingtrack.com` — alertes (ou redirection vers liste interne)
   - `contact@jobbingtrack.com` — optionnel, réponses utilisateurs
4. **Zone DNS** (déjà en place, à compléter après création comptes) :
   - SPF : garder `include:mx.ovh.com` ou affiner selon doc OVH
   - **DKIM** : activer depuis le manager OVH (enregistrement TXT fourni par OVH)
   - **DMARC** : ajouter `_dmarc.jobbingtrack.com` TXT (ex. `v=DMARC1; p=none; rua=mailto:security@jobbingtrack.com`) puis durcir en `quarantine` / `reject`
5. **Redirections** (option intermédiaire) : avec l’offre `redirect`, on peut forwarder `noreply@jobbingtrack.com` → boîte porteur, mais **pas** s’authentifier en SMTP comme `@jobbingtrack.com` sans compte réel ou sans relais transactionnel (Brevo/SendGrid avec domaine vérifié).

## Matrice de choix SMTP

| Option | Expéditeur visible | Auth SMTP | Effort | Recommandation |
|--------|-------------------|-----------|--------|----------------|
| **A. Comptes OVH `@jobbingtrack.com`** | `@jobbingtrack.com` | `ssl0.ovh.net` + compte OVH | Moyen (upgrade MX Plan) | **Cible prod** si volume modéré |
| **B. Relais Brevo/SendGrid + domaine vérifié** | `@jobbingtrack.com` | API/clé relais | Moyen (DNS + validation domaine) | **Cible prod** si volume élevé / délivrabilité |
| **C. `maily.ovh` (état actuel)** | `@maily.ovh` (auth) | Compte existant | Faible | **Dev / transition** uniquement |
| **D. Gmail porteur** | Gmail | App password | Faible | **Dev/tests porteur** uniquement — voir [COMPTES_EMAIL_DEV_ET_TESTS.md](COMPTES_EMAIL_DEV_ET_TESTS.md) |

## Variables `.env` cibles (après migration)

```env
# Cible production — compte OVH jobbingtrack.com (exemple)
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USE_SSL=false
SMTP_USER=noreply@jobbingtrack.com
SMTP_PASS=<secret_compte_ovh>
SMTP_FROM=JobbingTrack <noreply@jobbingtrack.com>
SMTP_REPLY_TO=contact@jobbingtrack.com

EMAIL_TRIAGE_DIGEST_FROM=JobbingTrack <noreply@jobbingtrack.com>
SECURITY_ALERT_FROM=JobbingTrack Security <security@jobbingtrack.com>
```

Tant que les comptes n’existent pas, **ne pas** mettre `SMTP_USER=noreply@jobbingtrack.com` en local — les envois échoueront (auth refused).

## Tests à refaire après bascule domaine

Gate **obligatoire** avant préprod/prod (à noter dans `docs/production/A_VALIDER_AVANT_PRODUCTION.md`) :

| Test | Script / action | Critère |
|------|-----------------|---------|
| Connexion SMTP | Backoffice → Déliverabilité → test SMTP | OK sans `WRONG_VERSION_NUMBER` / auth fail |
| Vérif inscription | `smoke-resend-verification-api.js` + boîte réelle | Email reçu, `From` `@jobbingtrack.com`, lien cliquable |
| Deep link mobile | `smoke-verify-email-adb.js` | Token + login OK |
| Reset MDP | `smoke-auth-password-flows-e2e.js` | Mail reçu, lien reset OK |
| Digest agent | `seed-email-agent-digest-smoke.sql` | `EmailLog` SENT, expéditeur `@jobbingtrack.com` |
| Alertes sécurité | smoke notification-service | Réception + `messageId` fournisseur |
| SPF/DKIM/DMARC | [mail-tester.com](https://www.mail-tester.com) ou MXToolbox | Score ≥ 8/10, pas de fail SPF |
| IMAP agent (si boîte dédiée) | `smoke-imap-ovh.js` / bootstrap agent | Sync triage OK |

Les smokes actuels validés avec **`maily.ovh`** ou **Gmail porteur** ne prouvent **pas** la délivrabilité `@jobbingtrack.com`.

## État actuel documenté (ne pas confondre)

- **Dev local** : MailHog ou miroir SMTP `maily.ovh` — OK.
- **Agent email IMAP porteur** : `candidatures@delhomme.ovh` (autre domaine) — inchangé jusqu’à décision produit.
- **Identité digest cible** : déjà documentée `@jobbingtrack.com` dans `EMAIL_TRIAGE_DIGEST_FROM` — **config cible**, pas encore le transport réel.

## Suivi pilotage

- Backlog technique : voir `docs/pilotage/TODOS_A_VERIFIER.md` (ligne « Migration SMTP jobbingtrack.com »).
- Validation porteur : ligne à ajouter dans `TODOS_A_VALIDER.md` quand les comptes OVH seront créés et les smokes rejoués.
