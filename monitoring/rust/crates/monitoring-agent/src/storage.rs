use crate::constants::{
    HISTORY_DEFAULT_LIMIT, HISTORY_MAX_LIMIT, HISTORY_MAX_OFFSET, POSTGRES_CONNECT_TIMEOUT_SEC,
};
use crate::types::{ContainerMetrics, MetricsResponse};
use postgres::{Client, NoTls, Row};
use serde_json::json;
use std::sync::Mutex;

pub struct Storage {
    client: Mutex<Option<Client>>,
    database_url: String,
}

impl Storage {
    pub fn new(database_url: String) -> Self {
        Self {
            client: Mutex::new(None),
            database_url,
        }
    }

    pub fn save_metrics(&self, metrics: &MetricsResponse) {
        let mut guard = self
            .client
            .lock()
            .unwrap_or_else(|error| error.into_inner());
        if let Err(error) = save_with_client(&mut guard, &self.database_url, metrics) {
            eprintln!("monitoring-agent storage save error: {error}");
            *guard = None;
        }
    }

    pub fn history(&self, query: &HistoryQuery) -> Result<String, postgres::Error> {
        let mut guard = self
            .client
            .lock()
            .unwrap_or_else(|error| error.into_inner());
        query_with_client(&mut guard, &self.database_url, query)
    }
}

pub struct HistoryQuery {
    pub limit: i64,
    pub offset: i64,
    pub start_date: String,
    pub end_date: String,
}

impl HistoryQuery {
    pub fn new(limit: i64, offset: i64, start_date: String, end_date: String) -> Self {
        Self {
            limit: normalize_limit(limit),
            offset: normalize_offset(offset),
            start_date,
            end_date,
        }
    }
}

fn save_with_client(
    client: &mut Option<Client>,
    database_url: &str,
    metrics: &MetricsResponse,
) -> Result<(), postgres::Error> {
    let client = ensure_client(client, database_url)?;
    ensure_schema(client)?;
    let system_id = insert_system_metrics(client, metrics)?;
    insert_container_metrics(client, system_id, &metrics.containers)
}

fn query_with_client(
    client: &mut Option<Client>,
    database_url: &str,
    query: &HistoryQuery,
) -> Result<String, postgres::Error> {
    let client = ensure_client(client, database_url)?;
    ensure_schema(client)?;
    let rows = client.query(
        HISTORY_SQL,
        &[
            &query.start_date,
            &query.end_date,
            &query.limit,
            &query.offset,
        ],
    )?;
    Ok(history_rows_to_json(&rows))
}

fn ensure_client<'a>(
    client: &'a mut Option<Client>,
    database_url: &str,
) -> Result<&'a mut Client, postgres::Error> {
    if client.is_none() {
        let mut new_client = Client::connect(&connect_url(database_url), NoTls)?;
        new_client.batch_execute("SET search_path TO public")?;
        *client = Some(new_client);
    }
    Ok(client.as_mut().expect("client was initialized"))
}

fn connect_url(database_url: &str) -> String {
    if database_url.contains("connect_timeout=") {
        return database_url.to_string();
    }
    format!("{database_url}?connect_timeout={POSTGRES_CONNECT_TIMEOUT_SEC}")
}

fn ensure_schema(client: &mut Client) -> Result<(), postgres::Error> {
    client.batch_execute(CREATE_SCHEMA_SQL)
}

fn insert_system_metrics(
    client: &mut Client,
    metrics: &MetricsResponse,
) -> Result<i64, postgres::Error> {
    let row = client.query_one(
        INSERT_SYSTEM_SQL,
        &[
            &metrics.cpu.load_1,
            &metrics.cpu.load_5,
            &metrics.cpu.load_15,
            &(metrics.cpu.cores as i32),
            &metrics.system.cpu_usage_percent,
            &(metrics.memory.total_mb as i64),
            &(metrics.memory.used_mb as i64),
            &(metrics.memory.free_mb as i64),
            &metrics.memory.usage_percent,
            &metrics.disk.total_gb,
            &metrics.disk.used_gb,
            &metrics.disk.free_gb,
            &metrics.disk.usage_percent,
            &(metrics.container_count as i32),
            &metrics.avg_response_time_ms,
            &metrics.avg_cpu_percent,
            &metrics.avg_memory_percent,
            &metrics.availability_percent,
            &metrics.load_score,
            &(network_rx_bytes(metrics) as i64),
            &(network_tx_bytes(metrics) as i64),
            &metrics.project_cpu_avg,
            &(metrics.project_memory_mb as i64),
        ],
    )?;
    Ok(row.get::<_, i64>(0))
}

fn insert_container_metrics(
    client: &mut Client,
    system_id: i64,
    containers: &[ContainerMetrics],
) -> Result<(), postgres::Error> {
    for container in containers {
        insert_container_metric(client, system_id, container)?;
    }
    Ok(())
}

fn insert_container_metric(
    client: &mut Client,
    system_id: i64,
    container: &ContainerMetrics,
) -> Result<u64, postgres::Error> {
    client.execute(
        INSERT_CONTAINER_SQL,
        &[
            &system_id,
            &container.name,
            &container.cpu_percent,
            &(container.memory_mb as i64),
            &(container.memory_limit_mb as i64),
            &container.memory_percent,
            &(container.network_rx_bytes as i64),
            &(container.network_tx_bytes as i64),
            &container.response_time_ms,
            &(container.http_status as i32),
        ],
    )
}

fn history_rows_to_json(rows: &[Row]) -> String {
    let data = rows.iter().map(history_row_to_json).collect::<Vec<_>>();
    json!({
        "success": true,
        "count": data.len(),
        "data": data
    })
    .to_string()
}

fn history_row_to_json(row: &Row) -> serde_json::Value {
    json!({
        "timestamp": timestamp_to_iso(row.get::<_, String>(0)),
        "cpuUsagePercent": row.get::<_, f64>(1),
        "cpu_usage_percent": row.get::<_, f64>(1),
        "cpuCores": row.get::<_, i32>(2),
        "cpuLoadAverage1m": row.get::<_, f64>(3),
        "cpuLoadAverage5m": row.get::<_, f64>(4),
        "cpuLoadAverage15m": row.get::<_, f64>(5),
        "memoryTotalMb": row.get::<_, i64>(6),
        "memoryUsedMb": row.get::<_, i64>(7),
        "memoryFreeMb": row.get::<_, i64>(8),
        "memoryUsagePercent": row.get::<_, f64>(9),
        "diskUsagePercent": row.get::<_, f64>(10),
        "containerCount": row.get::<_, i32>(11),
        "responseTimeAvg": row.get::<_, f64>(12),
        "availabilityPercent": row.get::<_, f64>(13),
        "loadScore": row.get::<_, f64>(14),
        "networkRxBytes": row.get::<_, i64>(15),
        "networkTxBytes": row.get::<_, i64>(16),
        "project_cpu_avg": row.get::<_, f64>(17),
        "project_memory_mb": row.get::<_, i64>(18)
    })
}

fn timestamp_to_iso(timestamp: String) -> String {
    if timestamp.len() >= 19 {
        return format!("{}T{}Z", &timestamp[..10], &timestamp[11..19]);
    }
    timestamp
}

fn network_rx_bytes(metrics: &MetricsResponse) -> u64 {
    metrics
        .containers
        .iter()
        .map(|container| container.network_rx_bytes)
        .sum()
}

fn network_tx_bytes(metrics: &MetricsResponse) -> u64 {
    metrics
        .containers
        .iter()
        .map(|container| container.network_tx_bytes)
        .sum()
}

fn normalize_limit(limit: i64) -> i64 {
    if limit <= 0 {
        return HISTORY_DEFAULT_LIMIT;
    }
    limit.min(HISTORY_MAX_LIMIT)
}

fn normalize_offset(offset: i64) -> i64 {
    offset.clamp(0, HISTORY_MAX_OFFSET)
}

const CREATE_SCHEMA_SQL: &str = r#"
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

const INSERT_SYSTEM_SQL: &str = r#"
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

const INSERT_CONTAINER_SQL: &str = r#"
INSERT INTO public.container_metrics (
  system_metrics_id, timestamp, container_name, cpu_percent, memory_mb,
  memory_limit_mb, memory_percent, network_rx_bytes, network_tx_bytes,
  response_time_ms, http_status
) VALUES (
  $1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10
)
"#;

const HISTORY_SQL: &str = r#"
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
