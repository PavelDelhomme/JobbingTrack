# Reset données porteur — validation mobile étape 2

Dernière mise à jour : 2 juillet 2026

## Problème

Le compte **`admin@jobbingtrack.com`** (ou tout compte porteur) peut accumuler **centaines/milliers** de candidatures générées par tests, seeds et smokes — ce qui rend la validation mobile (étape 2 / 5) impraticable.

## Solution

Script unique : **`reset-porteur-validation-data.js`**

1. **Purge** toutes les entités métier du compte (candidatures, contacts, entreprises liées, relances, entretiens, appels, calendrier, notifications).
2. **Seed** un jeu **minimal et lisible** : **7 candidatures** (1 par entreprise) + **1 contact autonome**, couvrant tous les parcours à valider.

| Entreprise | Ce qu’on teste |
|------------|----------------|
| Capgemini | entretien + relance + appel avec contact |
| Orange | 2 relances + appel lié à relance |
| Thales | entretien seul |
| Atos | refusée sans suite |
| Sopra Steria | appel sans contact |
| Dassault | contact lié, pas d’appel |
| OVHcloud | 2 relances sans appel |
| Luc Petit (Capgemini) | contact autonome (sans nouvelle candidature) |

Le compte **reste admin** (backoffice web + hub mobile) ; seules les **données métier** sont remplacées.

## Prérequis connexion admin mobile

Le mot de passe `.env` (`ADMIN_PASSWORD`) **fonctionne côté API** — le problème mobile vient en général de :

1. **APK debug sans comptes embarqués** — `debug_test_accounts.generated.dart` est gitignoré ; sans rebuild, pas de bouton « Connexion ADMIN ».
2. **Saisie manuelle** — `ADMIN_PASSWORD` fait souvent **64 caractères** ; une erreur de copie → « Mot de passe incorrect ».
3. **Empreinte** — ancien mot de passe stocké avant changement `.env`.

```bash
node scripts/mobile/setup/sync-admin-mobile-login.js
bash scripts/mobile/setup/build-apk-debug.sh
adb install -r mobile/build/app/outputs/flutter-apk/app-debug.apk
```

Sur l’écran login : **Connexion ADMIN** (pas retaper le mot de passe à la main).

## Prérequis

- Stack Docker up (`jobbingtrack-postgres`, `jobbingtrack-api-gateway`).
- `.env` : `ADMIN_EMAIL` / `ADMIN_PASSWORD` (ou `TEST_ADMIN_*`) valides.

## Commandes

```bash
# 1. Voir le volume actuel (sans rien supprimer)
node scripts/mobile/reset-porteur-validation-data.js --dry-run

# 2. Reset complet (purge + seed + vérif API)
node scripts/mobile/reset-porteur-validation-data.js --confirm

# Compte TEST_USER à la place de l’admin
node scripts/mobile/reset-porteur-validation-data.js --confirm --account user

# Email explicite
node scripts/mobile/reset-porteur-validation-data.js --confirm --email admin@jobbingtrack.com
```

Après le reset : **déconnexion / reconnexion** sur l’app mobile Samsung avec `admin@jobbingtrack.com`.

## Parcours mobile à valider (étape 2)

Avec ce jeu, vous pouvez vérifier :

- **Candidatures** : 7 fiches distinctes, statuts variés
- **Contacts** : depuis candidature + onglet Contacts + Luc Petit autonome
- **Relances** : Orange (2), OVHcloud (2), Capgemini (1)
- **Appels** : avec contact (Capgemini, Orange), sans contact (Sopra)
- **Entretiens** : Capgemini, Thales
- **Calendrier** : ~17 événements agrégés (entretiens + relances)
- **FAB** : relance / appel / entretien / contact depuis détail candidature
- **Admin mobile** : hub inchangé (gestion utilisateurs)

Checklist porteur détaillée : `docs/pilotage/TODOS_A_VALIDER.md` § **Étape 2 — Ligne 320**.

## Fichiers techniques

| Fichier | Rôle |
|---------|------|
| `scripts/mobile/setup/reset-porteur-validation-data.js` | Orchestrateur |
| `scripts/mobile/lib/purge-user-business-data.js` | Purge SQL ciblée |
| `scripts/mobile/lib/interleaved-scenarios.js` | Définition des 8 scénarios |
| `scripts/mobile/lib/seed-realistic-api.js` | Seed via API gateway |

## Attention

- **`--confirm`** supprime définitivement les candidatures/relances/etc. du compte cible. Pas de rollback automatique.
- Ne pas lancer sur un compte prod partagé sans sauvegarde BDD.
- Les autres utilisateurs (`TEST_USER`, comptes `@jobbingtrack.test`) ne sont **pas** touchés.
