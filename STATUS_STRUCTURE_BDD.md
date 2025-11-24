**📊 Structure Actuelle Complète de la Base de Données** (selon `backend/prisma/schema.prisma` et schémas des services - Schéma Prisma réel) :

> **Note** : Cette structure inclut tous les modèles de tous les services (auth-service, metrics-aggregator-service, security-service, etc.)

### 👤 Modèles Principaux (12 modèles)

#### 1. **User** (Utilisateur)
- **Champs** :
  - `id` : String (CUID, @id, @default(cuid()))
  - `email` : String (unique, indexé)
  - `password` : String (hashé)
  - `firstName` : String
  - `lastName` : String
  - `phone` : String? (optionnel)
  - `profilePicture` : String? (URL, optionnel)
- **Authentification** :
  - `authToken` : String? (JWT, optionnel)
  - `refreshToken` : String? (optionnel)
  - `tokenExpiresAt` : DateTime? (optionnel)
  - `resetToken` : String? (optionnel)
  - `resetTokenExpiry` : DateTime? (optionnel)
  - `emailVerified` : Boolean (@default(false))
  - `emailVerifiedAt` : DateTime? (optionnel)
- **Rôle/Statut** :
  - `role` : UserRole (enum: USER, ADMIN, SUPER_ADMIN, TESTER, @default(USER), indexé)
  - `isActive` : Boolean (@default(true), indexé)
  - `lastLoginAt` : DateTime? (optionnel)
- **Préférences** :
  - `theme` : String? (@default("light"))
  - `language` : String? (@default("fr"))
  - `timezone` : String? (@default("Europe/Paris"))
  - `notificationsEnabled` : Boolean (@default(true))
- **Timestamps** :
  - `createdAt` : DateTime (@default(now()))
  - `updatedAt` : DateTime (@updatedAt)
  - `deletedAt` : DateTime? (soft delete, optionnel)
- **Synchronisation** :
  - `syncHash` : String? (hash pour synchronisation, optionnel)
  - `entityHash` : String? (hash de l'entité, optionnel)
  - `lastSyncAt` : DateTime? (dernière synchronisation, optionnel)
- **Relations** : 
  - → `Application[]` (1:N) - `applications`
  - → `Company[]` (1:N) - `companies`
  - → `Contact[]` (1:N) - `contacts`
  - → `FollowUp[]` (1:N) - `followUps`
  - → `Call[]` (1:N) - `calls`
  - → `Interview[]` (1:N) - `interviews`
  - → `Event[]` (1:N) - `events`
  - → `Notification[]` (1:N) - `notifications`
  - → `Document[]` (1:N) - `documents`
  - → `SyncQueue[]` (1:N) - `syncQueue`

#### 2. **Company** (Entreprise)
- **Champs** :
  - `id` : String (CUID, @id, @default(cuid()))
  - `userId` : String (FK vers User, indexé, onDelete: Cascade)
  - `name` : String (indexé)
  - `website` : String? (URL, optionnel)
  - `industry` : String? (secteur d'activité, optionnel)
  - `size` : CompanySize? (enum: STARTUP, SMALL, MEDIUM, LARGE, ENTERPRISE, optionnel)
  - `location` : String? (optionnel)
  - `address` : String? (optionnel)
  - `city` : String? (optionnel)
  - `postalCode` : String? (optionnel)
  - `country` : String? (@default("France"), optionnel)
  - `logoUrl` : String? (URL, optionnel)
  - `description` : String? (optionnel)
- **Timestamps** :
  - `createdAt` : DateTime (@default(now()))
  - `updatedAt` : DateTime (@updatedAt)
  - `deletedAt` : DateTime? (soft delete, optionnel)
- **Synchronisation** :
  - `syncHash` : String? (hash pour synchronisation, optionnel)
  - `entityHash` : String? (hash de l'entité, optionnel)
  - `lastSyncAt` : DateTime? (dernière synchronisation, optionnel)
- **Relations** :
  - ← `User` (N:1) - `user` (FK: userId)
  - → `Application[]` (1:N) - `applications`
  - → `ContactCompany[]` (M:N avec Contact) - `contacts`
  - → `FollowUp[]` (1:N) - `followUps`
  - → `Call[]` (1:N) - `calls`
  - → `Interview[]` (1:N) - `interviews`

#### 3. **Application** (Candidature)
- **Champs** :
  - `id` : String (CUID, @id, @default(cuid()))
  - `userId` : String (FK vers User, indexé, onDelete: Cascade)
  - `companyId` : String (FK vers Company, indexé)
  - `platformId` : String? (FK vers Platform, optionnel, indexé)
  - `position` : String (intitulé du poste)
  - `description` : String? (description du poste, optionnel)
  - `jobUrl` : String? (URL de l'offre, optionnel)
  - `location` : String? (lieu du poste, optionnel)
  - `contractType` : ContractType (enum: CDI, CDD, ALTERNANCE, STAGE, FREELANCE, INTERIM, SAISONNIER, @default(CDI))
  - `workMode` : WorkMode? (enum: ON_SITE, REMOTE, HYBRID, optionnel)
  - `applicationDate` : DateTime (@default(now()), indexé)
  - `applicationType` : ApplicationType (enum: OFFRE, SPONTANEE, @default(OFFRE))
  - `status` : ApplicationStatus (enum, @default(CANDIDATE_PENDING), indexé) → **À TRANSFORMER EN FK vers ApplicationStatus (table)**
  - `salaryMin` : Int? (en euros/an, optionnel)
  - `salaryMax` : Int? (en euros/an, optionnel)
  - `salaryNegotiable` : Boolean (@default(false))
  - `notes` : String? (optionnel)
  - `archived` : Boolean (@default(false))
  - `archivedAt` : DateTime? (optionnel)
- **Timestamps** :
  - `createdAt` : DateTime (@default(now()))
  - `updatedAt` : DateTime (@updatedAt)
  - `deletedAt` : DateTime? (soft delete, optionnel)
- **Synchronisation** :
  - `syncHash` : String? (hash pour synchronisation, optionnel)
  - `entityHash` : String? (hash de l'entité, optionnel)
  - `lastSyncAt` : DateTime? (dernière synchronisation, optionnel)
- **Relations** :
  - ← `User` (N:1) - `user` (FK: userId)
  - ← `Company` (N:1) - `company` (FK: companyId)
  - ← `Platform` (N:1, optionnel) - `platform` (FK: platformId)
  - → `ContactApplication[]` (M:N avec Contact) - `contacts`
  - → `FollowUp[]` (1:N) - `followUps`
  - → `Call[]` (1:N) - `calls`
  - → `Interview[]` (1:N) - `interviews`
  - → `Event[]` (1:N) - `events`
  - → `Document[]` (1:N) - `documents`
  - → `ApplicationStatusHistory[]` (1:N) - `statusHistory`

#### 4. **Contact**
- **Champs** : `id`, `userId`, `firstName`, `lastName`, `position`, `email`, `phone`, `linkedinUrl`, `notes`, `isArchived`, `archivedAt`, `archivedReason`
- **Timestamps** : `createdAt`, `updatedAt`, `deletedAt`
- **Relations** :
  - ← `User` (N:1)
  - → `ContactCompany[]` (M:N avec Company)
  - → `ContactApplication[]` (M:N avec Application)
  - → `FollowUpContact[]` (M:N avec FollowUp)
  - → `InterviewContact[]` (M:N avec Interview)
  - → `Call[]` (1:N)

#### 5. **FollowUp** (Relance)
- **Champs** :
  - `id` : String (CUID, @id, @default(cuid()))
  - `userId` : String (FK vers User, indexé, onDelete: Cascade)
  - `applicationId` : String (FK vers Application, indexé, onDelete: Cascade)
  - `companyId` : String (FK vers Company, indexé)
  - `followUpTypeId` : String? (FK vers FollowUpType, optionnel)
  - `followUpMethodId` : String? (FK vers FollowUpMethod, optionnel)
  - `followUpDate` : DateTime (indexé)
  - `status` : FollowUpStatus (enum, @default(PENDING), indexé) → **À TRANSFORMER EN FK vers FollowUpStatus (table)**
  - `response` : String? (réponse reçue, optionnel)
  - `notes` : String? (optionnel)
- **Timestamps** :
  - `createdAt` : DateTime (@default(now()))
  - `updatedAt` : DateTime (@updatedAt)
  - `deletedAt` : DateTime? (soft delete, optionnel)
- **Synchronisation** :
  - `syncHash` : String? (hash pour synchronisation, optionnel) → **À AJOUTER**
  - `entityHash` : String? (hash de l'entité, optionnel) → **À AJOUTER**
  - `lastSyncAt` : DateTime? (dernière synchronisation, optionnel) → **À AJOUTER**
- **Relations** :
  - ← `User` (N:1) - `user` (FK: userId)
  - ← `Application` (N:1) - `application` (FK: applicationId)
  - ← `Company` (N:1) - `company` (FK: companyId)
  - ← `FollowUpType` (N:1, optionnel) - `followUpType` (FK: followUpTypeId)
  - ← `FollowUpMethod` (N:1, optionnel) - `followUpMethod` (FK: followUpMethodId)
  - → `FollowUpContact[]` (M:N avec Contact) - `contacts`
  - → `Call[]` (1:N) - `calls`
  - → `Event[]` (1:N) - `events`

#### 6. **Call** (Appel)
- **Champs** :
  - `id` : String (CUID, @id, @default(cuid()))
  - `userId` : String (FK vers User, indexé, onDelete: Cascade)
  - `applicationId` : String? (FK vers Application, optionnel, onDelete: SetNull)
  - `companyId` : String? (FK vers Company, optionnel, onDelete: SetNull)
  - `followUpId` : String? (FK vers FollowUp, optionnel, onDelete: SetNull)
  - `contactId` : String? (FK vers Contact, optionnel, onDelete: SetNull)
  - `callTypeId` : String? (FK vers CallType, optionnel)
  - `callDate` : DateTime (indexé)
  - `duration` : Int? (durée en minutes, optionnel)
  - `subject` : String (objet de l'appel)
  - `notes` : String? (optionnel)
  - `status` : CallStatus (enum: SCHEDULED, COMPLETED, MISSED, CANCELLED, @default(COMPLETED), indexé)
- **Timestamps** :
  - `createdAt` : DateTime (@default(now()))
  - `updatedAt` : DateTime (@updatedAt)
  - `deletedAt` : DateTime? (soft delete, optionnel)
- **Synchronisation** :
  - `syncHash` : String? (hash pour synchronisation, optionnel) → **À AJOUTER**
  - `entityHash` : String? (hash de l'entité, optionnel) → **À AJOUTER**
  - `lastSyncAt` : DateTime? (dernière synchronisation, optionnel) → **À AJOUTER**
- **Relations** :
  - ← `User` (N:1) - `user` (FK: userId)
  - ← `Application` (N:1, optionnel) - `application` (FK: applicationId)
  - ← `Company` (N:1, optionnel) - `company` (FK: companyId)
  - ← `FollowUp` (N:1, optionnel) - `followUp` (FK: followUpId)
  - ← `Contact` (N:1, optionnel) - `contact` (FK: contactId)
  - ← `CallType` (N:1, optionnel) - `callType` (FK: callTypeId)
  - → `Event[]` (1:N) - `events`

#### 7. **Interview** (Entretien)
- **Champs** :
  - `id` : String (CUID, @id, @default(cuid()))
  - `userId` : String (FK vers User, indexé, onDelete: Cascade)
  - `applicationId` : String (FK vers Application, indexé, onDelete: Cascade)
  - `companyId` : String (FK vers Company, indexé)
  - `interviewTypeId` : String? (FK vers InterviewType, optionnel)
  - `interviewStyleId` : String? (FK vers InterviewStyle, optionnel)
  - `interviewDate` : DateTime (indexé)
  - `estimatedDuration` : Int? (durée estimée en minutes, optionnel)
  - `location` : String? (lieu physique, optionnel)
  - `videoLink` : String? (lien visio, optionnel)
  - `status` : InterviewStatus (enum, @default(SCHEDULED), indexé) → **À TRANSFORMER EN FK vers InterviewStatus (table)**
  - `feedbackExpectedFrom` : DateTime? (début plage de retour, optionnel)
  - `feedbackExpectedTo` : DateTime? (fin plage de retour, optionnel)
  - `feedbackReceived` : Boolean (@default(false))
  - `outcome` : InterviewOutcome? (enum: POSITIVE, NEGATIVE, NEUTRAL, PENDING, optionnel)
  - `notes` : String? (optionnel)
- **Timestamps** :
  - `createdAt` : DateTime (@default(now()))
  - `updatedAt` : DateTime (@updatedAt)
  - `deletedAt` : DateTime? (soft delete, optionnel)
- **Synchronisation** :
  - `syncHash` : String? (hash pour synchronisation, optionnel) → **À AJOUTER**
  - `entityHash` : String? (hash de l'entité, optionnel) → **À AJOUTER**
  - `lastSyncAt` : DateTime? (dernière synchronisation, optionnel) → **À AJOUTER**
- **Relations** :
  - ← `User` (N:1) - `user` (FK: userId)
  - ← `Application` (N:1) - `application` (FK: applicationId)
  - ← `Company` (N:1) - `company` (FK: companyId)
  - ← `InterviewType` (N:1, optionnel) - `interviewType` (FK: interviewTypeId)
  - ← `InterviewStyle` (N:1, optionnel) - `interviewStyle` (FK: interviewStyleId)
  - → `InterviewContact[]` (M:N avec Contact) - `contacts`
  - → `Event[]` (1:N) - `events`

#### 8. **Event** (Événement Calendrier)
- **Champs** : `id`, `userId`, `eventTypeId`, `title`, `description`, `startDate`, `endDate`, `allDay`, `applicationId`, `interviewId`, `followUpId`, `callId` (lien polymorphe), `reminderEnabled`, `reminderMinutes`, `color`
- **Timestamps** : `createdAt`, `updatedAt`, `deletedAt`
- **Relations** :
  - ← `User` (N:1)
  - ← `EventType` (N:1, optionnel)
  - ← `Application` (N:1, optionnel - lien polymorphe)
  - ← `Interview` (N:1, optionnel - lien polymorphe)
  - ← `FollowUp` (N:1, optionnel - lien polymorphe)
  - ← `Call` (N:1, optionnel - lien polymorphe)

#### 9. **Document**
- **Champs** : `id`, `userId`, `applicationId`, `name`, `documentType` (DocumentType), `fileUrl`, `fileSize`, `mimeType`
- **Timestamps** : `createdAt`, `updatedAt`, `deletedAt`
- **Relations** :
  - ← `User` (N:1)
  - ← `Application` (N:1, optionnel)

#### 10. **Notification**
- **Champs** : `id`, `userId`, `title`, `message`, `type` (NotificationType), `read`, `readAt`, `entityType`, `entityId`, `data` (Json)
- **Timestamps** : `createdAt`
- **Relations** :
  - ← `User` (N:1)

#### 11. **ApplicationStatusHistory** (Historique des Statuts)
- **Champs** : `id`, `applicationId`, `previousStatus` (ApplicationStatus), `newStatus` (ApplicationStatus), `comment`, `changedAt`
- **Relations** :
  - ← `Application` (N:1)

#### 12. **SyncQueue** (Queue de Synchronisation Offline)
- **Champs** : `id`, `userId`, `action` (SyncAction), `entity`, `entityId`, `payload` (Json), `synced`, `attempts`, `lastAttempt`, `error`, `createdAt`, `syncedAt`
- **Relations** :
  - ← `User` (N:1)

### 🔗 Tables de Jonction Many-to-Many (4 modèles)

#### 1. **ContactCompany**
- **Champs** : `id`, `contactId`, `companyId`, `createdAt`
- **Contraintes** : `@@unique([contactId, companyId])`

#### 2. **ContactApplication**
- **Champs** : `id`, `contactId`, `applicationId`, `createdAt`
- **Contraintes** : `@@unique([contactId, applicationId])`

#### 3. **FollowUpContact**
- **Champs** : `id`, `followUpId`, `contactId`, `createdAt`
- **Contraintes** : `@@unique([followUpId, contactId])`

#### 4. **InterviewContact**
- **Champs** : `id`, `interviewId`, `contactId`, `createdAt`
- **Contraintes** : `@@unique([interviewId, contactId])`

### 🎨 Listes Personnalisables (7 modèles)

#### 1. **Platform** (Plateformes de candidature)
- **Champs** : `id`, `userId` (null = système), `name`, `icon`, `url`, `isPredefined`
- **Contraintes** : `@@unique([userId, name])`

#### 2. **FollowUpType** (Types de relance)
- **Champs** : `id`, `userId` (null = système), `name`, `icon`, `isPredefined`

#### 3. **FollowUpMethod** (Moyens de relance)
- **Champs** : `id`, `userId` (null = système), `name`, `icon`, `isPredefined`

#### 4. **InterviewType** (Types d'entretien)
- **Champs** : `id`, `userId` (null = système), `name`, `icon`, `isPredefined`

#### 5. **InterviewStyle** (Styles d'entretien)
- **Champs** : `id`, `userId` (null = système), `name`, `icon`, `isPredefined`

#### 6. **EventType** (Types d'événement)
- **Champs** : `id`, `userId` (null = système), `name`, `color`, `icon`, `isPredefined`

#### 7. **CallType** (Types d'appel)
- **Champs** : `id`, `userId` (null = système), `name`, `icon`, `isPredefined`

### 📧 Modèles Email (2 modèles - auth-service)

#### 1. **EmailLog** (Logs des emails envoyés)
- **Champs** : `id`, `userId`, `to`, `from`, `subject`, `type` (EmailType), `status` (EmailStatus), `sentAt`, `error`, `emailContent`, `metadata` (Json)
- **Timestamps** : `createdAt`, `updatedAt`
- **Relations** :
  - ← `User` (N:1, optionnel)

#### 2. **EmailTemplate** (Templates d'emails)
- **Champs** : `id`, `type` (EmailType, unique), `name`, `subject`, `htmlContent`, `textContent`, `variables` (String[]), `isActive`, `version`
- **Timestamps** : `createdAt`, `updatedAt`

### ⚙️ Modèles Préférences (1 modèle - auth-service)

#### 1. **UserCustomization** (Préférences utilisateur)
- **Champs** : `id`, `userId` (unique), `settings` (Json)
- **Timestamps** : `createdAt`, `updatedAt`

### 📊 Modèles Monitoring & Métriques (10 modèles - metrics-aggregator-service)

#### 1. **SystemMetricsSnapshot** (Snapshots métriques système)
- **Champs** : `id`, `timestamp`, `cpuUsagePercent`, `cpuCores`, `cpuLoadAverage1m/5m/15m`, `memoryUsagePercent`, `memoryUsedBytes`, `memoryTotalBytes`, `memoryFreeBytes`, `diskUsagePercent`, `diskUsedBytes`, `diskTotalBytes`, `diskFreeBytes`, `networkRxBytes`, `networkTxBytes`, `availabilityPercent`, `loadScore`, `errorCount`, `errorRate`, `responseTimeAvg`

#### 2. **ContainerMetricsSnapshot** (Snapshots métriques conteneurs)
- **Champs** : `id`, `timestamp`, `containerName`, `containerId`, `status`, `cpuUsagePercent`, `cpuUsageNano`, `memoryUsagePercent`, `memoryUsageBytes`, `memoryLimitBytes`, `networkRxBytes`, `networkTxBytes`, `blockReadBytes`, `blockWriteBytes`, `image`, `labels` (Json)

#### 3. **SystemEvent** (Événements système)
- **Champs** : `id`, `timestamp`, `type` (SystemEventType), `severity` (EventSeverity), `source`, `title`, `description`, `metadata` (Json), `isAlert`, `isResolved`, `resolvedAt`

#### 4. **AggregatedLog** (Logs agrégés)
- **Champs** : `id`, `timestamp`, `serviceName`, `level` (LogLevel), `message`, `metadata` (Json), `stackTrace`, `userId`, `requestId`

#### 5. **ContainerLog** (Logs conteneurs Docker)
- **Champs** : `id`, `timestamp`, `containerName`, `containerId`, `stream`, `log`, `parsedLevel` (LogLevel), `parsedMessage`

#### 6. **ServiceNetworkHistory** (Historique réseau par service)
- **Champs** : `id`, `timestamp`, `serviceName`, `requestCount`, `successCount`, `errorCount`, `avgResponseTimeMs`, `minResponseTimeMs`, `maxResponseTimeMs`, `p95ResponseTimeMs`, `p99ResponseTimeMs`, `bytesReceived`, `bytesSent`, `topEndpoints` (Json)

#### 7. **ServiceAvailabilityHistory** (Historique disponibilité services)
- **Champs** : `id`, `timestamp`, `serviceName`, `isAvailable`, `responseTimeMs`, `statusCode`, `errorMessage`, `uptimePercent`

#### 8. **SecurityMetric** (Métriques de sécurité)
- **Champs** : `id`, `timestamp`, `failedLoginAttempts`, `successfulLogins`, `blockedIPs` (Json), `suspiciousActivities`, `potentialSqlInjections`, `potentialXssAttempts`, `rateLimitExceeded`, `invalidTokenAttempts`, `securityScore`, `activeSecurityAlerts`

#### 9. **DailyStats** (Statistiques quotidiennes pré-calculées)
- **Champs** : `id`, `date` (unique), `avgCpuUsagePercent`, `maxCpuUsagePercent`, `avgMemoryUsagePercent`, `maxMemoryUsagePercent`, `avgDiskUsagePercent`, `totalContainers`, `runningContainers`, `stoppedContainers`, `totalEvents`, `totalAlerts`, `unresolvedAlerts`, `totalLogs`, `errorLogs`, `warningLogs`, `totalNetworkRxBytes`, `totalNetworkTxBytes`

#### 10. **AlertThreshold** (Configuration des alertes)
- **Champs** : `id`, `name` (unique), `description`, `metricType`, `warningThreshold`, `criticalThreshold`, `targetType`, `targetName`, `isEnabled`, `notifyEmail`, `notifySlack`

### 🛡️ Modèles Sécurité (6 modèles - security-service)

#### 1. **SecurityLog** (Logs de sécurité)
- **Champs** : `id`, `timestamp`, `level`, `category`, `eventType`, `message`, `sourceIP`, `userAgent`, `userId`, `endpoint`, `method`, `statusCode`, `responseTime`, `country`, `city`, `riskScore`, `isBlocked`, `blockReason`, `metadata` (Json)

#### 2. **Vulnerability** (Vulnérabilités)
- **Champs** : `id`, `title`, `description`, `severity`, `cveId`, `cvssScore`, `affectedComponent`, `status`, `discoveredAt`, `resolvedAt`, `assignedTo`, `remediation`, `tags` (String[]), `metadata` (Json)

#### 3. **IntrusionAttempt** (Tentatives d'intrusion)
- **Champs** : `id`, `timestamp`, `sourceIP`, `country`, `city`, `attackType`, `targetEndpoint`, `method`, `userAgent`, `payload`, `riskScore`, `isBlocked`, `blockReason`, `metadata` (Json)

#### 4. **DDoSAttack** (Attaques DDoS)
- **Champs** : `id`, `timestamp`, `sourceIPs` (String[]), `countries` (String[]), `attackType`, `targetEndpoint`, `duration`, `totalRequests`, `requestsPerSecond`, `isMitigated`, `mitigationTime`, `metadata` (Json)

#### 5. **SecurityAlert** (Alertes de sécurité)
- **Champs** : `id`, `timestamp`, `level`, `title`, `description`, `category`, `source`, `isAcknowledged`, `acknowledgedBy`, `acknowledgedAt`, `resolvedAt`, `metadata` (Json)

#### 6. **SecurityMetric** (Métriques de sécurité)
- **Champs** : `id`, `timestamp`, `metricType`, `value`, `unit`, `period`, `metadata` (Json)

### 📋 Enums (18 enums)

#### Enums Principaux (13) :
1. **UserRole** : `USER`, `ADMIN`, `SUPER_ADMIN`, `TESTER`
2. **CompanySize** : `STARTUP`, `SMALL`, `MEDIUM`, `LARGE`, `ENTERPRISE`
3. **ContractType** : `CDI`, `CDD`, `ALTERNANCE`, `STAGE`, `FREELANCE`, `INTERIM`, `SAISONNIER`
4. **WorkMode** : `ON_SITE`, `REMOTE`, `HYBRID`
5. **ApplicationType** : `OFFRE`, `SPONTANEE`
6. **ApplicationStatus** : `CANDIDATE_PENDING`, `NO_RESPONSE`, `NO_RESPONSE_AFTER_FIRST_FOLLOWUP`, `NO_RESPONSE_AFTER_SECOND_FOLLOWUP`, `FIRST_INTERVIEW_PENDING`, `OTHER_INTERVIEW_PENDING`, `TECHNICAL_TEST_PENDING`, `OFFER_RECEIVED`, `ACCEPTED_AFTER_INTERVIEW`, `REJECTED_WITHOUT_INTERVIEW`, `REJECTED_AFTER_INTERVIEW`, `WITHDRAWN`
7. **FollowUpStatus** : `PENDING`, `POSITIVE_RESPONSE`, `NEGATIVE_RESPONSE`, `NO_RESPONSE`, `PLANNED`
8. **CallStatus** : `SCHEDULED`, `COMPLETED`, `MISSED`, `CANCELLED`
9. **InterviewStatus** : `SCHEDULED`, `COMPLETED`, `FEEDBACK_PENDING`, `CANCELLED`, `RESCHEDULED`
10. **InterviewOutcome** : `POSITIVE`, `NEGATIVE`, `NEUTRAL`, `PENDING`
11. **DocumentType** : `CV`, `COVER_LETTER`, `PORTFOLIO`, `CERTIFICATE`, `DIPLOMA`, `RECOMMENDATION`, `OTHER`
12. **NotificationType** : `REMINDER`, `APPLICATION_UPDATE`, `INTERVIEW_SCHEDULED`, `FOLLOWUP_DUE`, `DEADLINE`, `SYSTEM`
13. **SyncAction** : `CREATE`, `UPDATE`, `DELETE`

#### Enums Email (2) :
14. **EmailType** : `WELCOME`, `VERIFICATION`, `RESET_PASSWORD`, `CONFIRMATION`, `NOTIFICATION`, `TEST`
15. **EmailStatus** : `PENDING`, `SENT`, `FAILED`, `BOUNCED`

#### Enums Monitoring (3) :
16. **SystemEventType** : `CONTAINER_START`, `CONTAINER_STOP`, `CONTAINER_RESTART`, `CONTAINER_ERROR`, `SERVICE_START`, `SERVICE_STOP`, `SERVICE_ERROR`, `SYSTEM_BOOT`, `SYSTEM_SHUTDOWN`, `HIGH_CPU_USAGE`, `HIGH_MEMORY_USAGE`, `HIGH_DISK_USAGE`, `NETWORK_ERROR`, `DATABASE_ERROR`, `BACKUP_COMPLETED`, `BACKUP_FAILED`, `DEPLOYMENT_START`, `DEPLOYMENT_SUCCESS`, `DEPLOYMENT_FAILED`, `ALERT_TRIGGERED`, `ALERT_RESOLVED`, `OTHER`
17. **EventSeverity** : `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`
18. **LogLevel** : `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`

### 📊 Résumé Structure Actuelle Complète

- **Modèles principaux** : 12
- **Tables de jonction** : 4
- **Listes personnalisables** : 7
- **Modèles Email** : 2
- **Modèles Préférences** : 1
- **Modèles Monitoring** : 10
- **Modèles Sécurité** : 6
- **Total modèles** : **42 modèles Prisma**
- **Enums** : **18 enums**
- **Relations 1:N** : 20+
- **Relations M:N** : 4 (via tables de jonction)

---

**📝 Structure Souhaitée de la Base de Données** (Spécifications utilisateur) :

> **Note** : Cette section documente la structure de base de données souhaitée pour la partie applicative (non administrative).

### 📋 Modèles Requis pour la Partie Applicative

Les modèles suivants doivent être présents pour la gestion des données applicatives :

#### Modèles Principaux :
- ✅ **Application** (Candidature) - Déjà présent
- ✅ **Company** (Entreprise) - Déjà présent
- ✅ **Contact** - Déjà présent
- ✅ **Interview** (Entretien) - Déjà présent
- ✅ **Call** (Appel) - Déjà présent
- ✅ **FollowUp** (Relance) - Déjà présent
- ✅ **Platform** (Plateforme de candidature) - Déjà présent

#### Modèles de Configuration :
- ✅ **CallType** (Types d'appel) - Déjà présent
- ✅ **InterviewType** (Types d'entretien) - Déjà présent
- ⚠️ **PlatformType** - **À AJOUTER** (nouveau modèle pour types de plateformes)

#### Statuts et États :
- ✅ **ApplicationStatus** (Enum) - Déjà présent
- ✅ **InterviewStatus** (Enum) - Déjà présent
- ✅ **FollowUpStatus** (Enum) - Déjà présent

### 🎯 Système de Statuts Personnalisables par Utilisateur

**Spécification importante** : Les statuts doivent pouvoir être définis à deux niveaux :

1. **Statuts par défaut (système)** :
   - Définis initialement par le système
   - Disponibles pour tous les utilisateurs
   - Non modifiables par les utilisateurs
   - Identifiés par `userId = null` ou `isPredefined = true`

2. **Statuts personnalisés (utilisateur)** :
   - Définis par chaque utilisateur individuellement
   - Uniques à chaque utilisateur
   - Modifiables et supprimables par l'utilisateur qui les a créés
   - Identifiés par `userId` spécifique et `isPredefined = false`

#### Modèles à Modifier/Créer :

##### 1. **ApplicationStatus** (Enum → Modèle)
- **Transformation** : Convertir l'enum `ApplicationStatus` en modèle `ApplicationStatus` (table)
- **Champs** :
  - `id` (String, @id)
  - `userId` (String?, nullable pour statuts système)
  - `name` (String) - Nom du statut
  - `code` (String) - Code unique (ex: "CANDIDATE_PENDING")
  - `description` (String?) - Description du statut
  - `color` (String?) - Couleur d'affichage
  - `icon` (String?) - Icône
  - `order` (Int) - Ordre d'affichage
  - `isPredefined` (Boolean, @default(false)) - Statut système ou utilisateur
  - `isActive` (Boolean, @default(true)) - Statut actif ou non
  - `createdAt` (DateTime, @default(now()))
  - `updatedAt` (DateTime, @updatedAt)
- **Contraintes** :
  - `@@unique([userId, code])` - Code unique par utilisateur
  - `@@unique([userId, name])` - Nom unique par utilisateur
- **Relations** :
  - ← `User` (N:1, optionnel)
  - → `Application[]` (1:N)

##### 2. **InterviewStatus** (Enum → Modèle)
- **Transformation** : Convertir l'enum `InterviewStatus` en modèle `InterviewStatus` (table)
- **Champs** : Similaires à `ApplicationStatus`
- **Relations** :
  - ← `User` (N:1, optionnel)
  - → `Interview[]` (1:N)

##### 3. **FollowUpStatus** (Enum → Modèle)
- **Transformation** : Convertir l'enum `FollowUpStatus` en modèle `FollowUpStatus` (table)
- **Champs** : Similaires à `ApplicationStatus`
- **Relations** :
  - ← `User` (N:1, optionnel)
  - → `FollowUp[]` (1:N)

##### 4. **PlatformType** (Nouveau Modèle)
- **Champs** :
  - `id` (String, @id)
  - `userId` (String?, nullable pour types système)
  - `name` (String) - Nom du type (ex: "Réseau social", "Site emploi", "Cabinet recrutement")
  - `description` (String?) - Description
  - `icon` (String?) - Icône
  - `isPredefined` (Boolean, @default(false))
  - `createdAt` (DateTime, @default(now()))
  - `updatedAt` (DateTime, @updatedAt)
- **Contraintes** :
  - `@@unique([userId, name])`
- **Relations** :
  - ← `User` (N:1, optionnel)
  - → `Platform[]` (1:N) - Relation avec Platform pour catégoriser les plateformes

##### 5. **Modifications aux Modèles Existants** :

**Application** :
- Modifier `status` : `ApplicationStatus` (enum) → `applicationStatusId` (String, FK vers `ApplicationStatus`)
- Relation : ← `ApplicationStatus` (N:1)

**Interview** :
- Modifier `status` : `InterviewStatus` (enum) → `interviewStatusId` (String, FK vers `InterviewStatus`)
- Relation : ← `InterviewStatus` (N:1)

**FollowUp** :
- Modifier `status` : `FollowUpStatus` (enum) → `followUpStatusId` (String, FK vers `FollowUpStatus`)
- Relation : ← `FollowUpStatus` (N:1)

**Platform** :
- Ajouter `platformTypeId` (String?, FK vers `PlatformType`)
- Relation : ← `PlatformType` (N:1, optionnel)

### 📊 Résumé des Modifications Nécessaires

**Modèles à créer** :
- ✅ `ApplicationStatus` (table) - Conversion depuis enum
- ✅ `InterviewStatus` (table) - Conversion depuis enum
- ✅ `FollowUpStatus` (table) - Conversion depuis enum
- ✅ `PlatformType` (table) - Nouveau modèle

**Modèles à modifier** :
- ✅ `Application` - Remplacer enum par FK vers `ApplicationStatus`
- ✅ `Interview` - Remplacer enum par FK vers `InterviewStatus`
- ✅ `FollowUp` - Remplacer enum par FK vers `FollowUpStatus`
- ✅ `Platform` - Ajouter FK vers `PlatformType`

**Enums à supprimer** :
- ❌ `ApplicationStatus` (enum) → Remplacé par modèle
- ❌ `InterviewStatus` (enum) → Remplacé par modèle
- ❌ `FollowUpStatus` (enum) → Remplacé par modèle

**Fonctionnalités requises** :
- ✅ Système de statuts par défaut (système) avec `userId = null` ou `isPredefined = true`
- ✅ Système de statuts personnalisés par utilisateur avec `userId` spécifique
- ✅ Gestion CRUD des statuts personnalisés par utilisateur
- ✅ Interface utilisateur pour créer/modifier/supprimer ses statuts personnalisés
- ✅ Migration des données existantes (enum → table avec statuts système)
Je dois avoir les élément suivant concernant au moins la partie applicative et non administrative des données
a savoir je dois avoir normalement efectivement les modèle suivant : 
- Application
- Company
- Contact
- Interview
- Call
- CallType
- InterviewType
- InterviewStatus
- ApplicationStatus
- FollowUp
- FollowUp Status
- Platform
- PlatformType

Il faut donc avoir la possibilité de définir des status par défaut (système définit initialement), et des status que l'utilisateur aura définit cela sera relier et définit uniquement pour cette utilisateur
