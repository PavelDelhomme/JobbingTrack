# TODOs à valider par le porteur

Dernière mise à jour : 21 mai 2026

## Règle

Ce fichier bloque la suite produit. Tant qu’une ligne **bloquante** est ouverte ici, l’agent ne doit pas avancer vers une nouvelle fonctionnalité hors correction de cette validation, mise à jour du pilotage, ou préparation de preuve.

Quand une ligne est validée par le porteur, la déplacer vers `TODOS_DONE.md` avec la date, l’environnement et la preuve.

## À valider maintenant

| Priorité | Validation porteur | Environnement | Preuve attendue | Statut | Retour porteur |
|----------|--------------------|---------------|-----------------|--------|----------------|
| P0 | Accès HTTPS local complet | local | `https://jobbingtrack.localhost:5443/login` fonctionne, login admin OK, `/b4ck0ff1ce` accessible sans boucle 401/403. | [ ] | |
| P0 | Backoffice sécurité utilisable | local | Parcourir Sécurité, Menaces, Logs, Firewall ; pas d’erreur bloquante, titres/libellés compréhensibles. | [ ] | |
| P0 | Rapports sécurité visibles dans le backoffice | local/preprod | `/backoffice/test-reports` affiche la catégorie Sécurité, ouverture et téléchargement d’un rapport OK. | [ ] | |
| P0 | Menaces historiques/lab comprises avant nettoyage | local | Confirmer que `10.0.0.x`, `198.51.100.42`, `172.19.x/172.20.x` sont à classer lab/bruit avant toute purge. | [ ] | Ne rien supprimer sans validation explicite. |
| P1 | Archive logs sécurité sans purge | local | Export JSONL gzip + `manifest.json` lisibles ; aucune suppression BDD. | [ ] | |
| P1 | Restauration logs sécurité en staging | local | `security_logs_restore_staging` alimentée ; aucune écriture dans `security_logs`. | [ ] | |
| P1 | Mode sombre persistant après refresh | local | Choisir sombre, rafraîchir login/backoffice, le thème reste sombre. | [ ] | |
| P1 | Popup paramètres fermeture | local | Clic extérieur et `Escape` ferment la mini-fenêtre sans perte de clic interne. | [ ] | |
| P1 | Statistics sécurité/logs/app-data à l’écran | local | Pages chargent après login, chiffres cohérents, pas de doublon trompeur entre Sécurité et Statistics. | [ ] | |
| P1 | Graphes conteneurs multi-séries lisibles | local | Mode “Tous les conteneurs” : couleurs distinctes et stables CPU/mémoire. | [ ] | |

## À ne pas valider ici

- Préprod/prod réelle : utiliser `A_VALIDER_AVANT_PRODUCTION.md`.
- Déploiement serveur : utiliser `DEPLOIEMENT_PRODUCTION.md`.
- Validation production réelle : utiliser `VALIDATION_PRODUCTION.md`.
- Tâche technique non livrée : rester dans `docs/TODOS.md`.
