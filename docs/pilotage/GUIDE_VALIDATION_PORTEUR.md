# Guide validation porteur — JobbingTrack

Dernière mise à jour : **22 juillet 2026** (APK **1.0.31+31**)

## En une phrase

**Vous validez le produit** → ce guide + **`TODOS_A_VALIDER.md`**.  
**L’agent code** → `TODOS.md` (backlog) — **ne pas suivre pour valider**.

---

## ▶ VOUS ÊTES ICI

| | |
|---|---|
| **Phase** | B — Gate pré-prod mobile |
| **Étape** | **2 / 5** |
| **Sous-étape** | **D — FAB candidature** |
| **Point** | **D.6 Relance** (puis D.7 → D.8 → D.9 → E.10–11 → F.12) |
| **Registre** | [`TODOS_A_VALIDER.md`](TODOS_A_VALIDER.md) § **Étape 2 · D** |
| **Pas ici** | P1A / P1B / P1C backoffice (reportés) |

```
B1  Inscription + email          ✅ OK (25/06)
B2  Navigation + FAB             ▶ D.6 Relance
    A Navigation ✅ · B Admin ✅ · C Relances ✅
    D FAB ▶ · E Shell ⏸ · F Double retour ⏸
B3  SMTP @jobbingtrack.com       ⏸
B4  Agent email admin            ⏸
B5  Consentements RGPD           ⏸
```

---

## Où regarder

| Fichier | Rôle | Vous… |
|---------|------|-------|
| **Ce guide** | Checklist Samsung | Exécuter A→F |
| [`TODOS_A_VALIDER.md`](TODOS_A_VALIDER.md) | Registre OK/KO | Répondre `OK Étape2-D6…` puis OK global |
| [`TODOS_A_VERIFIER.md`](TODOS_A_VERIFIER.md) | Preuves agent | Lecture seule |
| [`TODOS_DONE.md`](TODOS_DONE.md) | Archives | — |
| [`TODOS.md`](TODOS.md) | Backlog agent | **Ne pas** valider ici |
| [`PILOTAGE.md`](PILOTAGE.md) | Phases A→E | Vue d’ensemble |

**Versions (22/07)** : pubspec / APK / téléphone → **1.0.31+31**.

---

## Étape 2 / 5 — Checklist mobile (Samsung)

**Durée** : ~20–40 min. **APK** : 1.0.31+31.

### Avant

| # | Vérification |
|---|--------------|
| 1 | USB + stack up + `adb reverse tcp:5002 tcp:5002` |
| 2 | APK **1.0.31+31** installé |
| 3 | ~7 candidatures (sinon reset porteur) |
| 4 | Version en bas de l’écran Connexion |

### A — Navigation retour ✅

| Point | Action | OK si… | Statut |
|-------|--------|--------|--------|
| **A.1** | Profil → Paramètres → retour | Retour Profil | ✅ |
| **A.2** | Calendrier → Profil → retour | Retour Calendrier | ✅ |
| **A.2b** | Candidatures → Entreprises → retour ×2 | Liste puis Accueil | ✅ |
| **A.2c** | Accueil → drawer Entreprises → retour | Accueil | ✅ |

### B — USER / ADMIN ✅

| Point | Action | OK si… | Statut |
|-------|--------|--------|--------|
| **B.3** | TEST_USER → drawer | Pas Administration | ✅ 22/07 |
| **B.4** | ADMIN → impersonnaliser → Désimpersonnaliser | Hub admin | ✅ 22/07 |

### C — Relances ✅

| Point | Action | OK si… | Statut |
|-------|--------|--------|--------|
| **C.5** | Liste Relances | Pas de crash | ✅ 22/07 |

### D — FAB candidature ▶ **à faire**

| Point | Action | Réponse |
|-------|--------|---------|
| **D.6** | FAB → Relance | `OK Étape2-D6 FAB Relance` |
| **D.7** | FAB → Appel | `OK Étape2-D7 FAB Appel` |
| **D.8** | FAB → Entretien | `OK Étape2-D8 FAB Entretien` |
| **D.9** | FAB → Contact | `OK Étape2-D9 FAB Contact` |

### E — Shell ⏸

| Point | Action | Réponse |
|-------|--------|---------|
| **E.10** | Re-tap Candidatures | `OK Étape2-E10 re-tap` |
| **E.11** | Contacts → FAB + | `OK Étape2-E11 FAB contact` |

### F — Double retour ⏸

| Point | Action | Réponse |
|-------|--------|---------|
| **F.12** | Accueil → double retour | `OK Étape2-F12 double retour` |

### Quand A→F sont OK

```text
OK Mobile — navigation retour, admin, relances, ajouts candidature
```

---

## Backoffice — releases OTA (parallèle, déjà OK 10/07)

URL : `https://jobbingtrack.localhost:5443/backoffice/mobile/releases`  
Détail : [`OTA_RELEASES_BACKOFFICE.md`](../mobile/OTA_RELEASES_BACKOFFICE.md)

### Wizard (rappel)

| Étape | Action |
|-------|--------|
| 1 Build APK | Lancer / Rebuild |
| 2 Appareil ADB | Install / Réinstaller |
| 3 Publish dev | Optionnel si USB suffit |
| 4 OTA Samsung | Dialog MAJ si version < canal |
| 5 Promote prod | **Pas** en dev quotidien |

---

## Déploiement VPS (Phase C, parallèle)

[`../production/PORTEUR_ACTIONS_DEPLOIEMENT.md`](../production/PORTEUR_ACTIONS_DEPLOIEMENT.md)

---

## Après Étape 2

| Étape | Sujet |
|-------|-------|
| **3** | SMTP OVH `@jobbingtrack.com` |
| **4** | Agent email — activation admin |
| **5** | Consentements RGPD `/agent` |

Détail : [`TODOS_A_VALIDER.md`](TODOS_A_VALIDER.md) § Étapes 3–5.
