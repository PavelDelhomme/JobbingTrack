# JobbingTrack - Statut du projet

**Dernière mise à jour** : **15 septembre 2026**

## ▶ Où on en est

| | |
|---|---|
| **Phase** | Tri structure repo + file validation mobile |
| **Point** | **DOCS-TRIAGE-01** — inventaire tampon architecture |
| **Branche** | `docs/architecture-triage-inventory` (depuis `feat/mobile-metier-ops-v1055`) |
| **APK** | `1.0.55+55` |
| **UI suivi** | `/backoffice/pilotage` · source vive : [`pilotage/PILOTAGE.md`](pilotage/PILOTAGE.md) |
| **Tampon** | [`pilotage/triage-temp/README.md`](pilotage/triage-temp/README.md) |

## Correctifs 11/09 (MOB-UX-PERF-01)

- Stop remount sous-onglets Entreprises/Contacts/Appels · TTL listes 3 min
- Calendrier cache-first · sync « À jour — rien à synchroniser »
- Dark défaut + toggle 🌙 · build APK `--flavor dev`
- Commit `e9b01550` poussé sur `feat/mobile-metier-ops-v1055`

## Correctifs 06/09 (session suite métier)

- **CallProvider** + TTL empty-list (entretiens / notifs / appels / calendrier)
- **FAB** Relance / Appel / Entretien sur hub + écrans listes + calendrier
- **Contact** : menu Ajouter lié → relance / entretien / appel avec contact prérempli
- **Entretien** : contacts/appels filtrés par IDs liés ; removeLocal après corbeille
- **Calendrier** : tap → détail entretien/relance ; FAB planifier
- **FollowUpProvider** : `_inFlight` ; load par `applicationId` ne vide plus le cache global

## Correctifs 06/09 (session OTA / refresh)

- **Refresh listes vides** : TTL même sans données
- **OTA catch-up** : ≥5 builds → insist ; multi-canaux
- **Création candidature** : labels FR, lieux Nominatim, statut + auto/manuel

## Process de suivi

1. **`pilotage/TODOS.md`** — à faire  
2. **`pilotage/TODOS_A_TESTER.md`** — tests  
3. **OK** → `TODOS_DONE.md` · **KO** → retour `TODOS.md`  
4. Branches : [`development/BRANCHES.md`](development/BRANCHES.md)

## Docs mobiles de référence

- [`mobile/APPLICATION_MOBILE_A_FAIRE.md`](mobile/APPLICATION_MOBILE_A_FAIRE.md)
- [`mobile/VERSIONNEMENT.md`](mobile/VERSIONNEMENT.md)
- [`mobile/OTA_RELEASES_BACKOFFICE.md`](mobile/OTA_RELEASES_BACKOFFICE.md)
- [`mobile/PROCHAINES_ETAPES.md`](mobile/PROCHAINES_ETAPES.md)

---

> Historique long conservé ci-dessous (ne pas suivre à la place de TODOS « En cours »).
