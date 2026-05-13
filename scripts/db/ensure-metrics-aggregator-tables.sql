-- Tables requises par metrics-aggregator (persistance snapshots + disponibilité).
-- Exécuté en fin de db-push-all pour garantir que le service reste healthy même si
-- init-system-metrics ou init-key-tables ont échoué partiellement.
-- Compatible schéma Prisma metrics-aggregator (system_metrics_snapshots, container_metrics_snapshots, service_availability_history).

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

CREATE TABLE IF NOT EXISTS public.service_availability_history (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "serviceName" TEXT NOT NULL,
  "isAvailable" BOOLEAN NOT NULL,
  "responseTimeMs" INTEGER,
  "statusCode" INTEGER,
  "errorMessage" TEXT,
  "uptimePercent" DOUBLE PRECISION,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_service_availability_history_timestamp ON public.service_availability_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_service_availability_history_serviceName ON public.service_availability_history("serviceName");
CREATE INDEX IF NOT EXISTS idx_service_availability_history_isAvailable ON public.service_availability_history("isAvailable");
CREATE INDEX IF NOT EXISTS idx_service_availability_history_createdAt ON public.service_availability_history("createdAt");
