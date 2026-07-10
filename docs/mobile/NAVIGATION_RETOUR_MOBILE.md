# Navigation retour — app mobile JobbingTrack

Dernière mise à jour : 10 juillet 2026

Document de référence pour la validation porteur (étape 2) et les évolutions UI.  
Implémentation : `MainShellScreen`, `DrawerBackScope`, `ApplicationsScreen`.

**Correctif 10/07** : un seul `PopScope` sur `MainShellScreen` — les `DrawerBackScope` n'interceptent plus le retour système (évite double pas : Calendrier→Profil→Accueil en un geste).

---

## Principes

1. **Une seule gestion du retour shell** — `PopScope` sur `MainShellScreen` uniquement (drawer fermé → `Navigator.pop` → logique onglets).
2. **Onglets invisibles (IndexedStack)** — `DrawerBackScope(active: false)` enregistre seulement le scaffold (pas de second PopScope).
3. **Écrans empilés (détail)** — le retour système fait `Navigator.pop()` vers la liste ou l’écran précédent.
4. **Pas de fermeture forcée** au premier retour sur Accueil — snackbar puis 2e retour → arrière-plan Android.

---

## Barre basse (4 onglets shell)

| Onglet | Index |
|--------|-------|
| Accueil | 0 |
| Candidatures | 1 |
| Calendrier | 2 |
| Profil | 3 |

---

## Hub Candidatures (6 sous-onglets)

| Sous-onglet | Index |
|-------------|-------|
| Candidatures (liste principale) | 0 |
| Entreprises | 1 |
| Contacts | 2 |
| Entretiens | 3 |
| Relances | 4 |
| Appels | 5 |

---

## Matrice retour système (shell)

| Situation | Retour attendu |
|-----------|----------------|
| Drawer cross-tab avec `returnTabOnBack` (ex. Accueil → drawer Entreprises) | Retour direct vers **onglet d’origine** (ex. Accueil) |
| Sous-onglet Candidatures **> 0** (navigation interne, sans `returnTabOnBack`) | Liste **Candidatures** (sous-onglet 0) |
| Sous-onglet **0** + barre basse Candidatures | **Accueil** (checklist A2b — pas l’onglet mémorisé dans la pile) |
| Barre basse **Calendrier** ↔ **Profil** (sans pile) | Retour vers **onglet barre basse précédent** (pile `_bottomNavBackStack`) |
| Barre basse **Calendrier** ou **Profil** seul (sans switch récent) | **Accueil** |
| **Accueil** (drawer fermé, pile vide) | 1er retour : snackbar « Appuyez à nouveau… » ; 2e retour (< 2 s) : **arrière-plan** |
| Drawer ouvert (n’importe quel onglet) | Ferme le drawer |
| Drawer global → hub (ex. Profil → drawer Entreprises) avec `returnTabOnBack` | 1er retour : sous-onglet 0 ; 2e retour : **Profil** |
| Onglet **Calendrier** | Drawer **Calendrier** (affichage Planning/Liste uniquement) — pas le drawer global ; navigation Profil via **barre basse** |

---

## Matrice retour système (écrans empilés)

| Situation | Retour attendu |
|-----------|----------------|
| Liste → **détail** candidature / entreprise / contact / relance / entretien / appel | Retour à la **liste** d’où on vient |
| Détail candidature → lien vers détail contact / relance / … | Retour au **détail candidature**, puis à la liste |
| Profil → **Paramètres** | Retour **Profil** |
| Recherche globale, hub admin, formulaires poussés sur la pile | Retour écran **précédent** (`Navigator.pop`) |

---

## Parcours porteur — checklist rapide

| # | Parcours | OK si |
|---|----------|-------|
| A | Candidatures → Entreprises → retour | Liste **Candidatures** (pas Accueil, **pas** fermeture app) |
| B | Liste Candidatures → retour | **Accueil** |
| C | Accueil → retour × 2 | Snackbar puis arrière-plan |
| D | Calendrier → drawer Entreprises → retour | **Calendrier** |
| E | Candidatures → ouvrir une candidature → retour | Liste Candidatures |
| F | Détail relance sans contact | Pas de lien Contact vide |

---

## Hors scope immédiat (backlog prod)

| ID | Sujet |
|----|--------|
| **BL-26-25** | AppBar : action contextuelle (Planning / Liste calendrier) + **déplacer la cloche** notifications |
| **BL-26-09** | Warnings Kotlin Built-in / `pub outdated` avant Flutter majeur |
| Gate prod | **Re-validation biométrie** sur APK release (voir § Biométrie) |

---

## Biométrie — gate production

La biométrie est **validée porteur 19/06** (`TODOS_DONE.md`). Avant production :

1. Rejouer sur **APK release** (pas seulement debug + bypass smokes).
2. Vérifier : login + cold start + après déconnexion + fallback mot de passe.
3. Désactiver `test_automation_skip_biometric` en build release.

Référence : `TODOS_A_VALIDER.md` ligne biométrie · `A_VALIDER_AVANT_PRODUCTION.md` § mobile.

---

## Calendrier — drawer ☰

Menu ☰ sur l’écran Calendrier ouvre le **drawer calendrier** (pas le drawer app global) :

- **Affichage** : radio Planning / Liste
- **Types à afficher** : switches Entretiens, Relances, Événements, Intérim

Persistance : `ApiConfigStore`. Backlog UX AppBar : **BL-26-25**.
