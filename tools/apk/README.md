# APK sideload (émulateur sans Play Store)

Dossier optionnel pour installer des apps sans Google Play.

## BlueMail

Package Play Store : `me.bluemail.mail`

1. **Recommandé** : migrer l’AVD vers une image **Google Play** :
   ```bash
   bash scripts/mobile/setup-android-emulator.sh migrate-playstore
   ```
2. **Sinon** : déposer l’APK ici puis :
   ```bash
   MOBILE_ADB_DEVICE=emulator-5554 node scripts/mobile/install-emulator-bluemail.js
   ```

Noms de fichier reconnus : `me.bluemail.mail.apk`, `bluemail.apk`, `com.bluemail.mail.apk`

Variable optionnelle : `BLUEMAIL_APK_PATH=/chemin/vers/app.apk`
