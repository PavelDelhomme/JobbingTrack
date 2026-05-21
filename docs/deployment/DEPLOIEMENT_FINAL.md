# Déploiement final (à faire en dernier)

**Objectif** : déployer l'application mobile et la partie API + backoffice sur le serveur, en déclenchant le déploiement depuis l'interface backoffice, sans webhook Portainer payant.

## À prévoir

- **Déploiement depuis le backoffice** : bouton « Déployer » dans l'interface admin.
- **Serveur** : images Docker Hub, pull + run via scripts SSH déclenchés par le backoffice ou par une CI.
- **Pipeline / CI** : scripts build → push Docker Hub → déploiement via SSH.
- **Application mobile** :
  - Build Android : APK et AAB (App Bundle), modes internal / beta / prod.
  - Suivi : branche, commit, statut build, logs de déploiement, version.
- **CI** : envisager GitLab en plus de GitHub pour pipelines gratuites si besoin.

## CI/CD Pipeline (GitHub Actions)

Le déploiement automatisé complet reste à finaliser, mais le gate sécurité GitHub Actions est déjà exploitable via `.github/workflows/security-audit.yml`.

Avant de pousser ou déployer des images prod :

1. Ouvrir **GitHub → Actions → Security Audit → Run workflow**.
2. Sélectionner la branche à publier.
3. Mettre `scan_prod_images` à `true`.
4. Vérifier que le job **Trivy prod image scan** construit `docker-compose.prod.yml`, scanne toutes les images et publie l’artefact **`trivy-prod-image-reports`**.
5. Trier les `HIGH`/`CRITICAL` dans `docs/security/STATS.md` avant validation humaine de release.

Ce gate ne remplace pas le futur pipeline build → push registry → déploiement, mais il évite de publier une image prod sans rapport CVE image daté.

## Pour l'instant

On se concentre sur les tests sur l'émulateur mobile dans l'interface backoffice. Le déploiement final sera fait quand l'application sera prête.
