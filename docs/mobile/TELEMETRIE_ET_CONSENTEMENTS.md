# Mobile — télémétrie et consentements

Dernière mise à jour : 17 juin 2026

## Deux périmètres différents

| Périmètre | Où | Stockage |
|-----------|-----|----------|
| Télémétrie anonyme (perf, trace, crashes) | Paramètres › Confidentialité | **Local** `SharedPreferences` |
| Agent email (`MAILBOX_ACCESS`, etc.) | Paramètres › Agent email ou `/agent` web | **Serveur** `user_agent_consents` |

Ne pas confondre : cocher la télémétrie mobile **ne grant pas** `MAILBOX_ACCESS` pour l’agent email.

## Comportement actuel (code)

### Inscription

- Case télémétrie cochée par défaut (`register_screen.dart`).
- Obligatoire pour créer un compte.
- Après register : `ApiConfigStore.enableTelemetryOnSignup()` met **consent + performances + trace** à `true`.

### Defaults prefs (`api_config_store.dart`)

| Clé | Default si absent |
|-----|-------------------|
| `telemetry_analytics_consent` | `false` |
| `telemetry_performance_enabled` | **`true`** |
| `telemetry_activity_trace_enabled` | **`true`** |

Conséquence : sans inscription récente, perf/trace peuvent apparaître activables alors que le consentement principal est off — l’UI masque les sous-toggles si `_consent` est false.

### Paramètres

- `_load()` lit les trois prefs sans les réinitialiser (fix 24/06).
- Désactiver « Partager des données anonymes » coupe perf + trace côté service.

## Dette / vérif porteur

- [ ] Compte test : désactiver les 3 toggles, kill app, rouvrir — état persisté ?
- [ ] Compte ancien (prefs vides) : que voit-on à l’écran ?
- [ ] Aligner defaults perf/trace sur `false` si consent absent (produit à décider).
- [ ] Agent email : enregistrer `MAILBOX_ACCESS` explicitement (voir [`../emails/AGENT_EMAIL_ETAT_ET_ROADMAP.md`](../emails/AGENT_EMAIL_ETAT_ET_ROADMAP.md) § dette consentements).

## Fichiers

- `mobile/lib/services/api_config_store.dart`
- `mobile/lib/services/mobile_analytics_service.dart`
- `mobile/lib/screens/jobbing/users/settings_screen.dart`
- `mobile/lib/screens/jobbing/auth/register_screen.dart`
