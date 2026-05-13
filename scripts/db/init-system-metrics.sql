-- Tables utilisées par monitoring-c (INSERT system_metrics).
-- Schéma public explicite pour éviter "relation public.system_metrics does not exist"
-- quand le search_path par défaut n'est pas public.

CREATE TABLE IF NOT EXISTS public.system_metrics (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,
  cpu_load_1 DOUBLE PRECISION,
  cpu_load_5 DOUBLE PRECISION,
  cpu_load_15 DOUBLE PRECISION,
  cpu_cores INTEGER,
  cpu_usage_percent DOUBLE PRECISION,
  memory_total_mb BIGINT,
  memory_used_mb BIGINT,
  memory_free_mb BIGINT,
  memory_usage_percent DOUBLE PRECISION,
  disk_total_gb DOUBLE PRECISION,
  disk_used_gb DOUBLE PRECISION,
  disk_free_gb DOUBLE PRECISION,
  disk_usage_percent DOUBLE PRECISION,
  container_count INTEGER,
  avg_response_time_ms DOUBLE PRECISION,
  avg_cpu_percent DOUBLE PRECISION,
  avg_memory_percent DOUBLE PRECISION,
  availability_percent DOUBLE PRECISION,
  load_score DOUBLE PRECISION,
  total_network_rx_bytes BIGINT,
  total_network_tx_bytes BIGINT,
  project_cpu_avg DOUBLE PRECISION,
  project_memory_mb BIGINT
);

CREATE TABLE IF NOT EXISTS public.container_metrics (
  id BIGSERIAL PRIMARY KEY,
  system_metrics_id BIGINT REFERENCES public.system_metrics(id) ON DELETE CASCADE,
  timestamp TIMESTAMP NOT NULL,
  container_name VARCHAR(256) NOT NULL,
  cpu_percent DOUBLE PRECISION,
  memory_mb BIGINT,
  memory_limit_mb BIGINT,
  memory_percent DOUBLE PRECISION,
  network_rx_bytes BIGINT,
  network_tx_bytes BIGINT,
  response_time_ms DOUBLE PRECISION,
  http_status INTEGER
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON public.system_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_container_metrics_timestamp ON public.container_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_container_metrics_name ON public.container_metrics(container_name);
CREATE INDEX IF NOT EXISTS idx_container_metrics_system_id ON public.container_metrics(system_metrics_id);

-- Table utilisée par metrics-aggregator (persistance disponibilité services).
-- Compatible schéma Prisma ServiceAvailabilityHistory.
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
