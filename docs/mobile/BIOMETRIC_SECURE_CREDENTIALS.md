# Déverrouillage biométrique — stockage sécurisé des identifiants (backlog)

**Statut** : cadrage produit / technique — **pas encore implémenté** (juin 2026).  
**Priorité** : Lot D mobile, après stabilisation des parcours courants.  
**Validation** : smoke E2E appareil réel + revue sécurité avant prod.

---

## État actuel (MVP)

Ce qui existe aujourd’hui dans l’app Flutter :

| Élément | Comportement actuel |
|--------|---------------------|
| Session | JWT + profil utilisateur dans `SharedPreferences` (`ApiConfigStore`) |
| « Garder la connexion » | Persiste ou non le JWT au cold start |
| Biométrie (`local_auth`) | **Barrière UI** au lancement si activée — déverrouille l’accès à la session déjà stockée |
| Mot de passe | **Non** stocké de façon chiffrée sur l’appareil |

Limitation : la biométrie ne remplace pas une saisie sécurisée des identifiants ; elle protège seulement l’ouverture d’une session JWT déjà en mémoire locale (niveau de sécurité inférieur à une banque / gestionnaire de mots de passe).

---

## Cible produit (à implémenter)

L’utilisateur doit pouvoir **activer ou désactiver** le déverrouillage biométrique **quand il veut** (écran Connexion et/ou Paramètres).

### Parcours cible

1. L’utilisateur saisit **email + mot de passe** et se connecte avec succès (API `POST /auth/login`).
2. Il coche ou active **« Déverrouiller avec la biométrie »** (opt-in explicite, révocable).
3. L’application enregistre les identifiants **chiffrés** dans le stockage sécurisé de l’OS :
   - **Android** : Android Keystore + `EncryptedSharedPreferences` / `flutter_secure_storage`
   - **iOS** : Keychain (Secure Enclave quand disponible)
4. Au prochain lancement :
   - Écran biométrique (empreinte / Face ID / code appareil en secours OS) ;
   - Si OK → déchiffrement local → reconnexion automatique (login API ou refresh token selon politique session) ;
   - Si échec / annulation → retour écran Connexion classique (saisie manuelle).
5. **Déconnexion** ou désactivation dans Paramètres → **effacement** des secrets du secure storage + session JWT.

### Principes sécurité

- **Jamais** de mot de passe en clair dans `SharedPreferences`.
- Clé de chiffrement liée au matériel / Keychain ; biométrie = déverrouillage de cette clé, pas comparaison du mot de passe en local.
- Option : n’activer la biométrie qu’après une connexion réussie récente (fenêtre de confiance).
- Logout, changement de mot de passe côté serveur, `session_revoked` → purge secure storage.
- Événement mobile `biometric_enabled` / `biometric_disabled` (sans secrets) pour corrélation B9 si besoin.
- Documenter dans la politique confidentialité mobile (`docs/mobile/analytics/PRIVACY.md`).

---

## Implémentation technique prévue

| Composant | Rôle |
|-----------|------|
| `flutter_secure_storage` | Stockage email + mot de passe (ou refresh token) chiffré |
| `local_auth` | Authentification biométrique avant lecture du secure storage |
| `BiometricCredentialStore` (à créer) | API unique : `save`, `load`, `clear`, `isEnabled` |
| `AuthProvider` | Après login réussi + opt-in → `save` ; cold start → biométrie → `load` → login API |
| Paramètres | Toggle « Déverrouillage biométrique » indépendant de la télémétrie |
| Logout | `clear()` systématique |

Alternatives à trancher à l’implémentation :

- Stocker **refresh token** plutôt que mot de passe (si l’API expose un refresh long-lived sécurisé) — préférable si disponible.
- Sinon stockage mot de passe chiffré avec rotation si l’utilisateur change son mot de passe sur le web.

---

## Tests à prévoir (quand le chantier démarrera)

| Type | Contenu |
|------|---------|
| Unitaire | Mock `flutter_secure_storage` : save/load/clear, pas de fuite en SharedPreferences |
| Intégration | Login → activer bio → kill app → biométrie simulée → accueil sans resaisie |
| E2E ADB | Scénario dédié (appareil avec empreinte enregistrée) ; skip CI si pas d’appareil |
| Sécurité | Vérifier purge après logout ; pas de secrets dans logs / crash reports |

**Aucun test automatisé** pour ce flux aujourd’hui — normal tant que la cible n’est pas codée.

---

## Commandes Make (futures)

Quand les smokes existeront :

- `make mobile-biometric-smoke` — parcours activation + déverrouillage (à créer)
- S’appuyer sur `make run-mobile` pour installer l’APK sur appareil USB

---

## Liens

- Backlog : `docs/TODOS.md` — **D6 — Biométrie + identifiants chiffrés**
- Code actuel : `mobile/lib/services/biometric_auth_service.dart`, `mobile/lib/services/api_config_store.dart`, `mobile/lib/screens/jobbing/auth/biometric_unlock_screen.dart`
- Pilotage : `TODOS_A_VALIDER.md` — ligne validation porteur à ouvrir **uniquement** quand l’implémentation secure storage sera livrée
