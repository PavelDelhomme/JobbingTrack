# TODOs à tester (résultats de tests)

> Ancien nom : `TODOS_A_VERIFIER.md` (stub de redirection).  
> **Rôle** : pour chaque item de [`TODOS.md`](TODOS.md) en cours, noter les **tests** faits, le résultat, et la suite.

## Process

1. Item ouvert dans `TODOS.md` → tests ici.  
2. **OK concluant** → archiver dans [`TODOS_DONE.md`](TODOS_DONE.md) + retirer de ce fichier + cocher/avancer dans `TODOS.md`.  
3. **KO** → remettre / créer l’action corrective dans `TODOS.md` (prochaines actions).

---

## En cours — Phase B / B2

### B2-D.6 FAB Relance (prochain test porteur)

| Test | Attendu | Résultat | Suite |
|------|---------|----------|-------|
| APK ≥ 1.0.31 | Version bas écran Connexion | | |
| Candidature → FAB → Relance → Créer | Snackbar + Voir détail | | |
| Pas de FlutterError setState | Pas de crash email / logs | | |

### Crash Flutter setState (historique 22/07, APK 1.0.29)

| Élément | Statut | Détail |
|---------|--------|--------|
| Cause `ShellTabRegistry.setCurrentTab` pendant build | **Corrigé code** | post-frame notify ; APK **1.0.31** |
| Re-test porteur après install 1.0.31 | **À faire** avec C.5 / D.6 | Confirmer absence nouveau crash dans `/backoffice/mobile/logs` |
| Popup détail crash (clic extérieur) | **Corrigé agent 22/07** | `AnalyticsRecordDetailDialog` : backdrop + Escape |

### Popup `/backoffice/mobile/logs`

| Test | Attendu | Résultat |
|------|---------|----------|
| Clic ligne crash → popup | Détail visible | |
| Clic **hors** popup | Ferme | **fix agent** — à re-vérifier |
| Escape | Ferme | **fix agent** — à re-vérifier |
| Bouton Fermer | Ferme | |

### Mémoire multi-onglets backoffice (diagnostic)

| Test | Attendu | Résultat |
|------|---------|----------|
| Baseline 1 onglet Synthèse | Noter RAM/CPU navigateur + conteneur `frontend` | **À diagnostiquer** |
| Ouvrir 4–6 pages backoffice | Mesurer delta RAM/CPU/réseau | |
| Onglet au 1er plan vs arrière-plan | Polling / fetch seulement si visible ? | |

---

## Récents OK (résumé — détail dans DONE)

- B2-A/B/C (navigation, admin, relances) — porteur 22/07  
- Shell setState fix — agent 22/07  
- Axes Y % Synthèse absurdes — agent 22/07  

Historique technique long : conserver les preuves dans Git / `TODOS_DONE.md` ; ne pas ré-empiler ici.
