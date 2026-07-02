# 📚 Index de Documentation - JobbingTrack

**Dernière mise à jour** : 2 juillet 2026

---

## 🗺️ Où trouver quoi (référence rapide)

| Thème | Emplacement |
|-------|-------------|
| **Pilotage immédiat** | **[pilotage/PILOTAGE.md](pilotage/PILOTAGE.md)** · **[pilotage/TODOS_A_VALIDER.md](pilotage/TODOS_A_VALIDER.md)** · **[pilotage/TODOS_A_VERIFIER.md](pilotage/TODOS_A_VERIFIER.md)** |
| **Actions porteur déploiement VPS** | **[production/PORTEUR_ACTIONS_DEPLOIEMENT.md](production/PORTEUR_ACTIONS_DEPLOIEMENT.md)** ← checklist exacte |
| **État courant du projet** | **[STATUS.md](STATUS.md)** — hub principal |
| **Chantier lots A–H** | **[project/PLAN.md](project/PLAN.md)** · **[pilotage/TODOS.md](pilotage/TODOS.md)** · **[security/STATS.md](security/STATS.md)** |
| **Préprod / production / release** | **[production/DEPLOIEMENT_PRODUCTION.md](production/DEPLOIEMENT_PRODUCTION.md)** · **[production/PORTAINER_STACK.md](production/PORTAINER_STACK.md)** · **[production/MOBILE_RELEASE_PIPELINE.md](production/MOBILE_RELEASE_PIPELINE.md)** · **[deploy/production/PREMIER_DEPLOIEMENT.md](../deploy/production/PREMIER_DEPLOIEMENT.md)** |
| **Audit / restructuration documentation** | **[operations/DOCUMENTATION_AUDIT_PLAN.md](operations/DOCUMENTATION_AUDIT_PLAN.md)** — périmètre complet demandé, règles de tri, ordre de fusion/déplacement, validation liens |
| **Configuration / ports** | [configuration/](configuration/) — CONFIGURATION_PORTS.md, PORTS.md |
| **Rapports performance, fixes & optimisations** | [performance/](performance/) — FINAL_PERFORMANCE_REPORT, RAPPORT_PERFORMANCE, FIXES_AND_OPTIMIZATIONS, etc. |
| **Flux métriques (metrics-flow)** | [monitoring/metrics-flow.md](monitoring/metrics-flow.md) |
| **Monitoring / migration Rust** | [monitoring/README.md](monitoring/README.md), [monitoring/metrics-flow.md](monitoring/metrics-flow.md), [../monitoring/MIGRATION_RUST.md](../monitoring/MIGRATION_RUST.md) |
| **Fonctionnalités métier** | [features/SUIVI_BOITES_INTÉRIM.md](features/SUIVI_BOITES_INTÉRIM.md) |
| **Status structure BDD** | [database/STATUS_STRUCTURE_BDD.md](database/STATUS_STRUCTURE_BDD.md) |
| **Parcours métier** | [user-journey/PARCOURS_METIER.md](user-journey/PARCOURS_METIER.md) |
| **Tracking utilisateur** | [mobile/analytics/TRACKING_UTILISATEUR.md](mobile/analytics/TRACKING_UTILISATEUR.md) |
| **Accès réseau local** | [getting-started/ACCES_RESEAU_LOCAL.md](getting-started/ACCES_RESEAU_LOCAL.md) |
| **Quick Start - Tests mobile** | [tests/QUICK_START_MOBILE_TESTS.md](tests/QUICK_START_MOBILE_TESTS.md) |
| **Optimisation perf. frontend** | [frontend/PERFORMANCE_OPTIMIZATION.md](frontend/PERFORMANCE_OPTIMIZATION.md) ; rapports : [performance/FRONTEND_REPORTS_SUMMARY.md](performance/FRONTEND_REPORTS_SUMMARY.md), [performance/FRONTEND_REPORTS_FINAL_ANALYSIS.md](performance/FRONTEND_REPORTS_FINAL_ANALYSIS.md) |

Pour **quoi faire maintenant** : **[STATUS.md](STATUS.md)** → **[pilotage/PILOTAGE.md](pilotage/PILOTAGE.md)** → **[pilotage/TODOS_A_VALIDER.md](pilotage/TODOS_A_VALIDER.md)**. Chantier structuré : **[project/PLAN.md](project/PLAN.md)**, **[pilotage/TODOS.md](pilotage/TODOS.md)**.

---

## 🎯 Par où commencer

### Ce qu’il reste à faire (priorité)
- **[pilotage/PILOTAGE.md](pilotage/PILOTAGE.md)** — source de vérité du flux.
- **[pilotage/TODOS_A_VALIDER.md](pilotage/TODOS_A_VALIDER.md)** — validations porteur à vider avant nouvelles features.
- **[STATUS.md](STATUS.md)** — **état courant**, priorités (hub principal)
- **[project/PLAN.md](project/PLAN.md)** / **[pilotage/TODOS.md](pilotage/TODOS.md)** / **[security/STATS.md](security/STATS.md)** — Lots A–H
- **[mobile/PROCHAINES_ETAPES.md](mobile/PROCHAINES_ETAPES.md)** — Étapes manuelles vérification email puis suite développement Flutter.

### Fichiers .md à la racine
La racine de `docs/` garde les **hubs** : `README.md`, **`STATUS.md`**, `INDEX.md`, `navigation.md`, plus des **redirects** (`PLAN.md`, `TODOS.md`, …). Pilotage : **`pilotage/`**. Vision projet : **`project/`**. Dépannage : **`troubleshooting/`**.

### Démarrer le projet
- **[getting-started/README.md](getting-started/README.md)** — Guide de démarrage
- **[getting-started/DEMARRAGE_RAPIDE.md](getting-started/DEMARRAGE_RAPIDE.md)** — Démarrage rapide
- **[user-journey/README.md](user-journey/README.md)** — Tests et parcours utilisateur

---

## 📂 Documentation par Catégorie

### 🧪 Tests & User Journey
**Dossier** : [user-journey/](user-journey/) | [tests/](tests/)

- **[README.md](user-journey/README.md)** - Index des tests user journey
- **[PARCOURS_METIER.md](user-journey/PARCOURS_METIER.md)** - Parcours métier
- **[GUIDE_COMPLET.md](user-journey/GUIDE_COMPLET.md)** - Guide détaillé
- **[QUICK_START_MOBILE_TESTS.md](tests/QUICK_START_MOBILE_TESTS.md)** - Démarrage rapide tests E2E mobile (Playwright)
- **[README.md](tests/README.md)** - Stratégie tests, commandes, structure make test

**Scripts** :
- `scripts/testing/verify-user-journey.sh` - Vérification automatique des endpoints
- `START_TESTS.sh` - Démarrage rapide des tests

---

### 🚀 Démarrage & Configuration
**Dossier** : [getting-started/](getting-started/) | [configuration/](configuration/)

- **[README.md](getting-started/README.md)** - Guide de démarrage
- **[QUICK_START_GUIDE.md](getting-started/QUICK_START_GUIDE.md)** - Guide de démarrage rapide
- **[DEMARRAGE_RAPIDE.md](getting-started/DEMARRAGE_RAPIDE.md)** - Démarrage rapide en français
- **[REDEMARRAGE.md](getting-started/REDEMARRAGE.md)** - Guide de redémarrage des services
- **[ACCES_RESEAU_LOCAL.md](getting-started/ACCES_RESEAU_LOCAL.md)** - Accès réseau local
- **[configuration/README.md](configuration/README.md)** - Ports et variables (CONFIGURATION_PORTS, PORTS)

---

### 💻 Développement
**Dossier** : [development/](development/)

- **[makefile/README.md](development/makefile/README.md)** - Guide Makefile et commandes

---

### 📡 API & Backend
**Dossier** : [api/](api/)

- **[README.md](api/README.md)** - Index API
- **[api-reference/README.md](api/api-reference/README.md)** - Référence API complète
- **[endpoints/README.md](api/endpoints/README.md)** - Liste des endpoints

**Services Principaux** :
- Auth Service - `backend/auth-service/`
- Application Service - `backend/application-service/`
- Dashboard Service - `backend/dashboard-service/`
- API Gateway - `backend/api-gateway/`

---

### 🔐 Sécurité
**Dossier** : [security/](security/)

- **[README.md](security/)** - Guide de sécurité
- **[STATS.md](security/STATS.md)** - CVE, Gitleaks, Trivy, supply-chain
- **[SECURITY_TESTING_MATRIX.md](security/SECURITY_TESTING_MATRIX.md)** - Matrice tests offensifs contrôlés
- **[SECURITY_LOGS_RETENTION.md](security/SECURITY_LOGS_RETENTION.md)** - Rétention/archive/restauration logs sécurité
- **[ACTIVATION_WAF.md](security/ACTIVATION_WAF.md)** - WAF gateway et trajectoire WAF edge
- **[SYSTEME_SECURITE_README.md](security/)** - Système de sécurité
- **[DEMARRAGE_SERVICES_SECURITE.md](security/)** - Démarrage des services de sécurité

---

### 📊 Monitoring & Métriques
**Dossier** : [monitoring/](monitoring/)

- **[README.md](monitoring/)** - Guide de monitoring
- **[metrics-flow.md](monitoring/metrics-flow.md)** - Flux des métriques (qui collecte quoi, ports)
- **[QUICK_START_MONITORING.md](monitoring/QUICK_START_MONITORING.md)** - Démarrage rapide monitoring
- **[MONITORING_GUIDE.md](monitoring/MONITORING_GUIDE.md)** - Guide monitoring
- **[MONITORING-GUIDE.md](monitoring/MONITORING-GUIDE.md)** - Guide historique / pièges monitoring
- **[MONITORING_COMMANDS.md](monitoring/MONITORING_COMMANDS.md)** - Commandes monitoring
- **[MIGRATION_RUST.md](../monitoring/MIGRATION_RUST.md)** - Migration Rust monitoring/log collector

---

### ⚡ Performance et rapports
**Dossier** : [performance/](performance/)

- **[README.md](performance/README.md)** - Guide performance
- **[FINAL_PERFORMANCE_REPORT.md](performance/FINAL_PERFORMANCE_REPORT.md)** - Rapport final performance
- **[RAPPORT_PERFORMANCE.md](performance/RAPPORT_PERFORMANCE.md)** - Rapport performance
- **[PERFORMANCE_OPTIMIZATIONS_SUMMARY.md](performance/PERFORMANCE_OPTIMIZATIONS_SUMMARY.md)** - Résumé optimisations
- **[FIXES_AND_OPTIMIZATIONS.md](performance/FIXES_AND_OPTIMIZATIONS.md)** - Correctifs et optimisations

---

### 👥 Administration
**Dossier** : [administration/](administration/)

- **[README.md](administration/)** - Guide d'administration
- **[GUIDE_GESTION_UTILISATEURS.md](administration/)** - Gestion des utilisateurs
- **[SUMMARY_USER_MANAGEMENT.md](administration/)** - Résumé gestion utilisateurs

---

### 🎨 Frontend
**Dossier** : [frontend/](frontend/)

- **[README.md](frontend/)** - Guide frontend
- **[PERFORMANCE_OPTIMIZATION.md](frontend/PERFORMANCE_OPTIMIZATION.md)** - Optimisation performance (mémoire, bundles, lazy load) ; rapports : FRONTEND_REPORTS_SUMMARY.md, FRONTEND_REPORTS_FINAL_ANALYSIS.md dans ce dossier
- **[GUIDE_PAGE_DETAIL_SERVICE.md](frontend/GUIDE_PAGE_DETAIL_SERVICE.md)** - Page de détail des services
- **[GUIDE_ENREGISTREMENT_AUTOMATIQUE.md](frontend/)** - Enregistrement automatique
- **[GUIDE_PREFERENCES_UTILISATEUR.md](frontend/)** - Préférences utilisateur

---

### 🗄️ Base de Données
**Dossier** : [database/](database/)

- **[README.md](database/)** - Guide base de données
- **[STATUS_STRUCTURE_BDD.md](database/STATUS_STRUCTURE_BDD.md)** - État / status structure BDD
- **[MIGRATIONS_ET_BASES.md](database/MIGRATIONS_ET_BASES.md)** - Migrations Prisma, base principale vs test
- **[architecture/database/README.md](database/architecture/database/)** - Architecture
- **[decisions/README.md](database/decisions/)** - Décisions d'architecture
- **[recap/README.md](database/recap/)** - Récapitulatif

---

### 🔧 Dépannage
**Dossier** : [troubleshooting/](troubleshooting/)

- **[README.md](troubleshooting/)** - Guide de dépannage
- **[CORRECTIONS_ERREURS_404_TIMEOUTS.md](troubleshooting/)** - Corrections 404 & timeouts
- **[CORRECTIONS_GRAPHIQUES_ANALYTICS.md](troubleshooting/)** - Corrections graphiques
- **[CORRECTIONS_ANALYTICS_DASHBOARD.md](troubleshooting/)** - Corrections dashboard analytics
- **[CORRECTIONS_FINALES_SESSION.md](troubleshooting/)** - Corrections session

---

### 📱 Mobile (Flutter)
**Dossier** : [mobile/](mobile/)

- **[PROCHAINES_ETAPES.md](mobile/PROCHAINES_ETAPES.md)** — À faire : vérification email (manuel) puis app Flutter
- **[APPLICATION_MOBILE_A_FAIRE.md](mobile/APPLICATION_MOBILE_A_FAIRE.md)** — Checklist écrans et fonctionnalités mobile
- **[analytics/README.md](mobile/analytics/)** - Analytics mobile
- **[analytics/TRACKING_UTILISATEUR.md](mobile/analytics/TRACKING_UTILISATEUR.md)** - Tracking utilisateur
- **[analytics/INTEGRATION.md](mobile/analytics/)** - Intégration
- **[analytics/PRIVACY.md](mobile/analytics/)** - Confidentialité
- **[analytics/DASHBOARD.md](mobile/analytics/)** - Dashboard mobile

---

### 🛠️ Scripts
**Dossier** : [scripts/](scripts/)

- **[README.md](scripts/)** - Documentation des scripts

**Scripts Principaux** :
- [`scripts/README.md`](../scripts/README.md) — index scripts (env, mobile, ops)
- [`scripts/legacy/README.md`](../scripts/legacy/README.md) — archives (fixes, campagnes ops)
- [`scripts/mobile/README.md`](../scripts/mobile/README.md) — smokes Samsung / ADB
- `scripts/testing/verify-user-journey.sh` - Vérification automatique

---

## 🔍 Par Cas d'Usage

### "Je veux tester les parcours utilisateur"
1. [user-journey/README.md](user-journey/) - Commencez ici
2. [tests/QUICK_START_MOBILE_TESTS.md](tests/QUICK_START_MOBILE_TESTS.md) - Tests mobiles / Playwright
3. [tests/COMMANDES_TESTS.md](tests/COMMANDES_TESTS.md) - Commandes de test

### "Je veux démarrer le projet"
1. [getting-started/QUICK_START_GUIDE.md](getting-started/QUICK_START_GUIDE.md)
2. [getting-started/DEMARRAGE_RAPIDE.md](getting-started/DEMARRAGE_RAPIDE.md)
3. `make up-full`

### "J'ai une erreur"
1. [troubleshooting/README.md](troubleshooting/) - Dépannage
2. [ERRORS.md](ERRORS.md) - Erreurs connues actives
3. `make logs-watch` - Voir les logs

### "Je veux comprendre l'architecture"
1. [api/README.md](api/) - API & Backend
2. [database/README.md](database/README.md) - Base de données
3. [security/README.md](security/) - Sécurité

### "Je veux monitorer le système"
1. [monitoring/QUICK_START_MONITORING.md](monitoring/QUICK_START_MONITORING.md)
2. [monitoring/metrics-flow.md](monitoring/metrics-flow.md)
3. [../monitoring/MIGRATION_RUST.md](../monitoring/MIGRATION_RUST.md)

---

## 📊 État de la Documentation

### ✅ Catégories Complètes
- 🧪 Tests & User Journey
- 🚀 Démarrage
- 🔐 Sécurité
- 📊 Monitoring
- 👥 Administration

### 🔄 En Amélioration Continue
- 💻 Développement
- 🗄️ Base de Données
- 📱 Mobile Analytics

---

## 🆘 Besoin d'Aide ?

### Commandes Rapides
```bash
# Démarrer tout
./START_TESTS.sh

# Vérifier les services
make status

# Voir les logs
make logs

# Redémarrer
make restart
```

### Documentation Essentielle
- **[STATUS.md](STATUS.md)** - À faire maintenant, état projet
- **[mobile/PROCHAINES_ETAPES.md](mobile/PROCHAINES_ETAPES.md)** - Mobile : vérif email + Flutter
- **[user-journey/README.md](user-journey/)** - Tests utilisateur
- **[troubleshooting/README.md](troubleshooting/)** - Dépannage

---

## 📝 Organisation des Fichiers

```
JobbingTrack/
├── README.md                      Présentation, démarrage
├── STATUS.md                      ⭐ À faire maintenant, état détaillé
├── ERRORS.md                      Erreurs connues
├── FONCTIONNALITES.md             Fonctionnalités complètes
├── RESOLUTIONS.md                 Correctifs appliqués
│
├── docs/
│   ├── INDEX.md                   📚 Ce fichier (index complet)
│   ├── INDEX_DOCUMENTATION.md     Index général
│   │
│   ├── user-journey/              🧪 Tests utilisateur + parcours métier
│   │   ├── README.md
│   │   ├── PARCOURS_METIER.md
│   │   ├── RESUME_FINAL.md
│   │   └── ...
│   │
│   ├── configuration/            🔌 Ports et variables
│   │   ├── README.md
│   │   ├── CONFIGURATION_PORTS.md
│   │   └── PORTS.md
│   ├── performance/               ⚡ Rapports performance, fixes & optimisations
│   ├── getting-started/           🚀 Démarrage (+ ACCES_RESEAU_LOCAL)
│   ├── development/               💻 Développement (makefile)
│   │   └── makefile/
│   ├── api/                       📡 API & Backend
│   ├── security/                  🔐 Sécurité
│   ├── monitoring/                📊 Monitoring
│   ├── administration/            👥 Administration
│   ├── frontend/                  🎨 Frontend
│   ├── database/                  🗄️ Base de données
│   ├── troubleshooting/           🔧 Dépannage
│   ├── mobile/                    📱 Mobile
│   └── scripts/                   🛠️ Scripts
│
└── scripts/
    ├── verify-user-journey.sh     Vérification tests
    └── monitoring/                Scripts monitoring
```

---

**Pour savoir quoi faire** : [STATUS.md](STATUS.md) (section « À faire maintenant »).

**✨ Documentation mise à jour mars 2026**

