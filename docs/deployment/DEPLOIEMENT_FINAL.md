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

La pipeline CI/CD est actuellement en échec :
- Le job « Validation structure BDD » échouait (EventType model vs enum).
- Le projet est en microservices (un Prisma par service) → à adapter.
- À remettre en place quand le reste est stabilisé.

## Pour l'instant

On se concentre sur les tests sur l'émulateur mobile dans l'interface backoffice. Le déploiement final sera fait quand l'application sera prête.
