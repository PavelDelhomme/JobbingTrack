-- Tables requises pour le check "status" (make status) : monitoring/sécurité.
-- Création IF NOT EXISTS pour que db-push-all garantisse toujours 3/3 sans dépendre
-- uniquement du push Prisma auth-service (qui peut être incomplet selon l'image).

-- security_logs (schéma compatible Prisma SecurityLog)
CREATE TABLE IF NOT EXISTS security_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level VARCHAR(20) NOT NULL,
  category VARCHAR(50) NOT NULL,
  "eventType" VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  "sourceIP" VARCHAR(45),
  "userAgent" TEXT,
  "userId" VARCHAR(100),
  endpoint VARCHAR(500),
  method VARCHAR(10),
  "statusCode" INTEGER,
  "responseTime" INTEGER,
  country VARCHAR(2),
  city VARCHAR(100),
  "riskScore" DOUBLE PRECISION,
  "isBlocked" BOOLEAN NOT NULL DEFAULT false,
  "blockReason" TEXT,
  metadata JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_security_logs_timestamp ON security_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_logs_createdAt ON security_logs("createdAt");

-- system_metrics_snapshots (schéma compatible Prisma SystemMetricsSnapshot) – public. pour éviter "relation public.system_metrics_snapshots does not exist"
CREATE TABLE IF NOT EXISTS public.system_metrics_snapshots (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "cpuUsagePercent" DOUBLE PRECISION NOT NULL,
  "cpuCores" INTEGER NOT NULL,
  "cpuLoadAverage1m" DOUBLE PRECISION,
  "cpuLoadAverage5m" DOUBLE PRECISION,
  "cpuLoadAverage15m" DOUBLE PRECISION,
  "memoryUsagePercent" DOUBLE PRECISION NOT NULL,
  "memoryUsedBytes" BIGINT NOT NULL,
  "memoryTotalBytes" BIGINT NOT NULL,
  "memoryFreeBytes" BIGINT NOT NULL,
  "diskUsagePercent" DOUBLE PRECISION,
  "diskUsedBytes" BIGINT,
  "diskTotalBytes" BIGINT,
  "diskFreeBytes" BIGINT,
  "networkRxBytes" BIGINT,
  "networkTxBytes" BIGINT,
  "availabilityPercent" DOUBLE PRECISION,
  "loadScore" DOUBLE PRECISION,
  "errorCount" INTEGER,
  "errorRate" DOUBLE PRECISION,
  "responseTimeAvg" DOUBLE PRECISION,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_system_metrics_snapshots_timestamp ON public.system_metrics_snapshots(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_metrics_snapshots_createdAt ON public.system_metrics_snapshots("createdAt");

-- container_metrics_snapshots (metrics-aggregator) – public. pour éviter "relation public.container_metrics_snapshots does not exist"
CREATE TABLE IF NOT EXISTS public.container_metrics_snapshots (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "containerName" TEXT NOT NULL,
  "containerId" TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  "cpuUsagePercent" DOUBLE PRECISION,
  "cpuUsageNano" BIGINT,
  "memoryUsagePercent" DOUBLE PRECISION,
  "memoryUsageBytes" BIGINT,
  "memoryLimitBytes" BIGINT,
  "networkRxBytes" BIGINT,
  "networkTxBytes" BIGINT,
  "blockReadBytes" BIGINT,
  "blockWriteBytes" BIGINT,
  image TEXT,
  labels JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_container_metrics_snapshots_timestamp ON public.container_metrics_snapshots(timestamp);
CREATE INDEX IF NOT EXISTS idx_container_metrics_snapshots_containerName ON public.container_metrics_snapshots("containerName");
CREATE INDEX IF NOT EXISTS idx_container_metrics_snapshots_createdAt ON public.container_metrics_snapshots("createdAt");

-- network_connections (security-service / métriques réseau) - évite "relation does not exist"
CREATE TABLE IF NOT EXISTS network_connections (
  id TEXT PRIMARY KEY,
  "sourceIp" VARCHAR(45) NOT NULL,
  "destIp" VARCHAR(45) NOT NULL,
  "sourcePort" INTEGER NOT NULL,
  "destPort" INTEGER NOT NULL,
  protocol VARCHAR(10) NOT NULL,
  state VARCHAR(20) NOT NULL,
  "containerId" VARCHAR(100),
  "containerName" VARCHAR(200),
  "bytesRx" BIGINT NOT NULL DEFAULT 0,
  "bytesTx" BIGINT NOT NULL DEFAULT 0,
  "packetsRx" INTEGER NOT NULL DEFAULT 0,
  "packetsTx" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_network_connections_createdAt ON network_connections("createdAt");

-- network_threats (security-service / firewall menaces) - évite "relation does not exist"
CREATE TABLE IF NOT EXISTS network_threats (
  id TEXT PRIMARY KEY,
  "threatType" VARCHAR(50) NOT NULL,
  "sourceIp" VARCHAR(45) NOT NULL,
  "destIp" VARCHAR(45),
  "destPort" INTEGER,
  severity VARCHAR(20) NOT NULL,
  "detectedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_network_threats_detectedAt ON network_threats("detectedAt");
CREATE INDEX IF NOT EXISTS idx_network_threats_createdAt ON network_threats("createdAt");

-- security_alerts (security-service / auth-service schéma étendu) - évite "relation does not exist"
CREATE TABLE IF NOT EXISTS security_alerts (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level VARCHAR(20) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  source VARCHAR(100) NOT NULL,
  "isAcknowledged" BOOLEAN NOT NULL DEFAULT false,
  "acknowledgedBy" VARCHAR(100),
  "acknowledgedAt" TIMESTAMPTZ,
  "resolvedAt" TIMESTAMPTZ,
  metadata JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_security_alerts_timestamp ON security_alerts(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_alerts_createdAt ON security_alerts("createdAt");

-- firewall_rules (security-service / auth-service schéma étendu) - évite "relation does not exist"
CREATE TABLE IF NOT EXISTS firewall_rules (
  id TEXT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  "sourceIp" VARCHAR(45),
  "destPort" INTEGER,
  protocol VARCHAR(10) NOT NULL,
  action VARCHAR(10) NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  enabled BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_firewall_rules_priority ON firewall_rules(priority);
CREATE INDEX IF NOT EXISTS idx_firewall_rules_createdAt ON firewall_rules("createdAt");

-- vulnerabilities (security-service) - évite "relation public.vulnerabilities does not exist"
CREATE TABLE IF NOT EXISTS vulnerabilities (
  id TEXT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL,
  "cveId" VARCHAR(50),
  "cvssScore" DOUBLE PRECISION,
  "affectedComponent" VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL,
  "discoveredAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "resolvedAt" TIMESTAMPTZ,
  "assignedTo" VARCHAR(100),
  remediation TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON vulnerabilities(severity);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_createdAt ON vulnerabilities("createdAt");

-- security_metrics (security-service / metrics-aggregator) - évite "relation public.security_metrics does not exist"
CREATE TABLE IF NOT EXISTS security_metrics (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "metricType" VARCHAR(50) NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  unit VARCHAR(20) NOT NULL,
  period VARCHAR(20) NOT NULL,
  metadata JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_security_metrics_timestamp ON security_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_metrics_metricType ON security_metrics("metricType");

-- deployments (deployment-service) - évite "relation public.deployments does not exist"
CREATE TABLE IF NOT EXISTS deployments (
  id TEXT PRIMARY KEY,
  version VARCHAR(50) NOT NULL,
  environment VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  "startTime" TIMESTAMP NOT NULL,
  "endTime" TIMESTAMP,
  duration INTEGER,
  "commitHash" VARCHAR(40),
  branch VARCHAR(100),
  "triggeredBy" VARCHAR(100),
  "rollbackFromId" TEXT,
  "rollbackReason" TEXT,
  logs JSONB,
  metrics JSONB,
  "buildTime" INTEGER,
  "testTime" INTEGER,
  "deployTime" INTEGER,
  "downtimeDuration" INTEGER,
  "errorRate" DOUBLE PRECISION,
  "responseTime" DOUBLE PRECISION,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_deployments_createdAt ON deployments("createdAt");

-- deployment_metrics (deployment-service, FK deployments)
CREATE TABLE IF NOT EXISTS deployment_metrics (
  id TEXT PRIMARY KEY,
  "deploymentId" TEXT NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "metricType" VARCHAR(50) NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  unit VARCHAR(20) NOT NULL,
  metadata JSONB
);
CREATE INDEX IF NOT EXISTS idx_deployment_metrics_deploymentId ON deployment_metrics("deploymentId");

-- rollbacks (deployment-service, FK deployments)
CREATE TABLE IF NOT EXISTS rollbacks (
  id TEXT PRIMARY KEY,
  "deploymentId" TEXT NOT NULL REFERENCES deployments(id),
  "previousDeploymentId" TEXT NOT NULL,
  reason TEXT NOT NULL,
  "triggeredBy" VARCHAR(100),
  status VARCHAR(20) NOT NULL,
  "startTime" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "endTime" TIMESTAMPTZ,
  duration INTEGER
);
CREATE INDEX IF NOT EXISTS idx_rollbacks_deploymentId ON rollbacks("deploymentId");

-- LogLevel enum + container_logs (metrics-aggregator + log collector) – évite "cache lookup failed for type"
DO $$ BEGIN
  CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS container_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "containerName" TEXT NOT NULL,
  "containerId" TEXT,
  stream TEXT NOT NULL DEFAULT 'stdout',
  log TEXT NOT NULL,
  "parsedLevel" "LogLevel",
  "parsedMessage" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_container_logs_timestamp ON container_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_container_logs_containerName ON container_logs("containerName");
CREATE INDEX IF NOT EXISTS idx_container_logs_createdAt ON container_logs("createdAt");

-- log_collector_logs (log-collector Rust/C) – évite "relation log_collector_logs does not exist"
-- Table dédiée, volontairement distincte de container_logs (schéma Prisma metrics-aggregator).
CREATE TABLE IF NOT EXISTS log_collector_logs (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,
  container_id VARCHAR(64),
  container_name VARCHAR(256),
  level VARCHAR(16) NOT NULL,
  message TEXT NOT NULL,
  source VARCHAR(128),
  response_time_ms DOUBLE PRECISION DEFAULT 0,
  http_status INTEGER DEFAULT 0,
  is_error BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_log_collector_timestamp ON log_collector_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_log_collector_level ON log_collector_logs(level);
CREATE INDEX IF NOT EXISTS idx_log_collector_container ON log_collector_logs(container_name);
CREATE INDEX IF NOT EXISTS idx_log_collector_error ON log_collector_logs(is_error) WHERE is_error = TRUE;

-- aggregated_logs (metrics-aggregator) – évite "relation public.aggregated_logs does not exist"
CREATE TABLE IF NOT EXISTS aggregated_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "serviceName" TEXT NOT NULL,
  level "LogLevel" NOT NULL DEFAULT 'INFO',
  message TEXT NOT NULL,
  metadata JSONB,
  "stackTrace" TEXT,
  "userId" TEXT,
  "requestId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aggregated_logs_timestamp ON aggregated_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_aggregated_logs_serviceName ON aggregated_logs("serviceName");
CREATE INDEX IF NOT EXISTS idx_aggregated_logs_level ON aggregated_logs(level);
CREATE INDEX IF NOT EXISTS idx_aggregated_logs_createdAt ON aggregated_logs("createdAt");

-- EmailType + EmailStatus enums + EmailLog + EmailTemplate (auth-service emails) – évite "relation public.EmailLog / EmailTemplate does not exist"
DO $$ BEGIN
  CREATE TYPE "EmailType" AS ENUM ('WELCOME', 'VERIFICATION', 'RESET_PASSWORD', 'CONFIRMATION', 'NOTIFICATION', 'TEST');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'BOUNCED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS "EmailLog" (
  id TEXT PRIMARY KEY,
  "userId" TEXT,
  "to" TEXT NOT NULL,
  "from" TEXT NOT NULL,
  subject TEXT NOT NULL,
  type "EmailType" NOT NULL,
  status "EmailStatus" NOT NULL DEFAULT 'PENDING',
  "sentAt" TIMESTAMPTZ,
  "deliveredAt" TIMESTAMPTZ,
  "openedAt" TIMESTAMPTZ,
  "clickedAt" TIMESTAMPTZ,
  error TEXT,
  "emailContent" TEXT,
  metadata JSONB,
  "trackingId" TEXT UNIQUE,
  "openCount" INTEGER NOT NULL DEFAULT 0,
  "clickCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_emaillog_userId ON "EmailLog"("userId");
CREATE INDEX IF NOT EXISTS idx_emaillog_to ON "EmailLog"("to");
CREATE INDEX IF NOT EXISTS idx_emaillog_type ON "EmailLog"(type);
CREATE INDEX IF NOT EXISTS idx_emaillog_status ON "EmailLog"(status);
CREATE INDEX IF NOT EXISTS idx_emaillog_sentAt ON "EmailLog"("sentAt");
CREATE INDEX IF NOT EXISTS idx_emaillog_createdAt ON "EmailLog"("createdAt");
CREATE INDEX IF NOT EXISTS idx_emaillog_trackingId ON "EmailLog"("trackingId");

CREATE TABLE IF NOT EXISTS "EmailTemplate" (
  id TEXT PRIMARY KEY,
  type "EmailType" NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  "htmlContent" TEXT NOT NULL,
  "textContent" TEXT,
  variables TEXT[] DEFAULT '{}',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_emailtemplate_type ON "EmailTemplate"(type);
CREATE INDEX IF NOT EXISTS idx_emailtemplate_isActive ON "EmailTemplate"("isActive");

-- UserCustomization (auth-service préférences) – évite "relation public.UserCustomization does not exist"
CREATE TABLE IF NOT EXISTS "UserCustomization" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  settings JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_usercustomization_userId ON "UserCustomization"("userId");

-- Colonnes User manquantes (auth-service) – évite "column User.verificationToken / loginCount does not exist"
-- Exécuté après les 9 Prisma db push (workflow-service peut avoir un User simplifié et ne pas les créer).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'User') THEN
    BEGIN
      ALTER TABLE "User" ADD COLUMN "verificationToken" TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
    BEGIN
      ALTER TABLE "User" ADD COLUMN "verificationTokenExpiry" TIMESTAMPTZ;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
    BEGIN
      ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMPTZ;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
    BEGIN
      ALTER TABLE "User" ADD COLUMN "loginCount" INTEGER NOT NULL DEFAULT 0;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
  END IF;
END $$;
