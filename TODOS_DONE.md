# TODOs validés par le porteur

Dernière mise à jour : 10 juin 2026

## Rôle

Ce fichier archive ce que le porteur a réellement validé. Les validations techniques automatiques restent dans `docs/STATUS.md`; les tâches techniques terminées restent dans `docs/TODOS.md` ou l’historique Git.

## Validé localement

| Date | Élément validé | Environnement | Preuve / remarque |
|------|----------------|---------------|-------------------|
| 11/06/2026 | Alertes email critiques JobbingTrack | local/preprod | Validation porteur explicite : emails reçus dans la vraie boîte `admin@delhomme.ovh` sans spam, dont `BATCH VALIDATION 6 COMMITS 2026-06-10T19:46:11Z`, `VALIDATION PORTEUR P1A` et l’alerte E2E `[JobbingTrack Security] HIGH - TEST P1A E2E security-service 2026-06-10T19:34:26.558Z`. Preuves agent : Jest SMTP/payload/disponibilité **11/11**, panneau `/b4ck0ff1ce/security/alerts` avec miroir OK, `EmailLog.metadata.mirror.sent=true`, `messageId @maily.ovh`. Expéditeur affiché `noreply@maily.ovh` accepté provisoirement ; objectif futur : domaine/alias `security@jobbingtrack.com` ou `security@maily.ovh` selon délivrabilité fournisseur. |
| 10/06/2026 | Restauration logs sécurité en staging | local HTTPS | Validation porteur explicite : `security-logs-archive-restore.cjs --class=noise --load-staging` OK ; script affiche `No write to public.security_logs` ; `security_logs_restore_staging` = **50** ; `security_logs` inchangé **42311**. |
| 10/06/2026 | Archive logs sécurité sans purge | local HTTPS | Validation porteur explicite : UI `/b4ck0ff1ce/security/logs` conforme sans bouton d’archivage attendu ; dry-run rétention lecture seule OK ; export `noise` 50 lignes vers `data/archives/security-logs/2026-06-10/` ; `manifest.json` lisible avec note « Export only — no rows deleted from security_logs » ; `noise.jsonl.gz` présent ; compteur `security_logs` inchangé **42311 → 42311**. |
| 10/06/2026 | Comparaison de rapports sécurité CVE exploitable | local | Validation porteur explicite : mode comparaison `/b4ck0ff1ce/test-reports` OK, surfaces `critical/high` lisibles et classées à traiter, cas `Absent`/`skipped`/doublons compréhensibles. |
| 10/06/2026 | Menaces historiques/lab comprises avant nettoyage | local | Validation porteur explicite : `10.0.0.x`, `198.51.100.42`, `172.19.x/172.20.x` considérés comme bruit/lab ; purge possible uniquement via procédure dédiée et sans suppression implicite hors validation. |
| 10/06/2026 | Rapports sécurité — ouverture et téléchargement | local | Validation porteur explicite : ouverture et téléchargement des rapports sécurité OK. Problème résiduel séparé : boutons de téléchargement doublons dans la popup agrandie des test-reports à corriger directement. |
| 10/06/2026 | CVE applicatives localisées dans JobbingTrack | local | Validation temporaire après correction agent : `CVE-2026-21710` localisée via source `node-runtime` sur les Dockerfiles `node:20.18.0`, avec version corrigée `20.20.2+`, surface HTTP Node et correctif. Test ajouté `tests/security/cve-locate-runtime.test.js` : 1/1 OK ; `tsc --noEmit` frontend OK. |
| 10/06/2026 | Test-reports — téléchargement popup agrandie sans doublon | local | Correction agent : suppression du bouton Télécharger dupliqué dans l’en-tête fullscreen ; il reste un seul bouton dans la barre d’actions. ESLint ciblé OK avec warnings historiques uniquement. |
| 08/06/2026 | Détails bruts rapports sécurité sous réauth forte | local | Validation porteur : réauth présente et comportement confirmé OK. Flux livré : bouton « Voir détails sensibles », mot de passe admin, jeton court usage unique, audit `security-audit/step-up.jsonl`, `Cache-Control: no-store`. |
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
