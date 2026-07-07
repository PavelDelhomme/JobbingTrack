# Convention de version officielle — JobbingTrack

Dernière mise à jour : **7 juillet 2026**  
**Statut : DÉCISION FINALE** — une seule convention pour le projet (solo porteur). Pas d’autre variante à utiliser.

Documents liés :

- Plateforme / manifeste : [`VERSIONNEMENT_PLATEFORME.md`](VERSIONNEMENT_PLATEFORME.md)
- Mobile OTA : [`../mobile/VERSIONNEMENT.md`](../mobile/VERSIONNEMENT.md)
- VPS Portainer : [`VPS_95_INTEGRATION_PORTAINER.md`](VPS_95_INTEGRATION_PORTAINER.md)
- Stack Git : [`../production/PORTAINER_STACK.md`](../production/PORTAINER_STACK.md)

---

## 1. Décision mobile : **`1.0.N+N` définitif**

| Option | Verdict |
|--------|---------|
| **`1.0.N+N`** (ex. `1.0.12+12`) | **RETENU** — politique officielle JobbingTrack |
| `1.0.0+N` (SemVer Flutter pur) | **Abandonné** pour ce projet |

**Pourquoi on garde `1.0.N+N` :**

1. Vous voyez **immédiatement** quelle build est installée (drawer, OTA, backoffice).
2. Déjà **implémenté** (`bump-pubspec-version.js`, OTA, commit `45a7a139`).
3. Le mobile a un **cycle séparé** du VPS — pas besoin d’aligner avec `application-service 1.0.1`.
4. Le 3e chiffre = build est **volontairement** différent du SemVer strict ; c’est documenté et constant.

**App concernée** : `mobile/` uniquement. Le dossier `flutter-mobile-app/` est **hors** cette convention tant qu’il n’est pas déclaré produit principal.

---

## 2. Règle unique par couche

### Backend (microservices Node)

| Élément | Règle |
|---------|--------|
| Format | **`MAJOR.MINOR.PATCH`** SemVer classique |
| Source | `backend/<service>/package.json` → champ `version` |
| Bump **patch** | Bugfix rétrocompatible, un service touché |
| Bump **minor** | Nouvelle feature rétrocompatible |
| Bump **major** | Rupture API ou schéma incompatible |
| Déploiement | **Uniquement** le service bumpé (+ `api-gateway` si routes/proxy changent) |

Services concernés : `api-gateway`, `auth-service`, `application-service`, `call-service`, `company-service`, `contact-service`, `dashboard-service`, `deployment-service`, `event-service`, `followup-service`, `interview-service`, `metrics-aggregator-service`, `notification-service`, `profile-service`, `security-service`, `workflow-service`.

### Frontend / backoffice (Next.js)

| Élément | Règle |
|---------|--------|
| Format | **`MAJOR.MINOR.PATCH`** |
| Source | `frontend/package.json` |
| Bump | Même logique SemVer que backend |
| Build | Variables `NEXT_PUBLIC_*` **figées au build** de l’image |

### Mobile (Flutter)

| Élément | Règle |
|---------|--------|
| Format pubspec | **`MAJOR.MINOR.BUILD+BUILD`** — ex. `1.0.13+13` |
| Affichage utilisateur | **`Version 1.0.13`** |
| Bump | **Automatique** à chaque « Build APK » ; MINOR/MAJOR **manuels** si jalon produit |
| Déploiement | **OTA** (canal dev / production) — **pas** Portainer |

### Release plateforme (jalon global)

| Élément | Règle |
|---------|--------|
| Format | **`JT-MAJOR.MINOR.PATCH`** — ex. **`JT-1.0.0`** |
| Rôle | « Tout fonctionne ensemble » à un instant T (snapshot manifeste) |
| Bump | **Manuel**, après validation porteur — pas à chaque commit |
| Baseline actuelle | **`JT-1.0.0`** (à figer via manifeste, voir §6) |

### Tags Docker (registry → Portainer)

| Environnement | Tag | Règle |
|---------------|-----|--------|
| **Local PC** | _(pas de tag registry)_ | `docker compose build` |
| **Préprod VPS** | `1.2.0-rc1` ou `1.2.0-YYYYMMDD.<sha7>` | Test avant prod ; peut être rebuild souvent |
| **Prod VPS** | **`1.2.3-YYYYMMDD.<sha7>`** | **Immuables** — jamais `:latest` en prod |
| **Interdit prod** | `:latest`, `:dev-latest` | Rollback impossible |

Format tag : **`{semver-composant}-{date}.{sha7}`** (tiret, pas `+`).

Exemple : `ghcr.io/paveldelhomme/jobbingtrack-api-gateway:1.0.5-20260707.a1b2c3d`

---

## 3. Environnements et URLs

| Environnement | Où | Stack Portainer | Branche Git | URLs (exemple OVH) |
|---------------|-----|-----------------|-------------|---------------------|
| **Local dev** | PC porteur | _(compose local)_ | `dev` | `https://jobbingtrack.localhost:5443` |
| **Préprod** | VPS `95.111.227.204` | **`jobbingtrack-preprod`** | `dev` | `https://jobbingtrack-preprod.delhomme.ovh` · API `https://api-preprod.jobbingtrack.delhomme.ovh` |
| **Production** | VPS `95.111.227.204` | **`jobbingtrack-prod`** | `main` | `https://jobbingtrack.delhomme.ovh` · API `https://api.jobbingtrack.delhomme.ovh` |

**Règle URLs** : jamais réutiliser les URLs locales en prod. Fichier modèle : `deploy/production/.env.example` — secrets **Portainer uniquement**.

---

## 4. Quand déployer quoi (commit → merge → release)

| Événement | Action version | Action déploiement |
|-----------|----------------|-------------------|
| **Commit** sur branche feature | Rien (sauf bump local si APK mobile) | Rien sur VPS |
| **Merge** vers `dev` | Bump **patch** des composants modifiés (manifeste) | Option : auto-deploy **préprod** (webhook / script) |
| **Fix API seul** en prod | Patch `application-service` (+ gateway si besoin) | Redeploy **ce conteneur** via Portainer |
| **Validation porteur** | Bump **`JT-x.y.z`** + snapshot manifeste complet | Deploy prod **stack entière** ou delta manifeste |
| **Build mobile** | Auto `1.0.N+N` | Publish OTA dev → promote prod |

**Source de vérité au déploiement VPS** : `deploy/releases/platform-manifest.yaml` (à créer — étape suivante d’implémentation).

---

## 5. Information publique vs interne (sécurité)

### Ce que les utilisateurs / clients API **peuvent** voir

Endpoint public prévu (à implémenter) : `GET /api/v1/public/release-info`

```json
{
  "platformRelease": "JT-1.0.0",
  "api": { "version": "1.0.5" },
  "mobile": { "minVersion": "1.0.5", "minBuild": 5 }
}
```

- Semver **composant** uniquement — pas de SHA Git en prod publique.
- Pas d’IP serveur, pas de noms de conteneurs, pas d’emails admin.
- Pas de liste complète des 14 microservices (surface d’attaque réduite).

### Ce qui reste **interne** (admin / deployment-service)

- Manifeste complet avec tags Docker, SHA, auteur deploy.
- Logs Portainer, secrets stack, JWT, mots de passe BDD.
- Backend **non open source** : dépôt **privé**, images registry **privées** ou pull authentifié.

### Ce que le backoffice admin affiche

- Versions détaillées par service (connecté JWT admin).
- Historique deploy / rollback.

---

## 6. Baseline `JT-1.0.0` (prochaine action)

Avant tout script deploy :

1. Normaliser les composants au snapshot actuel (`package.json` → mostly `1.0.0` ou `1.0.1`).
2. Créer `deploy/releases/JT-1.0.0.yaml` (premier manifeste).
3. Valider porteur : « OK baseline JT-1.0.0 ».

Mobile dans ce manifeste : **`1.0.12+12`** (état actuel dev), prod OTA peut rester en retard — **normal**.

---

## 7. Récap une page

```
Mobile          → 1.0.N+N  (OTA, auto bump build)
Backend/Front   → MAJOR.MINOR.PATCH SemVer par composant
Plateforme      → JT-x.y.z (jalons porteur)
Docker prod     → semver-date.sha (immuable)
Préprod / Prod  → 2 stacks Portainer sur VPS 95.111.227.204, réseau web + NPM
Deploy vérité   → platform-manifest.yaml
Public API      → semver minimal, pas de secrets ni infra
```

**Ordre implémentation** (ne pas sauter) :

1. ✅ Convention (ce document)  
2. ✅ Manifeste `JT-1.0.0` + `platform-manifest.yaml` + JSON runtime  
3. ✅ Scripts `bump-component-version.sh` + `sync-platform-manifest.sh` + `audit-toolchain.sh`  
4. ⏳ Stacks `jobbingtrack-preprod` / `jobbingtrack-prod` sur VPS  
5. ✅ Endpoint public `GET /api/v1/public/release-info` — admin deployment-service ⏳  
6. ✅ Doc breaking change (`BREAKING_CHANGE_CHECKLIST.md`) + pipeline compat — voir [`COMPATIBILITE_ET_MISES_A_JOUR.md`](COMPATIBILITE_ET_MISES_A_JOUR.md)

---

*Convention validée alignée Perplexity + Cursor — 7 juillet 2026.*
