# TODOs validés par le porteur

Dernière mise à jour : 29 juillet 2026

## Rôle

Ce fichier archive ce que le porteur a réellement validé. Les validations techniques automatiques restent dans `docs/STATUS.md` ; le backlog technique dans `docs/pilotage/TODOS.md`.

## Validé localement

| Date | Élément validé | Environnement | Preuve / remarque |
|------|----------------|---------------|-------------------|
| 29/07/2026 | Mobile **MOB-ENT-01** — onglet Entreprises + hub détail Capgemini | Samsung + APK 1.0.39 | OK porteur : contacts liés cohérents ; candidatures/relances/entretiens/appels visibles sur fiche entreprise. Suite : MOB-LIST → MOB-HUB → MOB-NAV → snacks/FAB. |
| 22/07/2026 | Process pilotage refondu (TODOS → A_TESTER → DONE) + UI `/backoffice/pilotage` | docs + local | Livré agent ; porteur suit B2-D.6 |
| 22/07/2026 | Popup crashs mobile/logs — fermeture backdrop/Escape | local | Fix `AnalyticsRecordDetailDialog` — re-test porteur |
| 22/07/2026 | Mobile B2 — **B.3** USER drawer sans Administration | Samsung + APK 1.0.31 | OK porteur explicite |
| 22/07/2026 | Mobile B2 — **B.4** ADMIN impersonnaliser → Désimpersonnaliser → hub | Samsung | OK porteur explicite |
| 22/07/2026 | Mobile B2 — **C.5** Candidatures → Relances (liste sans crash) | Samsung | OK porteur ; crash setState pendant build corrigé agent (APK 1.0.31) |
| 22/07/2026 | P1C — Mode sombre / Popup paramètres / couleurs conteneurs distinctes | backoffice local | OK porteur partiel ; reste moteur couleurs stables, tooltips, budget mémoire 101 Go, downsampling |
| 07/07/2026 | Baseline plateforme **JT-1.0.0** (Phase C — C6) | local + manifeste `dev` | **OK baseline JT-1.0.0 avec réserve** — re-vérifier avant prod complète (VPS, OTA prod, gate). Mobile build **+12** ; drawer legacy `1.0.0` + Build 12 → rebuild APK pour affichage `1.0.12`. |
| 27/06/2026 | Backoffice — temps de réponse hub + panneau P1B (fix light=1) | local après rebuild + up-full | Validation porteur : temps de réponse affichés ms où il faut. Correctif `03ffcddb` — sondes HTTP conservées en mode `light=1` ; signaux sécurité alignés Analyse 30 j. |
| 25/06/2026 | Mobile — étape 1 inscription + télémétrie + vérif email (ligne 319) | Samsung R5CT7263YJL + stack locale | **OK Mobile — Inscription + télémétrie obligatoire + vérif email**. Smoke agent `smoke-etape1-inscription-adb.js` A→E ; porteur : mail reçu + page « Email vérifié » OK. Fix validateur alias `+`. |
| 19/06/2026 | Mobile — biométrie (login, déverrouillage, reconnexion empreinte) | Samsung R5CT7263YJL | Validation porteur explicite : « biométrie carrément OK ». Parcours : case login + déverrouillage immédiat post-connexion ; cold start empreinte ; après déconnexion compte enregistré + **Connexion par empreinte** (identifiants conservés chiffrés) ; Paramètres activation ; `FlutterFragmentActivity` ; `canOfferUnlockOption`. |
| 19/06/2026 | Mobile — déconnexion drawer/menu (régression) | Samsung R5CT7263YJL | Validation porteur : logout OK. Drawer/menu ⋮ → Connexion ; `appNavigatorKey` ; purge session sans effacer empreinte. |
| 18/06/2026 | Mobile — auth + parcours candidatures | Samsung R5CT7263YJL + local | Validation porteur : OK auth candidatures (liste non vide). Clarification déconnexion volontaire vs hors-ligne : logout purge données locales et renvoie login sans fermer l’app. Fix `UserSessionCleanup` + `AuthLogout`. |
| 18/06/2026 | Mobile — Paramètres télémétrie + Aide/retours | Samsung R5CT7263YJL | Validation porteur : OK paramètres télémétrie aide retours (toggles + formulaire bug clavier OK, déjà validé). |
| 18/06/2026 | Mobile/Backoffice — analytics app (perf live, retours, erreurs) | Samsung R5CT7263YJL + local | Validation porteur explicite : OK clavier formulaire bug. Formulaire « Signaler un bug » : clavier reste ouvert, saisie description OK, Envoyer via AppBar. Emails retour/crash enrichis (capture inline, diagnostic, stack contexte). Commit `8888c7f6`. |
| 17/06/2026 | Statistics — graphes disponibilité / erreur (vue d'ensemble) | local | Validation porteur explicite : « OK Statistics vue d'ensemble même si partiel ». Graphes infra avec marqueurs sparse, ChartPeriodCaption, retrait panneau P1B doublon Performances. Candidatures/utilisateurs → App data. |
| 17/06/2026 | Statistics — onglet Données applicatives (`app-data`) | local | Validation porteur explicite : « ouais ca me vas ». Pills période 7/14/30 j, toggle séries métier, `ChartPeriodCaption`, snapshot explicite si un seul point API. |
| 17/06/2026 | Statistics — onglet Logs (`log-stats`) | local | Validation porteur explicite : « okay valide ». Filtres pills période, chips niveau sémantiques, autocomplete services, graphe **Volume de logs dans le temps** avec `ChartPeriodCaption`. Libs `logStatsTimeSeries`, `logLevelChipTone`. |
| 17/06/2026 | Performances Disque — volume utilisé/total + brush | local | Validation porteur explicite : « c'est parfait on valide ». Graphes volume sur 24 h (~680 / 900 Go), cartes utilisé/total + espace libre, Block I/O inchangé, plus d’overlay Next.js NaN. Correctif `diskMetricsModel.ts`, série complète dans les charts, brush pleine plage par défaut. |
| 17/06/2026 | Sécurité — filtres multi-valeurs Incidents & Menaces | local | Validation porteur explicite : `OK filtres multi Incidents Menaces`. Filtres combinés types/gravités/IP/ports sur `/security/incidents` et `/security/threats`. |
| 17/06/2026 | Statistics — onglet Sécurité cohérent avec `/security` | local | Validation porteur explicite : `OK Statistics Sécurité`. Comparatif persisté/live, score unifié Vue d'ensemble ↔ Analyse, menaces ignorables (faux positifs exclus des compteurs). PR #17 mergée sur `dev`. |
| 12/06/2026 | Performances HTTPS dev — proxy metrics-aggregator | local HTTPS | Validation porteur explicite : « je valide bien le https ». Correctif : `/api/metrics-aggregator/*` routé vers le proxy Next avant `/api/` dans Nginx dev HTTPS ; après redémarrage `jobbingtrack-dev-https-proxy`, endpoints conteneurs et historique système en **200** sur `https://jobbingtrack.localhost:5443`, page Conteneurs remplie et Corrélation sans 404. |
| 12/06/2026 | Corrélation performances — KPI logs après login | local HTTPS | Validation porteur explicite : graphes et smoke **200** OK. Preuves agent : 404 Corrélation corrigée via proxy HTTPS metrics-aggregator, graphes CPU/mémoire/réseau/I/O/TR visibles, détail graphique avant liste sur petit/moyen écran, Playwright Corrélation OK (24h ↔ 168h). |
| 12/06/2026 | Leurres / désinformation contrôlée VPS-Portainer | preprod/prod design | Validation porteur explicite des lignes P1A précédentes. Design validé sans déploiement : réduction d’exposition d’abord, Portainer/NPM admin via IP allowlist/VPN/tunnel, NPM réseau partagé limité, aucun honeypot sur domaine utilisateur réel sans préprod isolée dédiée. |
| 12/06/2026 | Tests offensifs contrôlés par conteneur JobbingTrack | lab autorisé | Validation porteur explicite des lignes P1A précédentes. Périmètre cadré en mode plan-only : préflight `controlled-offensive-preflight.cjs`, cible lab locale uniquement, `dryRun=true`, `willRunPayload=false`, aucun scan agressif ni action offensive sur prod. |
| 12/06/2026 | Mode sombre persistant après refresh | local | Validation porteur explicite : le switch mode sombre / mode clair s’adapte parfaitement et le mode sombre reste OK après refresh. Preuves agent : `tests/results/p1c-ux-theme-settings/20260612-135642` **4/4 OK**, Jest thème **9/9 OK**, `setStoredTheme` synchronise `theme`, `jobbingtrack-ui-preferences-v1`, `customization-settings`, script init thème présent dans `/login` et `/b4ck0ff1ce`. |
| 12/06/2026 | Popup paramètres fermeture | local | Validation porteur explicite : les paramètres sont conformes. Preuves agent : `SettingsPopup.test.tsx` **5/5 OK** (`Escape`, clic extérieur/backdrop, bouton fermer, clic interne sans fermeture), rapport `p1c-ux-theme-settings/20260612-135642`, email récap P1C envoyé avec `EmailLog` **SENT** x3. |
| 11/06/2026 | OK Alertes email critiques JobbingTrack | local/preprod | Validation porteur explicite : emails reçus dans la vraie boîte sans spam, dont `BATCH VALIDATION 6 COMMITS 2026-06-10T19:46:11Z`, `VALIDATION PORTEUR P1A` et l’alerte E2E `[JobbingTrack Security] HIGH - TEST P1A E2E security-service 2026-06-10T19:34:26.558Z`. Preuves agent : Jest SMTP/payload/disponibilité **11/11**, panneau `/b4ck0ff1ce/security/alerts` avec miroir OK, `EmailLog.metadata.mirror.sent=true`, `messageId @maily.ovh`. Diagnostic spécifique admin retiré ensuite : l’UI conserve seulement la liste claire des derniers emails `NOTIFICATION`. Expéditeur affiché `noreply@maily.ovh` accepté provisoirement ; objectif futur : domaine/alias `security@jobbingtrack.com` ou `security@maily.ovh` selon délivrabilité fournisseur. |
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
- le problème restant éventuel, transformé en tâche dans `docs/pilotage/TODOS.md`.
