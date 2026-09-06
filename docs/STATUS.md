# JobbingTrack - Statut du projet

**Dernière mise à jour** : **6 septembre 2026**

## ▶ Où on en est

| | |
|---|---|
| **Phase** | Mobile — OTA + UX métier |
| **Point** | **MOB-METIER-OPS-01** — FAB Relance/Appel/Entretien + CallProvider + calendrier |
| **Branche** | `fix/mobile-application-create-ux` |
| **APK** | `1.0.55+55` (branche `feat/mobile-metier-ops-v1055`) |
| **UI suivi** | `/backoffice/pilotage` · source vive : [`pilotage/PILOTAGE.md`](pilotage/PILOTAGE.md) |

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
