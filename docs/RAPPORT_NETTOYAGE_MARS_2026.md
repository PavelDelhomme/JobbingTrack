# Rapport de nettoyage – Mars 2026

**Date** : mars 2026  
**Objectif** : Supprimer doublons et documentation obsolète, clarifier l’architecture (services, monitoring, scripts).

---

## 1. Documentation supprimée

### docs/development/
- **Supprimé** : `diagnostic/` (4 fichiers), `recap/` (2 fichiers), `setup/README.md`, `testing/README.md`, `workflow/README.md`
- **Supprimé** : `FINAL_IMPLEMENTATION_SUMMARY.md`, `GUIDE_TESTS_PARCOURS.md`, `RESUME_NETTOYAGE.md`
- **Conservé** : `makefile/README.md`, `makefile-commands/README.md` (utiles pour les commandes Make)

### docs/monitoring/
- **Conservé** : `metrics-flow.md` (référence flux métriques), `README.md` (mis à jour, pointe vers metrics-flow), `MONITORING_COMMANDS.md`, `QUICK_START_MONITORING.md`
- **Supprimé** : doublons et obsolètes (README-MONITORING, QUICK-START-MONITORING, diagnostic-metrics-report, SYSTEME_STATISTIQUES_APPLICATIVES, MIGRATION-GUIDE, INTEGRATION_MONITORING_RESUME, AMELIORATIONS_CHARGEMENT_METRIQUES, CORRECTION_COHERENCE_METRIQUES, FICHIERS_MONITORING, INDEX, GUIDE_TENDANCES_METRIQUES, GUIDE_MONITORING_SERVICES, MONITORING-STATUS, INTEGRATION, STATISTIQUES_PROJET)

### docs/performance/
- **Conservé** : tous les fichiers (README, rapports, FIXES, etc.) — pas de suppression, uniquement référence dans STATUS si besoin.

### docs/user-journey/
- **Supprimé** : `LIRE_MOI_URGENT.md`, `QUICK_FIX.md`, `RESUME_FINAL.md`, `TOKEN_TEST_PERMANENT.md`, `SOLUTION_ERREUR_403.md`, `RESOUDRE_TOKEN_INVALIDE.md` (sessions anciennes, correctifs déjà intégrés)
- **Conservé** : `README.md`, `GUIDE_COMPLET.md`, `PARCOURS_METIER.md`

### docs/troubleshooting/
- **Supprimé** : `CORRECTIONS_FINALES_SESSION.md`, `CORRECTIONS_ANALYTICS_DASHBOARD.md`, `CORRECTIONS_ERREURS_404_TIMEOUTS.md`, `CORRECTIONS_GRAPHIQUES_ANALYTICS.md` (rapports de session obsolètes)
- **Conservé** : `README.md`, `POSTGRES_MONITORING.md`, `TROUBLESHOOTING_LOGIN.md`

### docs/todo/
- **Supprimé** : `CORRECTIONS_EN_COURS.md`, `TODO_CORRECTIONS.md`
- **Conservé** : `README.md`, `TODO_PERFORMANCE.md`

---

## 2. Sécurité à la racine / security-service

- **Ancien dossier** : `security-service/` à la **racine** du projet contenait uniquement `FIREWALL_PLAN.md`.
- **Action** : contenu déplacé vers `docs/security/FIREWALL_PLAN.md`, dossier racine `security-service/` supprimé.
- **Service réel** : le service utilisé par Docker et l’API est **`backend/security-service`** (Node.js). Il est bien référencé dans `docker-compose.yml` (`context: ./backend/security-service`). Aucun code à la racine n’était utilisé.

---

## 3. Auth-service et services critiques en Go ?

- **Constat** : il n’y a **aucun fichier Go** dans le projet (`*.go`, `go.mod`). Tous les services backend (auth-service, application-service, company-service, security-service, etc.) sont en **Node.js** (JavaScript/Express, Prisma).
- **Conclusion** : la migration vers Go n’a pas été faite ; le projet est entièrement Node.js côté backend. Si une migration Go est souhaitée, elle serait à planifier (auth-service, api-gateway, etc.) comme évolution future.

---

## 4. statistics.py et endpoints “statistics”

- **Références dans la doc** : les anciens fichiers `docs/monitoring/SYSTEME_STATISTIQUES_APPLICATIVES.md` et `docs/troubleshooting/CORRECTIONS_FINALES_SESSION.md` décrivaient une architecture avec des services **Python** et des fichiers `statistics.py` / `app_statistics.py`.
- **Réalité du projet** : il n’y a **pas de services Python** dans le dépôt. Les statistiques sont gérées par :
  - **dashboard-service** (Node.js) : `statistics.controller.js`, `statistics.routes.js`
  - **metrics-aggregator** (Node.js) pour les métriques système
- **Conclusion** : les `statistics.py` et `app_statistics.py` mentionnés dans la doc étaient soit un ancien design, soit une confusion avec un autre projet. La doc concernée a été supprimée ou mise à jour (monitoring). Aucun script ou service Python “statistics” n’est utilisé dans le projet actuel.

---

## 5. Scripts (scripts/)

- **Utilisés par le Makefile / la CI** : `run-all-tests-with-reports.sh`, `test-api-specific.sh`, `compress-old-reports.sh`, `timed-make.sh`, scripts dans `scripts/db/`, etc.
- **Aucune suppression effectuée** dans `scripts/` pour éviter de casser des cibles Make ou des usages externes. Les scripts potentiellement peu utilisés (ex. `translate-french-to-english.sh`, `git-interactive-checkout.sh`, `diagnostic-prisma.sh`) restent présents ; un audit ciblé peut être fait plus tard si besoin.

---

## 6. Résumé des fichiers supprimés (hors dossiers vides)

| Zone | Fichiers / dossiers supprimés |
|------|-------------------------------|
| docs/development | 12 fichiers (diagnostic, recap, setup, testing, workflow, 3 .md) |
| docs/monitoring | 16 fichiers (doublons, rapports obsolètes, doc Python) |
| docs/user-journey | 6 fichiers (anciens correctifs / résumés de session) |
| docs/troubleshooting | 4 fichiers (CORRECTIONS_*) |
| docs/todo | 2 fichiers |
| Racine | security-service/ (1 fichier déplacé vers docs/security, dossier supprimé) |

---

## 7. Références mises à jour

- **docs/monitoring/README.md** : pointe vers `metrics-flow.md` comme référence principale du flux métriques.
- **docs/tests/TESTS_END.md** : référence au Firewall mise à jour vers `docs/security/FIREWALL_PLAN.md`.
- **docs/security/FIREWALL_PLAN.md** : ajouté (contenu ex-`security-service/FIREWALL_PLAN.md`) avec mention que le service utilisé est `backend/security-service`.

---

## 8. Suite recommandée

- **STATUS.md** : section « Documentation et nettoyage » mise à jour (voir STATUS.md).
- **RESOLUTIONS.md** : entrée ajoutée pour ce nettoyage (voir RESOLUTIONS.md).
- **Services en Go** : si migration souhaitée, la traiter comme une évolution planifiée (auth-service, api-gateway, etc.) et la documenter dans le backlog.
- **Scripts** : en cas de nettoyage supplémentaire, vérifier chaque script avec `make` et les scripts CI avant suppression.
