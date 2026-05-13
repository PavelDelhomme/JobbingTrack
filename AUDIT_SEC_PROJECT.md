# Audit securite projet

Date : 13 mai 2026
Branche de travail : `docs/monitoring-security-audit`

## Synthese

Le projet a deja plusieurs bases utiles : WAF gateway, scans securite passifs, workflow `security-audit.yml`, Dependabot integre au `security-service`, auth metrics active par cle serveur, nettoyage des identifiants visibles sur `/login`, et premiers tests WAF / XSS / JWT / headers.

Les risques principaux ne sont plus seulement "manque d'outil", mais plutot :

- tri incomplet des rapports bruts P0 ;
- recuperation backoffice des rapports securite pas encore prouvee ;
- exposition Docker/prod a durcir ;
- forensics encore trop descriptive et pas assez probante ;
- validation manuelle porteur pas centralisee ;
- legacy monitoring C encore visible dans certaines docs/taches.

## Risques critiques ou hauts

### 0. Statut P0 outil par outil

| Outil / controle | Etat actuel | Suite attendue |
|------------------|-------------|----------------|
| `gitleaks` historique complet | Execute le 11/05, 717 findings bruts notes dans `docs/security/STATS.md` | Trier secrets reels vs artefacts de tests, redacter/supprimer si besoin |
| Trivy / CVE images compose prod fusionne | Execute le 11/05, resultats critiques/hauts notes dans `docs/security/STATS.md` | Classer par surface exposee, corriger images/dépendances critiques |
| `nmap` | Non execute sans cible autorisee | Lancer seulement avec `SECURITY_NMAP_TARGET` preprod/prod autorisee |
| `jwt_tool` | Non execute faute d'outil/token lab confirme | Generer un JWT lab et tester algorithmes/faiblesses de signature |
| OWASP ZAP active scan | Prepare mais non execute en actif par defaut | Lancer seulement en local/preprod autorisee avec `SECURITY_ACTIVE_SCAN=1` |
| `truffleHog` | Non installe lors du dernier etat connu | Installer ou documenter l'absence, puis comparer avec `gitleaks` |

### 1. Rapports P0 bruts non tries

Etat :

- `gitleaks` historique complet a ete lance : 717 findings bruts notes dans `docs/STATUS.md`.
- Trivy/CVE images compose prod fusionne a ete lance : resultats critiques/hauts notes dans `docs/security/STATS.md`.
- Les rapports dates sont non versionnes, ce qui est correct pour eviter de publier des chemins locaux ou extraits sensibles.

Risque :

- Tant que les findings `critical/high` ne sont pas classes, il est impossible de dire ce qui est un faux positif, une dette dev-only ou une vraie faille exploitable.

Action :

- Recuperer les rapports locaux sous `reports/security/` et `tests/results/security/`.
- Classer chaque finding `critical/high` avec : outil, date, commit, environnement, surface, decision, justification, tache corrective.
- Reporter la synthese dans `docs/security/STATS.md` et `docs/STATUS.md`.

### 2. Rapports securite pas encore exposes clairement dans le backoffice

Etat :

- Le backoffice liste deja plusieurs rapports via les routes `frontend/src/app/api/test-reports/*`.
- `reports/security/README.md` existe, mais les rapports dates securite sont ignores par Git.
- La route de liste des rapports couvre aussi, depuis le 13/05, `reports/security/**` et `tests/results/security/**` quand un dossier contient `summary.md`, `summary.json` ou `report.html`.

Risque :

- Le branchement existe, mais il doit encore etre prouve en navigateur par le porteur sur de vrais rapports locaux/preprod.

Action :

- Verifier que les rapports `reports/security/**/summary.md` et `tests/results/security/**/summary.md` sont listables, telechargeables et lisibles dans le backoffice.
- Ajouter un test de lecture ou un smoke API route pour eviter une regression.

### 3. Surface Docker/prod encore trop ouverte

Etat :

- `docs/TODOS.md` indique que le scan ports compose prod fusionne a trouve trop de ports internes publies sur `0.0.0.0`.
- `docs/security/COMPOSE_RUNTIME_HARDENING.md` existe pour guider les actions.

Risque :

- En preprod/prod, des services internes peuvent etre exposes directement au lieu de passer uniquement par gateway/proxy.

Action :

- Fermer les ports non publics en prod.
- Verifier `docker-compose.prod.yml` et les overrides.
- Ajouter une validation CI/preprod qui echoue si un service interne non autorise publie un port public.

### 3 bis. WAF et flux proxy

Etat :

- Middleware principal : `backend/api-gateway/src/middleware/waf.js`.
- Les validations recentes indiquent que le trafic navigateur avec `X-Forwarded-*` n'est plus considere comme interne sans secret machine valide.
- La documentation de securite reference les tests WAF et la matrice offensive.

Risque :

- Sans tests preprod, un reverse proxy reel peut avoir des CIDR, headers ou comportements differents du proxy local.

Action :

- Valider WAF derriere le reverse proxy preprod reel.
- Verifier les CIDR autorises et l'usage de `X-Internal-Secret`.
- Ajouter des tests de non-regression pour bypass interne vs trafic navigateur proxyfie.

### 4. Secrets et historiques

Etat :

- `.env` est ignore.
- `.env.example` documente les variables.
- Des scans historiques remontent surtout des tokens/JWT/headers dans artefacts de tests.
- Les artefacts generes racine ont ete sortis de Git.

Risque :

- Des secrets historiques ou exemples dangereux peuvent rester dans anciens rapports, docs ou branches.

Action :

- Terminer le tri `gitleaks`.
- Supprimer ou redacter les artefacts de tests contenant tokens/headers sensibles.
- Ne pas baser la conclusion sur le seul etat courant du working tree.

## Risques moyens

### Forensics menaces : clarifier le vocabulaire

Le terme "provider IP intelligence ASN/VPN/proxy/Tor" signifie :

- ASN : organisation/reseau operateur d'une IP, par exemple un cloud provider ou FAI.
- VPN/proxy/Tor : indication que l'IP semble venir d'un relais anonymisant ou d'une infrastructure partagee.
- IP intelligence : enrichissement externe ou local qui ajoute ces informations a partir d'une base maintenue.

Ce n'est pas de la forensic a lui seul. C'est seulement un enrichissement reseau. La forensic utile doit aussi contenir :

- requete brute ou echantillon redige ;
- payload dangereux ;
- route et service touches ;
- utilisateur ou compte impacte si connu ;
- `requestId` / `correlationId` ;
- logs applicatifs correles ;
- action prise par WAF/firewall ;
- preuve exportable et horodatee.

Action :

- Renommer la tache en "Forensics menaces : preuves techniques + enrichissement reseau".
- Ne pas presenter ASN/VPN/proxy/Tor comme preuve d'attaque.

### Monitoring et alertes service down

Etat :

- `monitoring-agent-rs` et `log-collector-rs` sont actifs par defaut.
- `monitoring-c` reste fallback legacy.
- Des alertes `service down` existent partiellement via `security-service`.

Risque :

- Les anciennes taches parlent encore de C alors que la validation a faire doit cibler Rust.

Action :

- Reformuler les benchmarks longs en post-bascule Rust.
- Garder les mesures C comme baseline historique seulement.

### Validations manuelles porteur dispersees

Etat :

- `TODOs.md`, `STATUS.md`, `PLAN.md` contiennent des validations manuelles, mais elles sont eparpillees.

Risque :

- Impossible pour le porteur de valider proprement avant production.

Action :

- Utiliser `A_VALIDER_VERIFIER.md` comme registre unique de validation porteur.
- Quand le porteur valide, reporter ensuite dans `PLAN.md` et `STATUS.md`.

## Points deja bien avances

- WAF gateway : protections XSS/headers/proxy interne mieux encadrees.
- Login admin : plus d'identifiants affiches dans l'UI de login.
- Metrics API : auth par cle serveur active.
- Dependabot : import serveur des alertes possible.
- CI : actions Node 24 et validation DB corrigees.
- Tests : suite agregee recente documentee comme verte en smoke.
- Rapports generes : les rapports racine ont ete sortis du suivi Git.

## CI securite

Workflow concerne : `.github/workflows/security-audit.yml`.

Etat :

- Le workflow a ete corrige pour utiliser des actions compatibles Node 24.
- Trivy est reference avec un tag existant.
- Les rapports doivent etre produits comme artefacts GitHub ou sous `reports/security/` / `tests/results/security/` en local.

Risques :

- Les resultats GitHub peuvent differer du local selon branche, secrets disponibles, profondeur Git et images accessibles.
- Certains commits ne declenchent pas les memes workflows selon les chemins modifies ; cela doit etre documente dans `docs/ci-cd/README.md`.

Actions :

- Observer le prochain run GitHub sur cette branche.
- Documenter la matrice de triggers par workflow.
- Verifier que les artefacts de scan sont telechargeables depuis GitHub et/ou visibles depuis le backoffice apres branchement des rapports securite.

## Taches prioritaires a ajouter ou garder dans `TODOS.md`

1. Brancher les rapports securite dans le backoffice et valider telechargement/lecture.
2. Trier les findings `critical/high` P0 et produire une synthese exploitable.
3. Reformuler la tache forensics pour separer preuves techniques et enrichissement IP.
4. Lancer un benchmark long post-bascule Rust au gate preprod, pas a chaque iteration.
5. Durcir l'exposition compose prod.
6. Centraliser les validations porteur dans `A_VALIDER_VERIFIER.md`.
7. Creer et respecter `BRANCHES.md` pour noms de branches et commits.

## Decision

Le projet ne doit pas etre considere pret pour preprod/prod tant que les rapports securite P0 ne sont pas tries, que l'exposition compose prod n'est pas reduite, et que le porteur n'a pas une liste de validation claire pour chaque fonctionnalite sensible.
