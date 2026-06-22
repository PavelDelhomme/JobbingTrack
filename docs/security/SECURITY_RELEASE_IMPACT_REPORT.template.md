# Rapport d’impact release & sécurité — modèle

> **Modèle vide** — à remplir avant préproduction / production.  
> Ne pas committer de secrets ni de données personnelles.

---

## Métadonnées

| Champ | Valeur |
|-------|--------|
| Version / tag cible | |
| Date | |
| Auteur | |
| Environnement cible | preprod / prod |
| Branche / commit | |
| Validateur porteur | |

## 1. Résumé exécutif

- **Décision proposée** : GO / NO-GO / GO sous conditions
- **Changements majeurs** (3 lignes max) :

## 2. Matrice plateformes

| Plateforme | Impact | Tests exécutés | Résultat | Notes |
|------------|--------|----------------|----------|-------|
| Android (physique) | | | | |
| Android (émulateur AVD) | | | | |
| iOS | | | | |
| Linux (dev) | | | | |
| Windows / WSL | | | | |
| Backoffice web | | | | |
| API / microservices | | | | |
| VPS Portainer + NPM | | | | |

## 3. Sécurité

| Contrôle | Statut | Preuve / lien |
|----------|--------|---------------|
| Scan secrets (`secrets-scan.sh`, ggshield) | | |
| Rapports sécurité P0/P1 | | |
| CVE images Docker (Trivy prod) | | |
| Tests offensifs lab | | |
| Audit logs / B7 migration | | |
| SMTP / auth / JWT prod | | |
| Exposition ports / WAF | | |

## 4. Données & BDD

| Élément | Statut | Notes |
|---------|--------|-------|
| Migrations Prisma revues | | |
| Backup testé | | |
| Rollback documenté | | |
| PII / RGPD | | |

## 5. Mobile spécifique

| Élément | Statut | Notes |
|---------|--------|-------|
| Smokes ADB / hub D8 | | |
| Build APK/IPA | | |
| Analytics session FK (`user_sessions`) | | |
| Compat API min Android | | |

## 6. Risques ouverts

| ID | Sévérité | Description | Mitigation | Owner |
|----|----------|-------------|------------|-------|
| | | | | |

## 7. Validation porteur (obligatoire)

- [ ] J’ai relu ce rapport et les preuves jointes.
- [ ] J’autorise le déploiement préprod / prod : **OUI / NON**
- Signature / date :

---

*Arborescence rapport archivée sous `reports/diagnostics/` ou artefact CI — hors secrets.*
