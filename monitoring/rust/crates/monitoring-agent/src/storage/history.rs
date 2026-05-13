use crate::constants::{HISTORY_DEFAULT_LIMIT, HISTORY_MAX_LIMIT, HISTORY_MAX_OFFSET};
use postgres::{Client, Row};
use serde_json::json;

use super::sql::HISTORY_SQL;

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

pub(super) fn query_history(
    client: &mut Client,
    query: &HistoryQuery,
) -> Result<String, postgres::Error> {
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

fn normalize_limit(limit: i64) -> i64 {
    if limit <= 0 {
        return HISTORY_DEFAULT_LIMIT;
    }
    limit.min(HISTORY_MAX_LIMIT)
}

fn normalize_offset(offset: i64) -> i64 {
    offset.clamp(0, HISTORY_MAX_OFFSET)
}
