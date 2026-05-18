-- Logs centralisés (metrics-aggregator / corrélation performances)
CREATE TABLE IF NOT EXISTS aggregated_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serviceName" TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'INFO',
    message TEXT NOT NULL,
    metadata JSONB,
    "stackTrace" TEXT,
    "userId" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_aggregated_logs_timestamp ON aggregated_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_aggregated_logs_service ON aggregated_logs("serviceName");
CREATE INDEX IF NOT EXISTS idx_aggregated_logs_level ON aggregated_logs(level);
CREATE INDEX IF NOT EXISTS idx_aggregated_logs_request ON aggregated_logs("requestId");
