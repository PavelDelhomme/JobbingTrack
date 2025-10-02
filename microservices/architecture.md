# 🏗️ Architecture Microservices JobbingTrack

## Diagramme d'architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web App<br/>React/Vue]
        MOBILE[Mobile App<br/>React Native]
        API_CLIENT[API Clients]
    end

    subgraph "API Gateway Layer"
        GATEWAY[API Gateway<br/>Port 3000<br/>Load Balancer & Routing]
    end

    subgraph "Microservices Layer"
        AUTH[Auth Service<br/>Port 3001<br/>Authentication & Users]
        APP[Application Service<br/>Port 3002<br/>Job Applications]
        COMPANY[Company Service<br/>Port 3003<br/>Companies Management]
        CONTACT[Contact Service<br/>Port 3004<br/>Contacts Management]
        INTERVIEW[Interview Service<br/>Port 3005<br/>Interviews Management]
        NOTIF[Notification Service<br/>Port 3006<br/>Emails & Notifications]
        DASH[Dashboard Service<br/>Port 3007<br/>Analytics & Stats]
    end

    subgraph "Data Layer"
        POSTGRES[(PostgreSQL<br/>Port 5432<br/>Main Database)]
        REDIS[(Redis<br/>Port 6379<br/>Cache & Sessions)]
    end

    subgraph "Infrastructure"
        DOCKER[Docker Compose<br/>Orchestration]
        MONITOR[Monitoring<br/>& Logging]
    end

    %% Client connections
    WEB --> GATEWAY
    MOBILE --> GATEWAY
    API_CLIENT --> GATEWAY

    %% Gateway to services
    GATEWAY --> AUTH
    GATEWAY --> APP
    GATEWAY --> COMPANY
    GATEWAY --> CONTACT
    GATEWAY --> INTERVIEW
    GATEWAY --> NOTIF
    GATEWAY --> DASH

    %% Service to database connections
    AUTH --> POSTGRES
    APP --> POSTGRES
    COMPANY --> POSTGRES
    CONTACT --> POSTGRES
    INTERVIEW --> POSTGRES
    NOTIF --> POSTGRES
    NOTIF --> REDIS
    DASH --> POSTGRES

    %% Inter-service communication
    APP -.-> AUTH
    COMPANY -.-> AUTH
    CONTACT -.-> AUTH
    INTERVIEW -.-> AUTH
    DASH -.-> AUTH
    NOTIF -.-> AUTH

    %% Infrastructure
    DOCKER --> AUTH
    DOCKER --> APP
    DOCKER --> COMPANY
    DOCKER --> CONTACT
    DOCKER --> INTERVIEW
    DOCKER --> NOTIF
    DOCKER --> DASH
    DOCKER --> POSTGRES
    DOCKER --> REDIS

    %% Styling
    classDef clientClass fill:#e1f5fe
    classDef gatewayClass fill:#f3e5f5
    classDef serviceClass fill:#e8f5e8
    classDef dataClass fill:#fff3e0
    classDef infraClass fill:#fce4ec

    class WEB,MOBILE,API_CLIENT clientClass
    class GATEWAY gatewayClass
    class AUTH,APP,COMPANY,CONTACT,INTERVIEW,NOTIF,DASH serviceClass
    class POSTGRES,REDIS dataClass
    class DOCKER,MONITOR infraClass
```

## Flux de données

### 1. Authentification
```mermaid
sequenceDiagram
    participant C as Client
    participant G as API Gateway
    participant A as Auth Service
    participant DB as PostgreSQL

    C->>G: POST /api/v1/auth/login
    G->>A: POST /api/v1/auth/login
    A->>DB: Verify credentials
    DB-->>A: User data
    A-->>G: JWT token + user info
    G-->>C: JWT token + user info
```

### 2. Gestion des candidatures
```mermaid
sequenceDiagram
    participant C as Client
    participant G as API Gateway
    participant A as Auth Service
    participant APP as Application Service
    participant DB as PostgreSQL

    C->>G: GET /api/v1/applications (with JWT)
    G->>A: Verify JWT token
    A-->>G: User info
    G->>APP: GET /api/v1/applications (with user info)
    APP->>DB: Query applications
    DB-->>APP: Applications data
    APP-->>G: Applications list
    G-->>C: Applications list
```

### 3. Notifications
```mermaid
sequenceDiagram
    participant N as Notification Service
    participant DB as PostgreSQL
    participant R as Redis
    participant E as Email Service

    N->>DB: Query applications to follow up
    DB-->>N: Applications data
    N->>R: Store notification queue
    N->>E: Send email notification
    E-->>N: Email sent confirmation
```

## Avantages de l'architecture microservices

### ✅ Scalabilité
- Chaque service peut être mis à l'échelle indépendamment
- Load balancing au niveau de l'API Gateway
- Cache Redis pour améliorer les performances

### ✅ Maintenabilité
- Code modulaire et séparé par domaine métier
- Déploiement indépendant de chaque service
- Tests isolés par service

### ✅ Résilience
- Isolation des pannes (un service en panne n'affecte pas les autres)
- Circuit breaker pattern possible
- Retry mechanisms

### ✅ Flexibilité technologique
- Chaque service peut utiliser des technologies différentes
- Évolution indépendante des services
- Migration progressive possible

## Communication inter-services

### Synchronous (HTTP REST)
- API Gateway ↔ Services
- Services ↔ Services (pour l'authentification)
- Client ↔ API Gateway

### Asynchronous (Events)
- Notification Service (cron jobs)
- Event-driven updates
- Background processing

## Sécurité

### Authentication & Authorization
- JWT tokens gérés par Auth Service
- Middleware d'authentification dans chaque service
- Rate limiting sur l'API Gateway

### Network Security
- Communication inter-services via réseau Docker privé
- Variables d'environnement pour les secrets
- HTTPS en production

## Monitoring & Observabilité

### Logs
- Logs centralisés via Docker Compose
- Winston logger dans chaque service
- Structured logging (JSON)

### Health Checks
- Endpoint `/health` sur chaque service
- Health checks Docker
- Monitoring des dépendances

### Metrics
- Response times
- Error rates
- Throughput
- Resource utilization

## Déploiement

### Développement
```bash
make dev
```

### Production
```bash
make build
make up
```

### CI/CD
- Build automatique des images Docker
- Tests automatisés
- Déploiement blue-green possible
