# Centre de notifications mobile

Dernière mise à jour : 19 juin 2026

## Rôle produit

La cloche (AppBar) affiche **uniquement les notifications métier** liées au parcours candidature :

- candidatures (mise à jour, changement de statut, échéance)
- relances (`FOLLOWUP_DUE`)
- entretiens (`INTERVIEW_SCHEDULED`, rappels `REMINDER`)
- appels et rappels push enregistrés côté serveur

**Exclus** du centre utilisateur (y compris compte admin sur mobile) :

- `CRASH_REPORT`, `ERROR_REPORT`, `SYSTEM`
- retours techniques / diagnostics

Ces éléments restent côté backoffice (emails, analytics, endpoint crash dédié).

## API

| Endpoint | Comportement |
|----------|--------------|
| `GET /api/v1/notifications?scope=in_app` | **Défaut** — filtre métier |
| `GET /api/v1/notifications?scope=all` | Toutes les notifs utilisateur (ops) |
| `PUT /api/v1/notifications/mark-all-read?scope=in_app` | Marque lues — métier seulement |
| `DELETE /api/v1/notifications/:id` | Suppression par l'utilisateur |

Types inclus : `REMINDER`, `APPLICATION_UPDATE`, `INTERVIEW_SCHEDULED`, `FOLLOWUP_DUE`, `DEADLINE`, `STATUS_CHANGE`

Source : `backend/notification-service/src/constants/inAppNotificationTypes.js`

## UI mobile

| Fichier | Rôle |
|---------|------|
| `mobile/lib/widgets/mobile_notification_center.dart` | Cloche + bottom sheet |
| `mobile/lib/providers/notification_provider.dart` | Chargement / marquer lu / supprimer |
| `mobile/lib/utils/notification_navigation.dart` | Navigation au tap |
| `mobile/lib/utils/in_app_notification_types.dart` | Filtre client (secours) |

Comportement :

- **Icône cloche** toujours visible
- **Badge** seulement si `unreadCount > 0`
- **Tap** : marque lu si besoin → ferme la sheet → ouvre l'écran lié (`entityType` + `entityId`)
- **Supprimer** : swipe gauche ou bouton ✕

## Smokes

```bash
node scripts/mobile/smoke-notifications-in-app-scope-api.js
node scripts/mobile/smoke-mobile-notification-nav-adb.js
```

Inclus dans `scripts/mobile/smoke-run-mobile-validation.js`.

## Validation porteur

`TODOS_A_VALIDER.md` ligne **321**.
