# 📊 Emplacements des Résultats de Tests - JobbingTrack

[← Retour Documentation Tests](../INDEX.md) | [📋 STATUS](../../STATUS.md)

---

## 📍 Où sont stockés les résultats des tests ?

### 🎯 Résumé Rapide

| Type de Test | Emplacement | Format |
|--------------|------------|--------|
| **Tests Playwright** | `frontend/playwright-report/` | HTML |
| **Tests Mobile** | `frontend/playwright-report-mobile/` | HTML |
| **Résultats JSON** | `frontend/test-results.json` | JSON |
| **Résultats JUnit** | `frontend/test-results.xml` | XML |
| **Tests User Journey** | Console uniquement (à améliorer) | Terminal |
| **Tests Relations** | Console uniquement (à améliorer) | Terminal |
| **Tests Enums** | Console uniquement (à améliorer) | Terminal |

---

## 📱 Tests Mobile (Playwright)

### Emplacements

1. **Rapport HTML** : `frontend/playwright-report-mobile/`
   ```bash
   # Ouvrir le rapport
   make test-mobile-report
   # ou
   cd frontend && npx playwright show-report playwright-report-mobile
   ```

2. **Résultats JSON** : Générés dans le conteneur Docker
   - Localisation dans conteneur : `/app/playwright-report-mobile/`
   - Copie locale possible via `scripts/show-mobile-report.sh`

### Commandes pour voir les résultats

```bash
# Voir le rapport HTML (ouvre sur port 5004)
make test-mobile-report

# Lister les rapports disponibles
ls -la frontend/playwright-report-mobile/

# Voir les résultats JSON (si copiés localement)
cat frontend/test-results-mobile.json
```

---

## 🧪 Tests Playwright (Frontend)

### Emplacements

1. **Rapport HTML** : `frontend/playwright-report/`
   ```bash
   cd frontend && npx playwright show-report
   ```

2. **Résultats JSON** : `frontend/test-results.json`
   ```bash
   cat frontend/test-results.json
   ```

3. **Résultats JUnit XML** : `frontend/test-results.xml`
   ```bash
   cat frontend/test-results.xml
   ```

### Structure des fichiers

```
frontend/
├── playwright-report/          # Rapport HTML interactif
│   ├── index.html              # Page principale
│   └── data/                   # Données du rapport
├── test-results.json           # Résultats au format JSON
└── test-results.xml            # Résultats au format JUnit XML
```

---

## 🚶 Tests User Journey

### Emplacement Actuel

**Console uniquement** - Les résultats sont affichés dans le terminal mais ne sont pas sauvegardés.

### Amélioration Suggérée

Créer un fichier de résultats :
- `tests/results/user-journey-YYYY-MM-DD-HH-MM-SS.json`
- `tests/results/user-journey-YYYY-MM-DD-HH-MM-SS.txt`

### Commande

```bash
make tests-user-journey
# Résultats affichés dans le terminal
```

---

## 🔗 Tests Relations (Many-to-Many)

### Emplacement Actuel

**Console uniquement** - Les résultats sont affichés dans le terminal mais ne sont pas sauvegardés.

### Amélioration Suggérée

Créer un fichier de résultats :
- `tests/results/relations-YYYY-MM-DD-HH-MM-SS.json`
- `tests/results/relations-YYYY-MM-DD-HH-MM-SS.txt`

### Commande

```bash
make test-relations
# Résultats affichés dans le terminal
```

---

## 🎨 Tests Enums

### Emplacement Actuel

**Console uniquement** - Les résultats sont affichés dans le terminal mais ne sont pas sauvegardés.

### Amélioration Suggérée

Créer un fichier de résultats :
- `tests/results/enums-YYYY-MM-DD-HH-MM-SS.json`
- `tests/results/enums-YYYY-MM-DD-HH-MM-SS.txt`

### Commande

```bash
make test-enums
# Résultats affichés dans le terminal
```

---

## 📧 Tests Email

### Emplacement Actuel

**Console uniquement** - Les résultats sont affichés dans le terminal.

### Logs dans la base de données

Les emails envoyés sont enregistrés dans la table `EmailLog` :

```bash
# Voir les logs d'emails
make test-email-logs

# Voir tous les logs
make test-email-logs-all

# Statistiques
make test-email-logs-stats
```

---

## 🎯 Test Complet (`make test-all` / `make test-all-quick`)

### ✅ IMPLÉMENTÉ - Système de Rapports Complet

**Rapports automatiques générés** dans `tests/results/TIMESTAMP/` :

- `user-journey.json` - Résultats du test User Journey
- `relations.json` - Résultats du test Relations
- `enums.json` - Résultats du test Enums
- `email.json` - Résultats du test Email (si disponible)
- `summary.json` - Résumé consolidé de tous les tests
- `report.html` - **Rapport HTML complet et interactif** ⭐

### Commande

```bash
# Exécuter tous les tests avec rapports
make test-all-quick

# Ou directement
bash scripts/run-all-tests-with-reports.sh
```

### Emplacement des Rapports

```
tests/results/
└── YYYYMMDD-HHMMSS/          # Timestamp de l'exécution
    ├── user-journey.json
    ├── relations.json
    ├── enums.json
    ├── email.json
    ├── summary.json
    └── report.html            # ⭐ Rapport HTML à ouvrir dans le navigateur
```

Le rapport HTML s'ouvre automatiquement dans votre navigateur après l'exécution !

---

## 📂 Structure Recommandée pour les Résultats

```
tests/
├── results/                    # Tous les résultats de tests
│   ├── user-journey/          # Résultats User Journey
│   ├── relations/              # Résultats Relations
│   ├── enums/                  # Résultats Enums
│   ├── email/                  # Résultats Email
│   └── test-all/               # Résultats complets
└── reports/                    # Rapports consolidés
    ├── daily/                  # Rapports quotidiens
    └── weekly/                 # Rapports hebdomadaires
```

---

## 🔍 Commandes Utiles

### Voir les rapports Playwright

```bash
# Rapport HTML mobile
make test-mobile-report

# Rapport HTML frontend
cd frontend && npx playwright show-report
```

### Lister les fichiers de résultats

```bash
# Tests Playwright
ls -la frontend/playwright-report*/
ls -la frontend/test-results.*

# Tests dans le conteneur Docker
docker exec jobbingtrack-frontend ls -la /app/playwright-report-mobile/
```

### Nettoyer les anciens rapports

```bash
# Nettoyer les rapports Playwright
rm -rf frontend/playwright-report*/
rm -f frontend/test-results.*

# Nettoyer les résultats de tests
rm -rf tests/results/*
```

---

## 💡 Améliorations Futures

1. ✅ **Sauvegarder les résultats User Journey** dans des fichiers JSON
2. ✅ **Sauvegarder les résultats Relations** dans des fichiers JSON
3. ✅ **Sauvegarder les résultats Enums** dans des fichiers JSON
4. ✅ **Créer un rapport consolidé** pour `test-all`
5. ✅ **Historique des tests** avec dates et heures
6. ✅ **Comparaison des résultats** entre différentes exécutions

---

## 📚 Références

- [Documentation Playwright](https://playwright.dev/docs/test-reporters)
- [Guide Tests User Journey](../user-journey/README.md)
- [STATUS.md](../../STATUS.md)

---

**Dernière mise à jour** : 2025-12-04

