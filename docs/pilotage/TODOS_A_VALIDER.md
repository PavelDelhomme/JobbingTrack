# TODOs à valider (phase active uniquement)

> **Process** : voir [`PILOTAGE.md`](PILOTAGE.md).  
> Tu remplis **uniquement** ce fichier pour la phase en cours. Pas d’autres phases ici.  
> **UI** : `/backoffice/pilotage` → onglet **Tableau de suivi** (OK/KO écrit ici automatiquement en dev/préprod).

**Phase active** : **C — Déploiement VPS** (**jobbingtrack.com**, style YTMusic)  
**Point exact** : **DEPLOY-GHA-01** — seul **En cours** Kanban  
**Guide** : [`DEPLOY.md`](../../DEPLOY.md) · checklist complète A→J dans [`TODOS.md`](TODOS.md)  
**Mobile** : MOB-HUB / MOB-LIST en pause · validation OTA = **Nothing Phone** · APK **1.0.42**

> **Kanban** : badge = **colonne**. Focus deploy avant reprise gate mobile B / hubs.

---

## Point exact — à cocher par le porteur

| # | ID / étape | À valider | Décision | Notes |
|---|------------|-----------|----------|-------|
| 1 | **A** local | Stack + MailHog 8125 + HTTPS `:5443` | **OK agent 28/08** | proxy remis |
| 2 | **B** DNS | `api` + `preprod` + `api-preprod` → `95.111.227.204` | **OK porteur 24/08** | dig OK |
| 3 | **C** env | `.env.preprod.generated` URLs `.com` | **PARTIEL** | fichiers présents — re-check avant Update |
| 4 | **D / DEPLOY-C1** | Stack Portainer `jobbingtrack-preprod` **tous** healthy | **PARTIEL** | démarrée ; services incomplets |
| 5 | **E / DEPLOY-C2** | NPM 2 hosts + LE | **KO 28/08** | `tlsv1 unrecognized name` — refaire hosts |
| 6 | **F** smoke | HTTPS health + login `admin@jobbingtrack.com` | | |
| 7 | **G** | GHCR public + Watchtower + `IMAGE_PULL_POLICY=always` | | |
| 8 | **H** | `admin-deploy-dev.sh` OK une fois | | |
| 9 | **I** | Stack + NPM **prod** (après F OK) | | ne pas anticiper |
| 10 | **J / DEPLOY-C3** | OTA canal `dev` sur **Nothing** puis promote | | détail = `DEPLOY.md` §15 |

**OK global phase C (préprod)** quand B→F cochés OK :

```text
OK Déploiement — préprod jobbingtrack.com (DNS + Portainer + NPM + login)
```

**OK global phase C (prod + mobile)** quand I + J OK :

```text
OK Déploiement — prod + OTA Nothing (dev → production)
```

---

## Suite logique (files — pas toutes en cours)

| # | ID | Colonne | À faire | Décision | Notes |
|---|----|---------|---------|----------|-------|
| 1 | **DEPLOY-GHA-01** | ▶ En cours | Checklist A→J (voir `TODOS.md`) | **PARTIEL agent** | scripts + doc OK ; ops porteur |
| 2 | **DEPLOY-C1→C3** | dans GHA-01 | D Portainer · E NPM · J OTA | | pas de 2e carte En cours |
| 3 | **DEPLOY-MAKE** | À tester | Cibles Make documentées (ne pas lancer make dans Cursor) | | scripts sous-jacents OK |
| 4 | **MOB-HUB-01** | À faire | Hubs détail + liens croisés | | **pause** — après F |
| 5 | **MOB-LIST-01** | À valider | Cartes listes métadonnées | **PARTIEL agent** | après HUB |
| 6 | **MOB-NAV-01** | À faire | Retours système depuis chaque détail | | après HUB |
| 7 | **MOB-SNACK-01** | À faire | Snacks auto-dismiss | | après NAV |
| 8 | **D.6** | À faire | FAB Relance | | après snacks |
| 9 | D.7→D.9 | Plus tard | FAB Appel / Entretien / Contact | | après D.6 |
| 10 | E.10→F.12 | Plus tard | Shell re-tap / FAB contacts / double retour | | après FAB |
| 11 | **APK-BUILD-01** | À valider | Rebuild sans Zip + install | **OK agent 04/08** | confirmer Nothing |
| 12 | **PILOTAGE-PERF** | À tester | Page pilotage trop lente | **PARTIEL 10/08** | après deploy |
| 13 | **AUDIT-QA-01** | Plus tard | Audit QA exhaustif | | après gate B |
| 14 | **BACKEND-CLEAN-01** | Plus tard | Mutualiser logger/email/utils microservices | | **après** deploy — voir note auth-service |

---

## Correctifs session (référence — hors focus)

| ID | À faire | Décision | Notes |
|----|---------|----------|-------|
| **MOB-ENT-01** | Hub entreprise Capgemini | **OK 29/07** | |
| **MOB-HUB-01** | Liens croisés fiches | | pause jusqu’à préprod |
| **APK-BUILD-01** | Rebuild APK 1.0.42 | **OK agent 04/08** | re-test Nothing |
| **WEB-LOGIN-01** | Login bandeau FR | **OK 22/07** | |
| **PILOTAGE-PERF** | Perf `/backoffice/pilotage` | **PARTIEL** | À tester après deploy |

---

## B2 — Navigation + FAB (pause — reprise après deploy)

| Point | À faire | Décision | Notes |
|-------|---------|----------|-------|
| A.1–A.2c | Navigation retour | **OK** | |
| B.3 | USER drawer sans Administration | **OK 22/07** | |
| B.4 | ADMIN impersonnaliser → hub | **OK 22/07** | |
| C.5 | Liste Relances sans crash | **OK 22/07** | |
| **D.6** | FAB → Relance | | reprise après MOB-HUB |
| D.7–D.9 / E–F | FAB + shell | | après D.6 |

---

## Note porteur — auth-service / backend (pas maintenant)

`backend/auth-service` est plus gros que application/contact/… parce qu’il porte **auth + e-mail (SMTP/Resend/templates) + agent IMAP/OAuth + digests + logging sécurité/central** — pas un CRUD mince.  
Les `logger.js` / `logger-filter.js` / `centralLogger.js` / `email*` sont liés à ce périmètre (et des copies depuis `backend/shared`).  
**BACKEND-CLEAN-01** = après deploy : package partagé, supprimer les doublons entre services. **Ne pas démarrer pendant DEPLOY-GHA-01.**

---

## B3 — SMTP OVH `@jobbingtrack.com` (⏸ après deploy / B2)

| # | Action | Décision | Notes |
|---|--------|----------|-------|
| 1 | Upgrade MX Plan OVH | | ⏸ |
| 2 | Créer noreply@ + security@ | | |
| 3 | DKIM + DMARC | | |
| 4 | `.env` préprod/prod SMTP | | sans coller secrets |
| 5 | Smokes mail OK | | |

Réponse : `OK Étape3 SMTP jobbingtrack.com` ou `KO …`

---

## B4 — Agent email admin (⏸ après B3)

| # | Action | Décision | Notes |
|---|--------|----------|-------|
| 1 | Activer agent (admin) | | ⏸ |
| 2 | Triage / boîte visible | | |

Réponse : `OK Étape4 Agent email admin` ou `KO …`

---

## B5 — Consentements RGPD `/agent` (⏸ après B4)

| # | Action | Décision | Notes |
|---|--------|----------|-------|
| 1 | Sync mobile → web consentements | | ⏸ |

Réponse : `OK Étape5 Consentements RGPD` ou `KO …`
