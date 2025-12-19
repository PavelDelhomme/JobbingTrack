# Plan d'Implémentation : Firewall et Analyse Réseau

## 📋 Vue d'ensemble

Ce document décrit le plan d'implémentation d'un système de firewall et d'analyse réseau pour `security-service`, permettant de surveiller et protéger tous les conteneurs JobbingTrack.

## 🎯 Objectifs

1. **Firewall** : Bloquer les connexions suspectes et non autorisées
2. **Analyse Réseau** : Détecter les attaques (SYN flood, port scanning, etc.)
3. **Monitoring** : Surveiller le trafic réseau de tous les conteneurs
4. **Alertes** : Notifier en cas d'anomalies détectées

## 🏗️ Architecture

### Composants Principaux

1. **Network Monitor (C)** : Collecteur de métriques réseau ultra-performant
2. **Firewall Engine (Node.js)** : Moteur de règles de firewall
3. **Threat Detection (Node.js)** : Détection d'anomalies et attaques
4. **API REST** : Endpoints pour gérer les règles et consulter les logs

### Flux de Données

```
Conteneurs Docker
    ↓
Network Monitor (C) → Collecte métriques réseau (SYN, ACK, RST, etc.)
    ↓
Security Service → Analyse + Détection d'anomalies
    ↓
Firewall Engine → Application des règles
    ↓
PostgreSQL → Stockage des logs et métriques
    ↓
Frontend → Affichage dans /backoffice/security
```

## 📦 Composants à Développer

### 1. Network Monitor (C) - `network-monitor-c/`

**Fichiers** :
- `src/collector.c` : Collecte des métriques réseau depuis `/proc/net/`
- `src/packet_analyzer.c` : Analyse des paquets (via libpcap ou eBPF)
- `src/firewall_rules.c` : Application des règles de firewall
- `include/collector.h` : Structures de données

**Métriques collectées** :
- Connexions TCP (SYN, ACK, RST, FIN)
- Connexions UDP
- Trafic par port
- Trafic par conteneur (via cgroup)
- Taux de connexions par seconde
- Détection de port scanning
- Détection de SYN flood

**Dépendances** :
- `libpcap` ou `eBPF` pour la capture de paquets
- `/proc/net/tcp`, `/proc/net/udp` pour les statistiques
- `iptables` ou `nftables` pour le firewall

### 2. Security Service - Extensions

**Nouvelles routes** :
- `GET /api/v1/security/network/stats` : Statistiques réseau globales
- `GET /api/v1/security/network/containers/:containerId` : Stats par conteneur
- `GET /api/v1/security/firewall/rules` : Liste des règles de firewall
- `POST /api/v1/security/firewall/rules` : Créer une règle
- `DELETE /api/v1/security/firewall/rules/:id` : Supprimer une règle
- `GET /api/v1/security/threats` : Liste des menaces détectées
- `POST /api/v1/security/threats/:id/block` : Bloquer une IP

**Nouvelles tables Prisma** :
```prisma
model FirewallRule {
  id            String   @id @default(uuid())
  name          String
  description   String?
  sourceIp      String?  // IP source (CIDR)
  destPort      Int?     // Port destination
  protocol      String   // TCP, UDP, ICMP
  action        String   // ALLOW, DENY, REJECT
  priority      Int      @default(100)
  enabled       Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model NetworkThreat {
  id            String   @id @default(uuid())
  threatType    String   // SYN_FLOOD, PORT_SCAN, BRUTE_FORCE, etc.
  sourceIp      String
  destIp        String?
  destPort      Int?
  severity      String   // LOW, MEDIUM, HIGH, CRITICAL
  detectedAt     DateTime @default(now())
  blocked       Boolean  @default(false)
  metadata      Json?    // Détails supplémentaires
}

model NetworkConnection {
  id            String   @id @default(uuid())
  sourceIp      String
  destIp        String
  sourcePort    Int
  destPort      Int
  protocol      String
  state         String   // ESTABLISHED, SYN_SENT, etc.
  containerId   String?
  containerName String?
  bytesRx       BigInt   @default(0)
  bytesTx       BigInt   @default(0)
  packetsRx     Int      @default(0)
  packetsTx     Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### 3. Frontend - Pages Sécurité

**Nouvelles pages** :
- `/backoffice/security/network` : Vue d'ensemble du trafic réseau
- `/backoffice/security/firewall` : Gestion des règles de firewall
- `/backoffice/security/threats` : Liste des menaces détectées

**Composants** :
- `NetworkTrafficChart` : Graphique du trafic réseau
- `FirewallRulesTable` : Tableau des règles de firewall
- `ThreatsList` : Liste des menaces avec actions (bloquer, ignorer)
- `ConnectionMap` : Carte des connexions actives

## 🔧 Implémentation Technique

### Phase 1 : Collecte de Métriques (C)

1. **Lire `/proc/net/tcp` et `/proc/net/udp`**
   - Parser les connexions actives
   - Extraire IP source/destination, ports, états
   - Calculer les statistiques par conteneur

2. **Utiliser `libpcap` pour capture de paquets** (optionnel)
   - Capturer les paquets SYN, ACK, RST
   - Analyser les patterns suspects
   - Détecter les port scans

3. **Exposer via HTTP** (comme monitoring-c)
   - Endpoint `/api/v1/network/stats`
   - Format JSON avec métriques par conteneur

### Phase 2 : Détection d'Anomalies

1. **Détection SYN Flood**
   - Compter les connexions SYN par IP
   - Si > 100 SYN/s depuis une IP → alerte

2. **Détection Port Scanning**
   - Détecter les tentatives de connexion sur plusieurs ports
   - Si > 10 ports différents depuis une IP → alerte

3. **Détection Brute Force**
   - Analyser les logs d'authentification
   - Si > 5 échecs depuis une IP → alerte

### Phase 3 : Firewall

1. **Intégration avec `iptables` ou `nftables`**
   - Créer des règles dynamiques
   - Bloquer les IPs suspectes automatiquement

2. **Gestion des règles**
   - API REST pour créer/supprimer des règles
   - Priorité des règles
   - Règles par conteneur ou globales

### Phase 4 : Interface Frontend

1. **Page Network** (`/backoffice/security/network`)
   - Graphiques de trafic (RX/TX par conteneur)
   - Liste des connexions actives
   - Statistiques par protocole (TCP/UDP)

2. **Page Firewall** (`/backoffice/security/firewall`)
   - Tableau des règles avec actions (créer, modifier, supprimer)
   - Test de règles avant application
   - Historique des changements

3. **Page Threats** (`/backoffice/security/threats`)
   - Liste des menaces détectées
   - Actions : bloquer IP, ignorer, voir détails
   - Graphiques d'évolution des menaces

## 📊 Métriques à Collecter

### Par Conteneur
- Connexions TCP actives
- Connexions UDP actives
- Paquets RX/TX
- Bytes RX/TX
- Taux de connexions/s
- Ports ouverts/écoutés

### Global
- Total connexions
- Connexions par protocole
- Top IPs sources
- Top ports destination
- Menaces détectées
- Règles de firewall actives

## 🚀 Ordre d'Implémentation

1. ✅ **Network Monitor (C)** : Collecte basique depuis `/proc/net/`
2. ✅ **API Security Service** : Endpoints pour métriques réseau
3. ✅ **Détection d'anomalies** : SYN flood, port scanning
4. ✅ **Firewall Engine** : Intégration iptables/nftables
5. ✅ **Frontend Network Page** : Affichage des métriques
6. ✅ **Frontend Firewall Page** : Gestion des règles
7. ✅ **Frontend Threats Page** : Liste des menaces

## 🔒 Sécurité

- **Isolation** : Network Monitor en C isolé dans un conteneur
- **Permissions** : Nécessite `CAP_NET_RAW` pour capture de paquets
- **Audit** : Tous les changements de règles sont loggés
- **Rate Limiting** : Limiter les requêtes API pour éviter le DoS

## 📝 Notes

- Utiliser `eBPF` si disponible (plus performant que libpcap)
- Considérer `cilium` pour un firewall plus avancé
- Intégrer avec `log-collector-c` pour analyser les logs de sécurité
- Ajouter des webhooks pour notifier en cas de menaces critiques

