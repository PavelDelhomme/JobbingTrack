-- Table collecteur Rust (monitoring/log-collector) — idempotent
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
