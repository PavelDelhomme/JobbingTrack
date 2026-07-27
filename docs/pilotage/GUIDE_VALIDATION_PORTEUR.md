# Guide validation porteur (Pilotage web)

**Phase B · B2 · D.6** · APK `1.0.33+33`

## URL obligatoire (HTTPS)

Utiliser **uniquement** :

```text
https://jobbingtrack.localhost:5443/backoffice/pilotage
```

Alias OK : `https://jobbingtrack.localhost:5443/b4ck0ff1ce/pilotage` → redirige vers `/backoffice`.

| À éviter | Pourquoi |
|----------|----------|
| `http://localhost:5003/...` | HTTP clair — redirigé vers HTTPS 5443 |
| `https://localhost:5003/...` | **ERR_SSL_PROTOCOL_ERROR** (port HTTP, pas de TLS) |
| `https://localhost:5002/...` | Idem (gateway HTTP brute) |

API : `https://api.jobbingtrack.localhost:5443` (jamais `https://…:5002`).

Compte : **SUPER_ADMIN** pour OK / KO / PARTIEL / Plus tard.

---

## Comment valider (dans l’UI)

1. Tester sur le **Samsung** (ou l’écran concerné).
2. Ouvrir le **Tableau de suivi** → cliquer la tâche → fiche détail.
3. Cocher les **sous-critères** faits.
4. Écrire ce que tu as constaté dans **« Ce que j’ai constaté »**.
5. Choisir une décision :

| Bouton | Quand l’utiliser |
|--------|------------------|
| **OK** | Tout est bon (tous les critères cochés si checklist) |
| **PARTIEL** | Une partie marche, le reste à retester plus tard |
| **KO** | Ça ne marche pas / régression |
| **À reprendre** | Déjà vu OK, puis casse → à refaire |
| **Plus tard** | Tu reportes volontairement (ex. Entreprises plus tard) |

L’UI écrit dans `validation-board.json` + `TODOS_A_VALIDER.md` + preuve `TODOS_A_TESTER.md`.  
Tu n’as **pas** à éditer les `.md` à la main pour valider.

Filtres utiles : **Maintenant** · **Plus tard** · **Cycles** (ex. FAB mobile) · **Déjà décidé**.

---

## File B2 actuelle

| Point | Action | Décision UI |
|-------|--------|-------------|
| D.6 | FAB → Relance (APK 1.0.33) | OK / KO / PARTIEL… |
| D.7 | FAB → Appel | après D.6 |
| D.8 | FAB → Entretien | |
| D.9 | FAB → Contact | |
| E.10 | Re-tap Candidatures | |
| E.11 | Contacts FAB + | |
| F.12 | Double retour Accueil | |

OK global (quand D→F OK) :

```text
OK Mobile — navigation retour, admin, relances, ajouts candidature
```

---

## Mobile admin

Hub Admin → **Pilotage** : miroir « où j’en suis » + lien vers le **Pilotage web HTTPS** pour les décisions OK/KO.
