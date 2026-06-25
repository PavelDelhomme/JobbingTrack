# Validation porteur — Étape 1 / 5 (ligne 319)

Inscription mobile + télémétrie obligatoire + **vérif email sur ta vraie boîte**.

Référence tableau : [`../pilotage/TODOS_A_VALIDER.md`](../pilotage/TODOS_A_VALIDER.md) § « Étape 1 ».  
Technique : [`INSCRIPTION_VERIFICATION_EMAIL.md`](INSCRIPTION_VERIFICATION_EMAIL.md).

---

## 1. Préparer l’environnement (≈ 10 min)

| # | Action | Vérification |
|---|--------|--------------|
| A | Stack locale démarrée (Postgres, gateway, auth, notification) | `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5002/api/v1/health` → **200** |
| B | Samsung USB + débogage | `adb devices` → `R5CT7263YJL device` |
| C | Redirection API vers le PC | `adb reverse tcp:5002 tcp:5002` |
| D | APK debug à jour | `bash scripts/mobile/setup/build-apk-debug.sh` puis install Success |
| E | Choisir un **email neuf** que tu consultes (pas déjà inscrit) | ex. alias `test+porteur20260617@delhomme.ovh` — voir [`BOITE_MAIL_INSCRIPTION_TESTS.md`](BOITE_MAIL_INSCRIPTION_TESTS.md) |

**Important — où lire le mail :**

- Les vérifs partent vers **l'adresse saisie à l'inscription**, pas vers `candidatures@delhomme.ovh` (boîte **agent email** uniquement).
- Avec `TEST_REAL_EMAIL=test@delhomme.ovh`, les alias `test+…@delhomme.ovh` arrivent sur la **boîte `test@…`** (plus-addressing OVH).
- Diagnostic : `node scripts/mobile/setup/diagnose-registration-email.js`

Si tu es déjà connecté sur l’app : **Profil → Déconnexion** (ou Paramètres) avant de tester l’inscription.

---

## 2. Tests sur le téléphone (dans l’ordre)

### Test A — Télémétrie refusée (bloquant)

1. Écran **Connexion** → **Créer un compte**
2. Remplir prénom, nom, email, mot de passe, accepter **conditions**
3. **Décocher** « Partager des données anonymes » (télémétrie)
4. Appuyer **S'inscrire**

**Attendu** : message d’erreur (snackbar rouge), **pas** d’écran « Vérifiez votre email ».

**Note** : texte exact du message → pour colonne *Notes porteur*.

### Test B — Inscription OK

1. **Recocher** télémétrie + conditions
2. Email **nouveau** (celui que tu lis vraiment)
3. **S'inscrire**

**Attendu** : écran **« Vérifiez votre email »** + bouton **Renvoyer l'email de vérification**.

**Preuve** : capture de cet écran.

### Test C — Mail réel (point bloquant porteur)

1. Ouvrir la boîte **`test@delhomme.ovh`** (ou la base de ton alias `test+…@delhomme.ovh`) — **pas** `candidatures@delhomme.ovh` (agent email uniquement)
2. Attendre **≤ 5 min** (vérifier spam)

**Attendu** : email JobbingTrack (vérif inscription) avec **lien web** et/ou lien **`jobbingtrack://verify-email`**.

**Preuve** : sujet du mail + adresse destinataire (ex. `test+porteur20260617@delhomme.ovh`).

Voir [`BOITE_MAIL_INSCRIPTION_TESTS.md`](BOITE_MAIL_INSCRIPTION_TESTS.md) si la boîte est vide alors que l'écran « Vérifiez votre email » s'affiche.

### Test D — Clic lien → compte activé

1. Depuis le **téléphone**, cliquer le lien dans le mail (ou ouvrir l’app via deep link)
2. **Attendu** : message type **« Email vérifié »** puis possibilité de **se connecter** avec le mot de passe choisi
3. Login → écran **Accueil** (« Bonjour … »)

**Preuve** : « deep link OK » ou « lien web OK » + login OK.

### Test E — (Option) Renvoi email

Sur l’écran « Vérifiez votre email », **Renvoyer** → message vert de confirmation ; second mail reçu.

---

## 3. Où noter le résultat

### Dans le chat (recommandé)

```text
OK Mobile — Inscription + télémétrie obligatoire + vérif email
Notes : refus télémétrie OK ; mail reçu sur mon-alias@… ; lien web OK ; login OK
Preuves : capture écran Vérifiez votre email
```

ou

```text
KO Mobile — Inscription + télémétrie obligatoire + vérif email
Détail : pas de mail après 10 min sur … / snackbar incompréhensible si télémétrie décochée / …
```

### Dans le tableau (optionnel)

Fichier : [`../pilotage/TODOS_A_VALIDER.md`](../pilotage/TODOS_A_VALIDER.md) — **ligne 319** :

- **Notes porteur** : tes observations
- **Preuves porteur** : captures, email, compte testé
- **Décision porteur** : `OK Mobile — Inscription + télémétrie obligatoire + vérif email`

L’agent archive ensuite dans `TODOS_DONE.md` et débloque l’**étape 2** (ligne 320).

---

## 4. Si le mail n’arrive pas

| Cause fréquente | Vérification |
|-----------------|--------------|
| SMTP `.env` | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` — mails partent-ils en `EmailLog` **SENT** ? |
| Mauvaise boîte | Le mail part vers l'adresse **saisie à l'inscription** — lire **`test@…`** pour les alias `test+…`, **pas** `candidatures@…` | voir [`BOITE_MAIL_INSCRIPTION_TESTS.md`](BOITE_MAIL_INSCRIPTION_TESTS.md) |
| Compte déjà existant | Utiliser un **autre** alias email |
| Gateway | `adb reverse` actif ; app en debug pointe bien `127.0.0.1:5002` |

Diagnostic agent (toi ou moi) :

```bash
node scripts/mobile/setup/diagnose-registration-email.js
node scripts/mobile/smoke/api/smoke-resend-verification-api.js
# Backoffice → Email Monitor, filtre vérification
```

Ne pas passer à l’étape 2 tant que le **Test C + D** ne sont pas OK sur **ta** boîte mail.

---

## 5. Ce que l’agent a déjà validé (tu n’as pas à refaire)

- Smokes API renvoi vérif
- **`smoke-etape1-inscription-adb.js`** — batterie **A→E** sur Samsung (25/06) : refus télémétrie, inscription alias réel, renvoi, token EmailLog, deep link, login mobile
- EmailLog SENT côté serveur

**Validation porteur optionnelle** si tu veux confirmer manuellement ; sinon répondre `OK Mobile — Inscription + télémétrie obligatoire + vérif email` après lecture des preuves agent ci-dessus.
