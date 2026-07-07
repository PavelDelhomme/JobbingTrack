# Comprendre les versions — guide porteur

Ce document explique **pourquoi** on voit souvent `1.0.0+12` dans la doc Flutter générique, et **comment JobbingTrack** affiche **`1.0.12`** à la place.

---

## 1. Deux systèmes superposés

### A) Semver (Standard industrie)

Format : **`MAJEUR.MINEUR.PATCH`** — ex. **`1.0.0`**

| Segment | Signification | Exemple d’évolution |
|---------|---------------|---------------------|
| **1** (MAJEUR) | Grosse rupture | `1.x` → `2.0.0` refonte |
| **0** (MINEUR) | Nouvelles fonctions compatibles | `1.0.x` → `1.1.0` nouvel écran |
| **0** (PATCH) | Correctifs bugs | `1.0.0` → `1.0.1` fix crash |

**Idée** : le numéro raconte une **histoire produit**, pas le nombre de compilations.

### B) Numéro de build Android / Flutter

Format Flutter dans `pubspec.yaml` : **`1.0.0+12`**

Le **`+12`** après le `+` est le **build** (Android `versionCode`) :

- Entier **strictement croissant** (12, 13, 14…)
- Obligatoire pour le Play Store et l’OTA
- **Ne s’affiche pas** toujours à l’utilisateur dans les apps classiques

**Idée** : compter **chaque APK compilé**, même si le produit affiché reste « 1.0.0 ».

---

## 2. Pourquoi `1.0.0+12` et pas `1.0.12` en standard ?

En dev intensif, beaucoup d’équipes gardent **`1.0.0`** longtemps et font monter seulement le **`+12`** :

```text
1.0.0+10  →  1.0.0+11  →  1.0.0+12
   ↑              ↑              ↑
 même semver   même semver   même semver
 build monte   build monte   build monte
```

L’utilisateur voit **« Version 1.0.0 »** pendant des semaines — **aucune évolution visible** alors que vous avez compilé 12 fois.

**Ce n’est pas une erreur technique** : c’est une convention « on ne bump le patch semver que quand on publie un correctif nommé au store ».

---

## 3. Ce que JobbingTrack fait différemment

Vous avez demandé une version **visible** qui avance à chaque build, sans confondre avec un « vrai » patch semver store :

```text
1.0.10+10  →  1.0.11+11  →  1.0.12+12
     ↑              ↑              ↑
 3e chiffre =   3e chiffre =   3e chiffre =
 build 10       build 11       build 12
```

| Ce que vous voyez | Ce que ça veut dire |
|-------------------|---------------------|
| **Version 1.0.12** | Ligne produit actuelle (MAJEUR.MINEUR.BUILD) |
| **Build 12** (technique) | Identifiant Android — **identique au 12** en dev |
| **1.0.12+12** (pubspec) | Format complet pour Flutter |

### Les trois chiffres chez JobbingTrack

1. **Premier chiffre (1)** — version **majeure** : vous le montez rarement (refonte).
2. **Deuxième chiffre (0)** — version **mineure** : vous le montez quand vous décidez d’une « release fonctionnalités » (ex. passer à `1.1.x`).
3. **Troisième chiffre (12)** — **avance automatiquement** à chaque build APK en dev ; c’est le numéro que vous suiviez déjà en `+12`.

Le **mineur** ne bouge pas tant que vous ne le changez pas manuellement dans `pubspec.yaml` — exactement ce que vous vouliez.

---

## 4. Incrément automatique

Quand vous cliquez **« Lancer le build APK »** :

1. Le système lit `mobile/pubspec.yaml` (ex. `1.0.12+12`).
2. Il écrit **`1.0.13+13`** avant la compilation.
3. L’app, l’historique OTA et le backoffice affichent **1.0.13**.

Vous n’avez plus à vous demander pourquoi l’écran reste bloqué sur **1.0.0**.

---

## 5. Ancien historique (`1.0.0` + build 12)

Les releases déjà enregistrées avec version **`1.0.0`** et build **`12`** s’affichent désormais comme **`1.0.12`** (normalisation à la lecture). L’OTA continue de fonctionner : `1.0.12` > `1.0.0`.

---

## 6. Récap visuel

```text
                    STANDARD FLUTTER          JOBBINGTRACK
                    ─────────────────         ────────────
pubspec             1.0.0+12                  1.0.12+12
Utilisateur voit    Version 1.0.0             Version 1.0.12
Build technique     12 (souvent caché)        12 (= 3e chiffre)
Évolution visible   Non (semver figé)         Oui (auto à chaque build)
```

---

## 7. Où lire la suite

- Règles techniques : [`VERSIONNEMENT.md`](./VERSIONNEMENT.md)
- Backoffice OTA : `/backoffice/mobile/releases`
- Bump manuel : `node scripts/mobile/setup/bump-pubspec-version.js`
