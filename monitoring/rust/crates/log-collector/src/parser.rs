use chrono::{DateTime, Utc};

use crate::types::{DockerLogLine, LogEntry, WatchedLog};

pub fn parse_docker_log_line(line: &str, watch: &WatchedLog) -> Option<LogEntry> {
    let parsed = serde_json::from_str::<DockerLogLine>(line).ok()?;
    let message = parsed.log.trim_end_matches(['\n', '\r']).to_string();
    if message.is_empty() {
        return None;
    }

    let timestamp = parse_timestamp(parsed.time);
    let (level, is_error_level) = detect_level(&message);
    let response_time_ms = detect_response_time_ms(&message);
    let http_status = detect_http_status(&message);

    Some(LogEntry {
        timestamp,
        container_id: watch.container_id.clone(),
        container_name: watch.container_name.clone(),
        source: watch.container_name.clone(),
        level,
        message,
        response_time_ms,
        http_status,
        is_error: is_error_level || http_status >= 400,
    })
}

fn parse_timestamp(raw: Option<String>) -> String {
    raw.and_then(|value| DateTime::parse_from_rfc3339(&value).ok())
        .map(|dt| {
            dt.with_timezone(&Utc)
                .format("%Y-%m-%d %H:%M:%S")
                .to_string()
        })
        .unwrap_or_else(|| Utc::now().format("%Y-%m-%d %H:%M:%S").to_string())
}

fn detect_level(message: &str) -> (String, bool) {
    let lower = message.to_ascii_lowercase();
    if contains_any(&lower, ERROR_NEEDLES) {
        ("ERROR".to_string(), true)
    } else if contains_any(&lower, WARN_NEEDLES) {
        ("WARN".to_string(), false)
    } else if lower.contains("debug") {
        ("DEBUG".to_string(), false)
    } else {
        ("INFO".to_string(), false)
    }
}

fn detect_response_time_ms(message: &str) -> f64 {
    let Some(ms_pos) = message.find("ms") else {
        return 0.0;
    };
    let prefix = message[..ms_pos].trim_end();
    let start = prefix
        .rfind(|c: char| !(c.is_ascii_digit() || c == '.'))
        .map(|idx| idx + 1)
        .unwrap_or(0);
    prefix[start..].parse::<f64>().unwrap_or(0.0)
}

fn detect_http_status(message: &str) -> i32 {
    message
        .split(|c: char| !c.is_ascii_digit())
        .filter_map(|part| part.parse::<i32>().ok())
        .find(|code| (200..=599).contains(code))
        .unwrap_or(0)
}

fn contains_any(value: &str, needles: &[&str]) -> bool {
    needles.iter().any(|needle| value.contains(needle))
}

const ERROR_NEEDLES: &[&str] = &[
    "error",
    "err",
    "exception",
    "failed",
    "fatal",
    "critical",
    "unauthorized",
    "forbidden",
    "attack",
    "threat",
    "malicious",
];

const WARN_NEEDLES: &[&str] = &["warn", "warning", "suspicious"];
