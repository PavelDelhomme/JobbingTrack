# Releases OTA mobile — backoffice et CLI

Guide porteur pour **build**, **installation**, **publication dev**, **OTA Samsung** et **promotion production**.

> **Chemin recommandé** : backoffice `/backoffice/mobile/releases` (pas besoin de ligne de commande).  
> La CLI reste disponible pour scripts, CI ou dépannage.

Voir aussi : [VERSIONNEMENT.md](./VERSIONNEMENT.md), [ANDROID_TOOLCHAIN.md](./ANDROID_TOOLCHAIN.md) (BL-26-09 Kotlin).

## Règle développement (porteur + agent)

| Situation | Build APK | Publish canal dev | Promote prod |
|-----------|-----------|-------------------|--------------|
| Travail **backend / frontend / API** sans changement mobile | **Non** | **Non** | **Non** |
| Changement **code mobile** (Flutter) à tester sur Samsung | Oui (`Build APK` ou install USB) | **Seulement** quand la feature est prête pour test OTA | **Jamais** en dev quotidien |
| Validation porteur OK + gate préprod | Oui | Oui (dev puis prod si décision porteur) | Sur demande explicite |

- **Pas de bump `pubspec.yaml`** sans build mobile (le bump est automatique à l’étape 1 Build APK).
- **Publish dev ≠ merge `dev`** : copie APK vers le serveur OTA local, pas une release produit.
- En développement courant : **install USB** (étape 2 backoffice) suffit ; l’OTA (étape 4) valide le flux complet avant prod.

---

## Les 3 versions à ne pas confondre

| Source | Exemple | Signification |
|--------|---------|----------------|
| **APK buildé (étape 1)** | `v1.0.15+15` | Dernier compile sur la machine (fichier `app-debug.apk`) |
| **Téléphone (étape 2)** | `v1.0.13 (13)` | Version **installée** sur l’appareil (USB ou OTA précédente) |
| **Canal dev OTA (étape 3)** | `v1.0.14+14` | Version **servie** par l’API aux apps canal dev |

Ce sont **trois étapes distinctes**. Un build réussi n’active pas automatiquement l’OTA : il faut **Publier sur canal dev** (étape 3).  
L’installation USB (étape 2) met à jour le téléphone **sans** passer par l’OTA.

Le panneau backoffice affiche un bloc **« Alignement des versions »** pour comparer ces trois valeurs.

---

## Parcours backoffice (étapes 1 → 5)

### Prérequis

- Stack Docker locale up (`api-gateway`, `frontend`, contrôleur émulateur).
- Samsung branché en USB, débogage autorisé, **« Toujours autoriser »** coché.
- Backoffice : `/backoffice/mobile/releases`.

### Étape 1 — Build APK

1. Cliquer **Lancer le build APK** (1–3 min).
2. Le script incrémente automatiquement `mobile/pubspec.yaml` (`bump-pubspec` → ex. `1.0.15+15`).
3. APK produit : `mobile/build/app/outputs/flutter-apk/app-debug.apk`.

**Warnings Kotlin (BL-26-09)** : non bloquants tant que l’APK est produit. À traiter avant une **maj Flutter majeure**, pas avant la fin de l’étape 2 mobile. Voir [ANDROID_TOOLCHAIN.md](./ANDROID_TOOLCHAIN.md).

### Étape 2 — Install (ADB)

1. Sélectionner l’appareil (ex. `SM-G990B2`).
2. **Installer sur l’appareil** (adb reverse + `adb install`).
3. Vérifier que la version affichée correspond à l’APK buildé (étape 1).

Si le téléphone reste sur une ancienne version : relancer l’installation ou désinstaller l’app puis réinstaller.

### Étape 3 — Publish canal dev

1. Cliquer **Publier sur canal dev** (copie serveur, pas d’upload 171 Mo).
2. Le canal dev actif doit alors correspondre à l’APK buildé (ex. `v1.0.15+15`).

**Erreur « APK debug introuvable sur le serveur »** : montage Docker vide → recreate `api-gateway` :

```bash
docker compose up -d api-gateway --force-recreate
```

Ou script tout-en-un :

```bash
bash scripts/mobile/publish-built-dev.sh --notes "Ma release"
```

### Étape 4 — OTA Samsung

1. Ouvrir JobbingTrack sur le téléphone (canal dev).
2. L’app propose la MAJ vers la version publiée (étape 3).
3. Si rien : force-stop + relance, ou vérifier réseau / `adb reverse`.

L’OTA ne se déclenche que si **version canal dev > version installée**.

### Étape 5 — Promote production

Après validation OTA dev : **Promouvoir dev → production**.  
Optionnel : tag GitHub `mobile-v*` si `MOBILE_GITHUB_RELEASES_ENABLED=true`.

---

## Équivalents CLI (optionnel)

| Action backoffice | Commande |
|-------------------|----------|
| Build + install USB | `make reinstall-app` (depuis la racine) |
| Build seul | `bash scripts/mobile/setup/build-apk-debug.sh` |
| Publish dev | `bash scripts/mobile/publish-built-dev.sh --notes "…"` |
| Install ADB seul | `bash scripts/mobile/setup/reinstall-apk-adb.sh` |

Variables utiles :

- `SKIP_VERSION_BUMP=1` — build sans incrément pubspec.
- `API_GATEWAY_PORT` — port gateway (défaut 5002).

---

## Dépannage rapide

| Symptôme | Cause probable | Action |
|----------|----------------|--------|
| Étape 3 « Publication dev OK » mais canal dev ancien | Publish pas refait après un nouveau build | Republier ; vérifier « Alignement des versions » |
| Téléphone en 1.0.13, APK en 1.0.15 | Install USB pas refait ou OTA pas encore passée | Réinstaller (étape 2) ou OTA (étape 4) |
| Publish échoue APK introuvable | Mount `./mobile/build/...` vide dans gateway | `docker compose up -d api-gateway --force-recreate` |
| Build déjà publié sur dev | Même buildNumber que canal actif | Relancer Build APK (auto +1) |
| Warning plugins KGP | Dette BL-26-09 | Documenter ; pas bloquant OTA court terme |

---

## Validation porteur

Réponse attendue après parcours complet :

```text
OK Mobile releases OTA backoffice
```

Registre : `docs/pilotage/TODOS_A_VALIDER.md` ligne releases OTA (~416).
