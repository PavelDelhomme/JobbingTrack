# TODOs validés par le porteur

Dernière mise à jour : 21 mai 2026

## Rôle

Ce fichier archive ce que le porteur a réellement validé. Les validations techniques automatiques restent dans `docs/STATUS.md`; les tâches techniques terminées restent dans `docs/TODOS.md` ou l’historique Git.

## Validé localement

| Date | Élément validé | Environnement | Preuve / remarque |
|------|----------------|---------------|-------------------|
| 21/05/2026 | Rapports sécurité visibles dans le backoffice (P0 pilotage) | local | Validation porteur : catégorie Sécurité sur `/b4ck0ff1ce/test-reports`, rapport `security-results-cve-20260521-201336` ouvert/téléchargé OK, rendu CVE HTML structuré validé. |
| 21/05/2026 | Backoffice sécurité utilisable (P0 pilotage) | local | Validation porteur : Sécurité, Menaces, Logs, Firewall parcourus ; modification IP règle OK, déblocage IP OK, garde-fous IP source OK. Revoir plus tard : enrichissement forensics menaces lab (`198.51.100.42`, `10.0.0.x`) — suivi dans `docs/TODOS.md`. |
| 21/05/2026 | Accès HTTPS local complet (P0 pilotage) | local | Validation porteur explicite : `https://jobbingtrack.localhost:5443/login` OK, login admin OK, `/b4ck0ff1ce` accessible sans boucle 401/403. |
| 19/05/2026 | Connexion admin avec `ADMIN_EMAIL` / `ADMIN_PASSWORD` | local | Login OK puis accès `/b4ck0ff1ce`. |
| 19/05/2026 | Page `/login` sans identifiants de test visibles | local | Pas de `password123` ni compte de test affiché. |
| 19/05/2026 | WAF bloque payloads externes dangereux | local HTTPS | Payloads XSS/SQLi bornés → `403 WAF_BLOCKED`. |
| 19/05/2026 | WAF ne bypass pas un navigateur via `X-Forwarded-*` | local HTTPS | Trafic proxy externe inspecté sauf secret interne valide. |
| 19/05/2026 | Intrusion/rate-limit ne bannit pas durablement les IP privées en dev | local | Rafales authentifiées OK, re-login OK, pas de spam intrusion. |
| 19/05/2026 | Navigation sécurité de base | local | Politiques, Menaces, Firewall, Analyse, Réseau parcourus. |
| 20/05/2026 | Central logging vers `aggregated_logs` | local | Smoke runtime 15/15 côté technique, cohérent visuellement à confirmer si besoin. |
| 20/05/2026 | Statistics log-stats persistance | local | Compteurs persistés non nuls côté API, validation visuelle partielle. |
| 21/05/2026 | Mode clair backoffice accepté provisoirement | local | Lisibilité globale non bloquante ; rouvrir page par page si souci précis. |
| 21/05/2026 | Performances transitions de période | local | Graphes conservés pendant 24 h → 7 j → 3 j → Aujourd’hui → plage personnalisée. |
| 21/05/2026 | CI GitHub run `26202796200` | GitHub | Pipeline complet succès sur la branche concernée. |

## Règle d’archivage

Quand une ligne est déplacée depuis `TODOS_A_VALIDER.md`, conserver :

- la date ;
- l’environnement ;
- la preuve observée ;
- le problème restant éventuel, transformé en tâche dans `docs/TODOS.md`.
