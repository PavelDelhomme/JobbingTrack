use std::collections::HashMap;

use postgres::{Client, NoTls, Row};
use serde_json::json;

use crate::config::Config;
use crate::types::LogEntry;

pub fn connect_storage(config: &Config) -> Option<Client> {
    match Client::connect(&config.database_url, NoTls) {
        Ok(mut client) => match ensure_schema(&mut client) {
            Ok(()) => Some(client),
            Err(error) => {
                eprintln!("log-collector schema error: {error}");
                None
            }
        },
        Err(error) => {
            eprintln!("log-collector PostgreSQL connection failed: {error}");
            None
        }
    }
}

pub fn store_log_entry(client: &mut Client, entry: &LogEntry) -> Result<u64, postgres::Error> {
    client.execute(
        "INSERT INTO log_collector_logs (
            timestamp, container_id, container_name, level, message, source,
            response_time_ms, http_status, is_error
        ) VALUES ($1::text::timestamp, $2, $3, $4, $5, $6, $7, $8, $9)",
        &[
            &entry.timestamp,
            &entry.container_id,
            &entry.container_name,
            &entry.level,
            &entry.message,
            &entry.source,
            &entry.response_time_ms,
            &entry.http_status,
            &entry.is_error,
        ],
    )
}

pub fn query_logs(
    config: &Config,
    params: &HashMap<String, String>,
) -> Result<String, Box<dyn std::error::Error>> {
    let filters = QueryFilters::from_params(params);
    let mut client = Client::connect(&config.database_url, NoTls)?;
    let rows = client.query(
        QUERY_LOGS_SQL,
        &[
            &filters.errors_only,
            &filters.level,
            &filters.container,
            &filters.limit,
        ],
    )?;

    let data = rows.iter().map(row_to_json).collect::<Vec<_>>();
    Ok(json!({"success": true, "data": data}).to_string())
}

struct QueryFilters {
    limit: i32,
    level: String,
    container: String,
    errors_only: bool,
}

impl QueryFilters {
    fn from_params(params: &HashMap<String, String>) -> Self {
        Self {
            limit: parse_limit(params),
            level: parse_level(params),
            container: parse_container(params),
            errors_only: parse_errors_only(params),
        }
    }
}

fn ensure_schema(client: &mut Client) -> Result<(), postgres::Error> {
    client.batch_execute(CREATE_SCHEMA_SQL)
}

fn parse_limit(params: &HashMap<String, String>) -> i32 {
    params
        .get("limit")
        .and_then(|value| value.parse::<i32>().ok())
        .filter(|value| (1..=2000).contains(value))
        .unwrap_or(100)
}

fn parse_level(params: &HashMap<String, String>) -> String {
    let level = params.get("level").cloned().unwrap_or_default();
    if matches!(
        level.to_ascii_uppercase().as_str(),
        "INFO" | "WARN" | "ERROR" | "DEBUG"
    ) {
        level.to_ascii_uppercase()
    } else {
        String::new()
    }
}

fn parse_container(params: &HashMap<String, String>) -> String {
    params
        .get("container")
        .filter(|value| {
            value
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'))
        })
        .cloned()
        .unwrap_or_default()
}

fn parse_errors_only(params: &HashMap<String, String>) -> bool {
    matches!(
        params.get("errors_only").map(String::as_str),
        Some("1") | Some("true") | Some("TRUE")
    )
}

fn row_to_json(row: &Row) -> serde_json::Value {
    json!({
        "timestamp": row.get::<_, String>(0),
        "container_id": row.get::<_, Option<String>>(1).unwrap_or_default(),
        "container_name": row.get::<_, Option<String>>(2).unwrap_or_default(),
        "level": row.get::<_, String>(3),
        "message": row.get::<_, String>(4),
        "source": row.get::<_, Option<String>>(5).unwrap_or_default(),
        "response_time_ms": parse_optional_f64(row, 6),
        "http_status": parse_optional_i32(row, 7),
        "is_error": matches!(row.get::<_, Option<String>>(8).as_deref(), Some("true") | Some("t")),
    })
}

fn parse_optional_f64(row: &Row, index: usize) -> f64 {
    row.get::<_, Option<String>>(index)
        .unwrap_or_else(|| "0".to_string())
        .parse::<f64>()
        .unwrap_or(0.0)
}

fn parse_optional_i32(row: &Row, index: usize) -> i32 {
    row.get::<_, Option<String>>(index)
        .unwrap_or_else(|| "0".to_string())
        .parse::<i32>()
        .unwrap_or(0)
}

const CREATE_SCHEMA_SQL: &str = "CREATE TABLE IF NOT EXISTS log_collector_logs (
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
CREATE INDEX IF NOT EXISTS idx_log_collector_error ON log_collector_logs(is_error) WHERE is_error = TRUE;";

const QUERY_LOGS_SQL: &str =
    "SELECT timestamp::text, container_id, container_name, level, message, source,
    response_time_ms::text, http_status::text, is_error::text
FROM log_collector_logs
WHERE ($1::boolean = false OR is_error = true)
  AND ($2::text = '' OR level = $2)
  AND ($3::text = '' OR container_name = $3)
ORDER BY timestamp DESC
LIMIT $4::integer";
