# TODOs à valider par le porteur

Dernière mise à jour : 21 mai 2026

## Règle

Ce fichier bloque la suite produit. Tant qu’une ligne **bloquante** est ouverte ici, l’agent ne doit pas avancer vers une nouvelle fonctionnalité.

Règle d’ordre : l’agent et le porteur traitent **la première ligne ouverte uniquement**. Pas de validation suivante, pas de préparation parallèle, pas de “suite” tant que cette ligne n’est pas validée explicitement ou transformée en problème à corriger.

Quand une ligne est validée par le porteur, la déplacer vers `TODOS_DONE.md` avec la date, l’environnement et la preuve.

## Priorités (échelle)

| Niveau | Sens |
|--------|------|
| **P0** | Bloquant produit local : sécurité, rapports, menaces, HTTPS — à valider avant le reste. |
| **P1A** | Données / sécurité / opérations sensibles : archives, restauration, alertes, actions avant purge. |
| **P1B** | Observabilité métier : Statistics, logs, corrélation, chiffres cohérents. |
| **P1C** | UX backoffice : thème, popup, graphes, navigation, lisibilité. |
| **P1D** | Gate de fin de journée / avant gros merge : suite complète et lecture rapports. |
| **P2** | Utile mais non bloquant pour la file courte ; peut attendre la fin des P0/P1 ou aller dans `docs/BACKLOG.md` si reporté. |

## Comment valider

Le porteur valide la première ligne ouverte soit en répondant dans le chat avec `OK` ou `KO` + détail, soit en renseignant la colonne `Retour porteur` de cette même ligne. La colonne `Preuve attendue` décrit exactement ce qui doit être vérifié avant de répondre.

L’agent ne coche pas à la place du porteur : après un `OK` explicite, il archive la ligne dans `TODOS_DONE.md` ; après un `KO`, il corrige ou crée la tâche de correction avant toute suite.

## À valider maintenant (ordre strict — une ligne à la fois)

| Priorité | Validation porteur | Environnement | Preuve attendue | Statut | Retour porteur |
|----------|--------------------|---------------|-----------------|--------|----------------|
| P0 | Comparaison de rapports sécurité (CVE) | local | Sur `/b4ck0ff1ce/test-reports`, mode comparaison : sélectionner **2** rapports catégorie **Sécurité** (ex. `security-results-cve-20260521-201336` + un autre CVE), lancer la comparaison → **pas** d’erreur « Rapport non trouvé » ; cartes Critical/High/Medium/Low/Info par rapport ; tableau par surface avec statut et écarts ; notes/payloads bruts non exposés dans la comparaison. | [ ] | **KO 21/05** : comparaison trop pauvre / 0 partout. Correctif agent appliqué : parsing `summary.md`, synthèse sévérités et affichage dédié sécurité. À revalider visuellement. |
| P0 | Menaces historiques/lab comprises avant nettoyage | local | Confirmer que `10.0.0.x`, `198.51.100.42`, `172.19.x/172.20.x` sont à classer lab/bruit avant toute purge. Page Menaces : lecture seule, **aucune suppression** sans `OK` explicite. | [ ] | Ne rien supprimer sans validation explicite. |
| P0 | Rapports sécurité — ouverture et téléchargement (régression) | local | Liste catégorie Sécurité, ouverture HTML d’un `summary.md` CVE, téléchargement OK (complément après validation rendu CVE). | [ ] | Rendu CVE validé 21/05 ; garder en file si régression constatée. |
| P1A | Archive logs sécurité sans purge | local | Export JSONL gzip + `manifest.json` lisibles ; aucune suppression BDD. | [ ] | |
| P1A | Restauration logs sécurité en staging | local | `security_logs_restore_staging` alimentée ; aucune écriture dans `security_logs`. | [ ] | |
| P1A | Alertes email sécurité (MailHog / SMTP) | local | Déclencher une alerte `critical/high` test ; email visible MailHog ou SMTP configuré ; pas d’`AUTH PLAIN` vide. | [ ] | |
| P1B | Corrélation performances — KPI logs après login | local | `/b4ck0ff1ce/performances/correlation` : KPI logs / ERROR-WARN ≠ 0 sur un service focal (central logging 15/15). | [ ] | |
| P1B | Statistics — onglet Sécurité cohérent avec `/security` | local | `/b4ck0ff1ce/statistics/security` : chiffres ≠ écran vide trompeur ; pas de doublon contradictoire avec `/b4ck0ff1ce/security`. | [ ] | |
| P1B | Statistics — onglet Logs (`log-stats`) | local | Filtres service/niveau, sources actives/historiques, compteurs cohérents avec `/persistence/stats`. | [ ] | Partiellement validé 20/05 — reconfirmer après recreate. |
| P1B | Statistics — onglet Données applicatives (`app-data`) | local | Totaux, timeline, états vides « Non renseigné », pas de `undefined` brut. | [ ] | |
| P1B | Statistics — graphes disponibilité / erreur (vue d’ensemble) | local | Onglet Vue d’ensemble : courbes chargent, légende source visible, plage 24h↔7j OK. | [ ] | Technique 21/05 OK — validation navigateur porteur. |
| P1C | Mode sombre persistant après refresh | local | Choisir sombre, rafraîchir login/backoffice, le thème reste sombre. | [ ] | |
| P1C | Popup paramètres fermeture | local | Clic extérieur et `Escape` ferment la mini-fenêtre sans perte de clic interne. | [ ] | |
| P1C | Graphes conteneurs multi-séries lisibles | local | Performances → Conteneurs, mode « Tous les conteneurs » : couleurs distinctes et stables CPU/mémoire. | [ ] | |
| P1C | Performances — plages temporelles sans flash vide | local | Synthèse / Réseau / Disque / Conteneurs / Latence : changement 24h→7j→personnalisé sans écran vide ni Network Error. | [ ] | Playwright 21/05 OK — reconfirmer si besoin. |
| P1C | Performances — première navigation depuis hub | local | Clic `/b4ck0ff1ce` → Performances : délai acceptable, graphes présents (dette ~6s notée). | [ ] | |
| P1C | Sécurité — titres FR et navigation | local | Parcours Politiques, Menaces, Firewall, Logs, Analyse, Réseau : titres navigateur FR, sous-nav cohérente. | [ ] | Playwright 8/8 — validation visuelle porteur. |
| P1C | Comparaison rapports tests agrégés (non sécurité) | local | Comparer 2 rapports `tests/results` même catégorie (ex. Tests API) : succès, tableau par test. | [ ] | |
| P2 | Mode clair backoffice — lisibilité page par page | local | Si une page est illisible en clair, noter la route exacte (ne bloque plus le lot global). | [ ] | Acceptation provisoire 21/05. |
| P2 | Performances — Disque stockage BDD | local | Page Disque : cartes + Block I/O ; validation données réelles. | [ ] | |
| P2 | Préférences refresh par graphique | local | Vérifier héritage zone globale vs override local (si UI exposée). | [ ] | |
| P2 | Mobile — source officielle | décision | Choisir `mobile/` vs `flutter-mobile-app/` avant archivage doublon. | [ ] | |

## Gate technique fin de journée / avant push majeur

À lancer **en fin de journée**, **avant un push complet sur `dev`** ou **avant une PR importante**. Exception acceptée le 21/05 : ne pas lancer cette campagne pendant la correction P0/P1 pour éviter de perdre du temps ; garder les tests ciblés par changement, puis faire la campagne complète quand la session de corrections est stabilisée.

| Étape | Commande / cible (référence) | Preuve attendue |
|-------|------------------------------|-----------------|
| 1. Stack + BDD | Cible Make documentée **`test-full-quick`** (= `up-full` + `db-push-all` + `seed-auth` + `status`) **ou** équivalent manuel si la stack tourne déjà | `make status` / conteneurs `jobbingtrack-*` healthy ; pas d’erreur `db-push-all` |
| 2. Suite complète | **`bash scripts/run-all-tests-with-reports.sh`** avec `TEST_NOPROMPT=1` et variables hôte (voir bloc ci-dessous) | Sortie script **code 0** ; dossier `tests/results/<horodatage>/` créé |
| 3. Lecture détaillée | Ouvrir `tests/results/<horodatage>/summary.json`, `report.html`, `report.txt` **et** `/b4ck0ff1ce/test-reports` | **0 échec bloquant** ; comprendre chaque ligne en échec avant de pousser |
| 4. Frontend rapide (complément) | Depuis `frontend/` : `npm run type-check` + `npm run lint` | Pas de nouvelle erreur introduite par le lot |

Bloc recommandé (équivalent validé le 13/05 — voir `docs/TODOS.md`) :

```bash
TEST_NOPROMPT=1 \
API_URL=http://127.0.0.1:5002 \
API_GATEWAY_URL=http://127.0.0.1:5002 \
PLAYWRIGHT_BASE_URL=http://localhost:5003 \
PLAYWRIGHT_FRONTEND_MODE=smoke \
PLAYWRIGHT_MOBILE_MODE=smoke \
PERF_LIGHT=1 \
bash scripts/run-all-tests-with-reports.sh
```

**Sans stack Docker** : des centaines d’échecs sont **normaux** (`ECONNREFUSED`, conteneurs absents) — voir `docs/ERRORS.md` et `docs/STATUS.md` § 11/04/2026. Ne pas interpréter comme régression si Postgres/gateway/front ne tournent pas.

**Durée** : ~10–20 min (smoke). Campagne Playwright **full** : variable `PLAYWRIGHT_FRONTEND_MODE=full` (plus long, hors agrégat par défaut).

**Checklist longue** : `docs/tests/TESTS_END.md` (tous les points manuels en fin de projet).

| Priorité | Validation porteur | Environnement | Preuve attendue | Statut | Retour porteur |
|----------|--------------------|---------------|-----------------|--------|----------------|
| P1D | Gate suite complète tests fin de journée / avant push majeur | local | Dernière campagne `run-all-tests-with-reports.sh` **verte** (exit 0) + rapport lu dans `tests/results/<horodatage>/` ; noter date/heure dans retour porteur. | [ ] | Dernière campagne complète : **à relancer en fin de journée**, pas pendant le P0 courant. |

## File technique liée (pas de validation ici)

Les chantiers non encore prêts pour validation porteur restent dans `docs/TODOS.md` (env strictes, pentest, PQC, purge menaces après OK P0, etc.).

## À ne pas valider ici

- Préprod/prod réelle : utiliser `A_VALIDER_AVANT_PRODUCTION.md`.
- Déploiement serveur : utiliser `DEPLOIEMENT_PRODUCTION.md`.
- Validation production réelle : utiliser `VALIDATION_PRODUCTION.md`.
- Tâche technique non livrée : rester dans `docs/TODOS.md`.
