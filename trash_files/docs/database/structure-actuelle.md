# 📊 Structure Actuelle de la Base de Données

> **Note** : Cette structure inclut tous les modèles de tous les services (auth-service, metrics-aggregator-service, security-service, etc.)

**Retour** : [Index Documentation BDD](README.md)

---

## 📊 Résumé

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

## 👤 Modèles Principaux (12 modèles)

Voir [Modèles Principaux - Types Détaillés](models-principaux.md) pour les détails complets avec types de données.

### Liste des Modèles

1. **User** (Utilisateur) - Voir [Models Principaux](models-principaux.md#1-user-utilisateur)
2. **Company** (Entreprise) - Voir [Models Principaux](models-principaux.md#2-company-entreprise)
3. **Application** (Candidature) - Voir [Models Principaux](models-principaux.md#3-application-candidature)
4. **Contact** - Voir [Models Principaux](models-principaux.md#4-contact)
5. **FollowUp** (Relance) - Voir [Models Principaux](models-principaux.md#5-followup-relance)
6. **Call** (Appel) - Voir [Models Principaux](models-principaux.md#6-call-appel)
7. **Interview** (Entretien) - Voir [Models Principaux](models-principaux.md#7-interview-entretien)
8. **Event** (Événement Calendrier) - Voir [Models Principaux](models-principaux.md#8-event-événement-calendrier)
9. **Document** - Voir [Models Principaux](models-principaux.md#9-document)
10. **Notification** - Voir [Models Principaux](models-principaux.md#10-notification)
11. **ApplicationStatusHistory** (Historique des Statuts) - Voir [Models Principaux](models-principaux.md#11-applicationstatushistory-historique-des-statuts)
12. **SyncQueue** (Queue de Synchronisation Offline) - Voir [Models Principaux](models-principaux.md#12-syncqueue-queue-de-synchronisation-offline)

---

## 🔗 Tables de Jonction Many-to-Many (4 modèles)

Voir [Tables de Jonction](tables-jonction.md) pour les détails complets.

1. **ContactCompany** - Contact ↔ Company
2. **ContactApplication** - Contact ↔ Application
3. **FollowUpContact** - FollowUp ↔ Contact
4. **InterviewContact** - Interview ↔ Contact

---

## 🎨 Listes Personnalisables (7 modèles)

Voir [Listes Personnalisables](listes-personnalisables.md) pour les détails complets.

1. **Platform** (Plateformes de candidature)
2. **FollowUpType** (Types de relance)
3. **FollowUpMethod** (Moyens de relance)
4. **InterviewType** (Types d'entretien)
5. **InterviewStyle** (Styles d'entretien)
6. **EventType** (Types d'événement)
7. **CallType** (Types d'appel)

---

## 📧 Modèles Email (2 modèles - auth-service)

Voir [Modèles Email](models-email.md) pour les détails complets.

1. **EmailLog** (Logs des emails envoyés)
2. **EmailTemplate** (Templates d'emails)

---

## ⚙️ Modèles Préférences (1 modèle - auth-service)

Voir [Modèles Préférences](models-preferences.md) pour les détails complets.

1. **UserCustomization** (Préférences utilisateur)

---

## 📊 Modèles Monitoring & Métriques (10 modèles - metrics-aggregator-service)

Voir [Modèles Monitoring](models-monitoring.md) pour les détails complets.

1. **SystemMetricsSnapshot** (Snapshots métriques système)
2. **ContainerMetricsSnapshot** (Snapshots métriques conteneurs)
3. **SystemEvent** (Événements système)
4. **AggregatedLog** (Logs agrégés)
5. **ContainerLog** (Logs conteneurs Docker)
6. **ServiceNetworkHistory** (Historique réseau par service)
7. **ServiceAvailabilityHistory** (Historique disponibilité services)
8. **SecurityMetric** (Métriques de sécurité)
9. **DailyStats** (Statistiques quotidiennes pré-calculées)
10. **AlertThreshold** (Configuration des alertes)

---

## 🛡️ Modèles Sécurité (6 modèles - security-service)

Voir [Modèles Sécurité](models-securite.md) pour les détails complets.

1. **SecurityLog** (Logs de sécurité)
2. **Vulnerability** (Vulnérabilités)
3. **IntrusionAttempt** (Tentatives d'intrusion)
4. **DDoSAttack** (Attaques DDoS)
5. **SecurityAlert** (Alertes de sécurité)
6. **SecurityMetric** (Métriques de sécurité)

---

## 📋 Enums (18 enums)

Voir [Enums](enums.md) pour la liste complète.

### Enums Principaux (13)
1. **UserRole** : `USER`, `ADMIN`, `SUPER_ADMIN`, `TESTER`
2. **CompanySize** : `STARTUP`, `SMALL`, `MEDIUM`, `LARGE`, `ENTERPRISE`
3. **ContractType** : `CDI`, `CDD`, `ALTERNANCE`, `STAGE`, `FREELANCE`, `INTERIM`, `SAISONNIER`
4. **WorkMode** : `ON_SITE`, `REMOTE`, `HYBRID`
5. **ApplicationType** : `OFFRE`, `SPONTANEE`
6. **ApplicationStatus** : `CANDIDATE_PENDING`, `NO_RESPONSE`, ... (12 valeurs) → **À TRANSFORMER EN TABLE**
7. **FollowUpStatus** : `PENDING`, `POSITIVE_RESPONSE`, ... (5 valeurs) → **À TRANSFORMER EN TABLE**
8. **CallStatus** : `SCHEDULED`, `COMPLETED`, `MISSED`, `CANCELLED`
9. **InterviewStatus** : `SCHEDULED`, `COMPLETED`, ... (5 valeurs) → **À TRANSFORMER EN TABLE**
10. **InterviewOutcome** : `POSITIVE`, `NEGATIVE`, `NEUTRAL`, `PENDING`
11. **DocumentType** : `CV`, `COVER_LETTER`, `PORTFOLIO`, `CERTIFICATE`, `DIPLOMA`, `RECOMMENDATION`, `OTHER`
12. **NotificationType** : `REMINDER`, `APPLICATION_UPDATE`, `INTERVIEW_SCHEDULED`, `FOLLOWUP_DUE`, `DEADLINE`, `SYSTEM`
13. **SyncAction** : `CREATE`, `UPDATE`, `DELETE`

### Enums Email (2)
14. **EmailType** : `WELCOME`, `VERIFICATION`, `RESET_PASSWORD`, `CONFIRMATION`, `NOTIFICATION`, `TEST`
15. **EmailStatus** : `PENDING`, `SENT`, `FAILED`, `BOUNCED`

### Enums Monitoring (3)
16. **SystemEventType** : `CONTAINER_START`, `CONTAINER_STOP`, ... (22 valeurs)
17. **EventSeverity** : `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`
18. **LogLevel** : `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`

---

**Retour** : [Index Documentation BDD](README.md)

