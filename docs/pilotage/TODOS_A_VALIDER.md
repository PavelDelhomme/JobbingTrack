# TODOs à valider (phase active uniquement)

> **Process** : voir [`PILOTAGE.md`](PILOTAGE.md).  
> Tu remplis **uniquement** ce fichier pour la phase en cours. Pas d’autres phases ici.  
> **UI** : `/backoffice/pilotage` → onglet **Tableau de suivi** (OK/KO écrit ici automatiquement en dev/préprod).

**Phase active** : **B — Gate pré-prod mobile**  
**Point exact** : **B2-D.6** — FAB → Relance (seul **En cours** Kanban)  
**Guide** : candidature → FAB Ajouter → Relance → Créer → snack + Voir détail  
**APK** : **≥ 1.0.46** · OTA/offline 1.0.45 livré (PR #27) · deploy C largement OK  

> **Kanban** : badge = **colonne**. Focus **D.6** ; DEPLOY-GHA-01 en **À valider** (reste maintenance / merge).

---

## Point exact — à cocher par le porteur

| # | ID / étape | À valider | Décision | Notes |
|---|------------|-----------|----------|-------|
| 1 | **D.6** | Candidature → FAB → Relance → Créer | | snack + Voir détail |
| 2 | **D.6** | Modifier (+ heure) + corbeille | | liste rafraîchie |
| 3 | **D.6** | Snack auto-dismiss | | pas collée |
| 4 | **APK** | Version ≥ 1.0.46 | | Nothing / Samsung / Blackview |

**OK global D.6** :

```text
OK B2-D.6 — FAB Relance (création + détail + snacks)
```

---

## Suite logique (files — pas toutes en cours)

| # | ID | Colonne | À faire | Décision | Notes |
|---|----|---------|---------|----------|-------|
| 1 | **D.6** | ▶ En cours | FAB Relance | | focus |
| 2 | **D.7→D.9** | À faire | FAB Appel / Entretien / Contact | | après D.6 |
| 3 | **MOB-HUB-01** | À faire | Hubs détail + liens croisés | | après FAB |
| 4 | **MOB-LIST-01** | À valider | Cartes listes métadonnées | **PARTIEL agent** | |
| 5 | **MOB-NAV-01** | À faire | Retours système depuis chaque détail | | après HUB |
| 6 | **MOB-SNACK-01** | À faire | Snacks auto-dismiss | | lié D.6 |
| 7 | **DEPLOY-GHA-01** | À valider | Fin phase C (maint off, merge) | **PARTIEL** | stacks + OTA OK |
| 8 | **APK-BUILD-01** | À valider | Rebuild sans Zip + install | **OK agent** | |
| 9 | E.10→F.12 | Plus tard | Shell re-tap / FAB contacts / double retour | | après FAB |
| 10 | **AUDIT-QA-01** | Plus tard | Audit QA exhaustif | | après gate B |

---

## Correctifs session (référence — hors focus)

| ID | À faire | Décision | Notes |
|----|---------|----------|-------|
| **MOB-ENT-01** | Hub entreprise Capgemini | **OK 29/07** | |
| **MOB-OTA-OFFLINE-01** | OTA in-app + hors-ligne | **Livré 1.0.45** | PR #27 |
| **WEB-LOGIN-01** | Login bandeau FR | **OK 22/07** | |

---

## B2 — Navigation + FAB

| Point | À faire | Décision | Notes |
|-------|---------|----------|-------|
| A.1–A.2c | Navigation retour | **OK** | |
| B.3 | USER drawer sans Administration | **OK 22/07** | |
| B.4 | ADMIN impersonnaliser → hub | **OK 22/07** | |
| C.5 | Liste Relances sans crash | **OK 22/07** | |
| **D.6** | FAB → Relance | | **◀ En cours** |
| D.7–D.9 / E–F | FAB + shell | | après D.6 |

---

## Note porteur — auth-service / backend (pas maintenant)

`backend/auth-service` est plus gros que application/contact/… parce qu’il porte **auth + e-mail (SMTP/Resend/templates) + agent IMAP/OAuth + digests + logging sécurité/central** — pas un CRUD mince.  
**BACKEND-CLEAN-01** = après gate B : package partagé. **Ne pas démarrer pendant D.6.**

---

## B3 — SMTP OVH `@jobbingtrack.com` (⏸ après B2)

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
