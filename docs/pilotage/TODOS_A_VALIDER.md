# TODOs à valider (phase active uniquement)

> **Process** : voir [`PILOTAGE.md`](PILOTAGE.md).  
> Tu remplis **uniquement** ce fichier pour la phase en cours. Pas d’autres phases ici.

**Phase active** : **B — Gate pré-prod mobile**  
**Point exact** : **B2-D.6** FAB Relance (+ correctifs session 22/07 à re-valider)  
**APK** : `1.0.32+32` · Samsung

---

## Correctifs session 22/07 (re-valider avant / avec B2)

| ID | À faire | Décision | Notes |
|----|---------|----------|-------|
| **MOB-ENT-01** | Onglet **Entreprises** : voir OVHcloud, Capgemini, etc. (mêmes noms que candidatures) ; ouvrir détail (candidatures + contacts) | | Backfill + fix ownership ; rafraîchir liste |
| **WEB-LOGIN-01** | Login backoffice : mauvais mdp → bandeau rouge FR, **sans** overlay Next.js rouge | | Ne doit plus afficher « Invalid email or password » en Console Error |
| **EMU-LIVE-01** | `/backoffice/mobile-emulator` : device ADB + **Aperçu live** → écran téléphone en direct | | scrcpy PC reste le plus fluide |

---

## B2 — Navigation + FAB + admin

| Point | À faire | Décision (OK / KO + détail) | Notes |
|-------|---------|-----------------------------|-------|
| A.1–A.2c | Navigation retour | **OK** | déjà fait |
| B.3 | USER drawer sans Administration | **OK 22/07** | |
| B.4 | ADMIN impersonnaliser → hub | **OK 22/07** | |
| C.5 | Liste Relances sans crash | **OK 22/07** | crash setState corrigé APK 1.0.31 |
| **D.6** | FAB → Relance | | ◀ **à remplir** |
| D.7 | FAB → Appel | | |
| D.8 | FAB → Entretien | | |
| D.9 | FAB → Contact | | |
| E.10 | Re-tap Candidatures | | |
| E.11 | Contacts → FAB + | | |
| F.12 | Accueil double retour | | |

**OK global B2** (quand D→F OK) :

```text
OK Mobile — navigation retour, admin, relances, ajouts candidature
```

---

## B3 — SMTP OVH `@jobbingtrack.com`

| # | Action | Décision | Notes |
|---|--------|----------|-------|
| 1 | Upgrade MX Plan OVH | | ⏸ après B2 |
| 2 | Créer noreply@ + security@ | | |
| 3 | DKIM + DMARC | | |
| 4 | `.env` préprod/prod SMTP | | sans coller secrets |
| 5 | Smokes mail OK | | |

Réponse : `OK Étape3 SMTP jobbingtrack.com` ou `KO …`

---

## B4 — Agent email admin

| # | Action | Décision | Notes |
|---|--------|----------|-------|
| 1 | Activer agent (admin) | | ⏸ après B3 |
| 2 | Triage / boîte visible | | |

Réponse : `OK Étape4 Agent email admin` ou `KO …`

---

## B5 — Consentements RGPD `/agent`

| # | Action | Décision | Notes |
|---|--------|----------|-------|
| 1 | Sync mobile → web consentements | | ⏸ après B4 |

Réponse : `OK Étape5 Consentements RGPD` ou `KO …`
