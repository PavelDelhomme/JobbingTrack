# 🔌 LOGIQUE DE PORTS - JobbingTrack

## 📋 PROPOSITION DE LOGIQUE DE PORTS

### 🎯 Principe
- **Ports externes (exposés sur l'hôte)** : Utiliser une plage cohérente qui se suit logiquement
- **Ports internes (Docker)** : Conserver les ports standards pour la compatibilité interne
- **Éviter les conflits** : Ne pas utiliser les ports standards (5432, 6379, etc.) en externe

### 📊 PROPOSITION : Plage 2000-2999

#### 🏗️ Infrastructure (2000-2099)
| Service | Port Externe | Port Interne | Description |
|---------|--------------|--------------|-------------|
| PostgreSQL | **2000** | 5432 | Base de données principale |
| Redis | **2001** | 6379 | Cache et sessions |

#### 🌐 Services Frontend & Gateway (2100-2199)
| Service | Port Externe | Port Interne | Description |
|---------|--------------|--------------|-------------|
| Frontend | **2100** | 3000 | Interface utilisateur Next.js |
| API Gateway | **2101** | 3000 | Point d'entrée API principal |

#### 🔐 Services Backend Principaux (2200-2299)
| Service | Port Externe | Port Interne | Description |
|---------|--------------|--------------|-------------|
| Auth Service | **2200** | 3001 | Authentification et utilisateurs |
| Dashboard Service | **2201** | 3000 | Tableaux de bord et statistiques |

#### 📋 Services Métiers (2300-2399)
| Service | Port Externe | Port Interne | Description |
|---------|--------------|--------------|-------------|
| Company Service | **2300** | 3003 | Gestion des entreprises |
| Application Service | **2301** | 3002 | Gestion des candidatures |
| Contact Service | **2302** | 3004 | Gestion des contacts |
| Interview Service | **2303** | 3005 | Gestion des entretiens |
| Call Service | **2304** | 3006 | Gestion des appels |
| FollowUp Service | **2305** | 3008 | Gestion des relances |
| Event Service | **2306** | 3007 | Gestion des événements |

#### 📊 Services Monitoring & Métriques (2400-2499)
| Service | Port Externe | Port Interne | Description |
|---------|--------------|--------------|-------------|
| Metrics Aggregator | **2400** | 3014 | Agrégation des métriques |
| Prometheus | **2401** | 9090 | Collecte de métriques |
| Grafana | **2402** | 3000 | Visualisation des métriques |
| Loki | **2403** | 3100 | Collecte de logs |
| cAdvisor | **2404** | 8080 | Métriques conteneurs |

#### 🔒 Services Sécurité & Utilitaires (2500-2599)
| Service | Port Externe | Port Interne | Description |
|---------|--------------|--------------|-------------|
| Security Service | **2500** | 3017 | Logs de sécurité |
| Notification Service | **2501** | 3010 | Notifications |
| Profile Service | **2502** | 3011 | Profils utilisateurs |
| Workflow Service | **2503** | 3012 | Workflows |
| Deployment Service | **2504** | 3013 | Déploiements |

#### 📧 Services Email & Communication (2600-2699)
| Service | Port Externe | Port Interne | Description |
|---------|--------------|--------------|-------------|
| MailHog (dev) | **2600** | 8025 | Serveur email développement |

---

## 📝 RÉSUMÉ DES CHANGEMENTS

### ✅ Avantages de cette logique :
1. **Cohérence** : Tous les ports externes suivent une séquence logique (2000-2999)
2. **Organisation** : Groupes de 100 ports par catégorie
3. **Évite les conflits** : Pas de ports standards (5432, 6379) en externe
4. **Facilité de mémorisation** : Logique claire et prévisible
5. **Évolutivité** : Plage de 1000 ports pour ajouter de nouveaux services

### 🔄 Changements par rapport à l'actuel :

| Service | Port Actuel | Port Proposé | Changement |
|---------|-------------|--------------|------------|
| PostgreSQL | 5432 | **2000** | ✅ Changé |
| Redis | 6379 | **2001** | ✅ Changé |
| Frontend | 5003/8080 | **2100** | ✅ Unifié |
| API Gateway | 5002/3000 | **2101** | ✅ Unifié |
| Auth Service | 8001 | **2200** | ✅ Changé |
| Dashboard Service | 8012 | **2201** | ✅ Changé |
| Company Service | 8003 | **2300** | ✅ Changé |
| Application Service | 8002 | **2301** | ✅ Changé |
| Contact Service | 8004 | **2302** | ✅ Changé |
| Interview Service | 8005 | **2303** | ✅ Changé |
| Call Service | 8006 | **2304** | ✅ Changé |
| FollowUp Service | 8008 | **2305** | ✅ Changé |
| Event Service | 8007 | **2306** | ✅ Changé |
| Metrics Aggregator | 8014/5004 | **2400** | ✅ Unifié |

---

## 🎯 MAPPING COMPLET

```
Infrastructure (2000-2099)
├── 2000 → PostgreSQL (5432 interne)
└── 2001 → Redis (6379 interne)

Frontend & Gateway (2100-2199)
├── 2100 → Frontend (3000 interne)
└── 2101 → API Gateway (3000 interne)

Backend Principaux (2200-2299)
├── 2200 → Auth Service (3001 interne)
└── 2201 → Dashboard Service (3000 interne)

Services Métiers (2300-2399)
├── 2300 → Company Service (3003 interne)
├── 2301 → Application Service (3002 interne)
├── 2302 → Contact Service (3004 interne)
├── 2303 → Interview Service (3005 interne)
├── 2304 → Call Service (3006 interne)
├── 2305 → FollowUp Service (3008 interne)
└── 2306 → Event Service (3007 interne)

Monitoring (2400-2499)
├── 2400 → Metrics Aggregator (3014 interne)
├── 2401 → Prometheus (9090 interne)
├── 2402 → Grafana (3000 interne)
├── 2403 → Loki (3100 interne)
└── 2404 → cAdvisor (8080 interne)

Sécurité & Utilitaires (2500-2599)
├── 2500 → Security Service (3017 interne)
├── 2501 → Notification Service (3010 interne)
├── 2502 → Profile Service (3011 interne)
├── 2503 → Workflow Service (3012 interne)
└── 2504 → Deployment Service (3013 interne)

Email & Communication (2600-2699)
└── 2600 → MailHog (8025 interne)
```

---

## 📋 FICHIERS À MODIFIER

### 1. `.env`
- Tous les `*_PORT` externes
- `NEXT_PUBLIC_API_URL` (utiliser 2101 au lieu de 5002)
- `NEXT_PUBLIC_METRICS_URL` (utiliser 2400 au lieu de 5004/8014)
- `FRONTEND_URL` (utiliser 2100 au lieu de 5003/8080)

### 2. `docker-compose.yml`
- Toutes les sections `ports:` pour les ports externes
- Variables d'environnement contenant des URLs avec ports

### 3. Documentation
- `README.md`
- `docs/getting-started/*.md`
- Tous les fichiers mentionnant des ports

### 4. Scripts
- Scripts de démarrage
- Scripts de test
- Scripts de configuration

### 5. Code Frontend
- `frontend/.env*`
- Fichiers de configuration Next.js
- Services API (URLs hardcodées)

### 6. Code Backend
- Variables d'environnement
- URLs de services inter-services (garder ports internes)
- Configuration de services

---

## ⚠️ NOTES IMPORTANTES

1. **Ports internes** : Les ports internes Docker (3000, 3001, etc.) restent inchangés
2. **URLs inter-services** : Les services communiquent entre eux via les ports internes
3. **URLs externes** : Seuls les services exposés utilisent les nouveaux ports externes
4. **Migration** : Après validation, migration progressive pour éviter les coupures

---

## ✅ VALIDATION

**À valider avant application :**
- [ ] La logique de ports est cohérente
- [ ] Les plages de ports sont suffisantes
- [ ] Aucun conflit avec d'autres projets
- [ ] Les ports proposés sont disponibles

**Après validation, je procéderai à :**
1. Modification de `.env`
2. Modification de `docker-compose.yml`
3. Mise à jour de la documentation
4. Mise à jour des scripts
5. Mise à jour du code frontend/backend

---

**Date de création** : 2025-12-10  
**Auteur** : Auto (Assistant IA)  
**Statut** : ⏳ En attente de validation

