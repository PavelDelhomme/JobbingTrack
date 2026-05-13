pub(super) const CREATE_SCHEMA_SQL: &str = r#"
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
"#;

pub(super) const INSERT_SYSTEM_SQL: &str = r#"
INSERT INTO public.system_metrics (
  timestamp, cpu_load_1, cpu_load_5, cpu_load_15, cpu_cores, cpu_usage_percent,
  memory_total_mb, memory_used_mb, memory_free_mb, memory_usage_percent,
  disk_total_gb, disk_used_gb, disk_free_gb, disk_usage_percent,
  container_count, avg_response_time_ms, avg_cpu_percent, avg_memory_percent,
  availability_percent, load_score, total_network_rx_bytes, total_network_tx_bytes,
  project_cpu_avg, project_memory_mb
) VALUES (
  NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
  $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
) RETURNING id
"#;

pub(super) const INSERT_CONTAINER_SQL: &str = r#"
INSERT INTO public.container_metrics (
  system_metrics_id, timestamp, container_name, cpu_percent, memory_mb,
  memory_limit_mb, memory_percent, network_rx_bytes, network_tx_bytes,
  response_time_ms, http_status
) VALUES (
  $1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10
)
"#;

pub(super) const HISTORY_SQL: &str = r#"
SELECT timestamp::text, cpu_usage_percent, cpu_cores, cpu_load_1, cpu_load_5, cpu_load_15,
memory_total_mb, memory_used_mb, memory_free_mb, memory_usage_percent,
disk_usage_percent, container_count, avg_response_time_ms, availability_percent,
load_score, total_network_rx_bytes, total_network_tx_bytes, project_cpu_avg, project_memory_mb
FROM public.system_metrics
WHERE ($1::text = '' OR timestamp >= $1::timestamp)
  AND ($2::text = '' OR timestamp <= $2::timestamp)
ORDER BY timestamp DESC
LIMIT $3 OFFSET $4
"#;
