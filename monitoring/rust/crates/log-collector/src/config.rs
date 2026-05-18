use std::env;
use std::path::PathBuf;
use std::time::Duration;

use crate::constants::{
    DEFAULT_LOG_DIR, DEFAULT_PORT, DEFAULT_POSTGRES_DB, DEFAULT_POSTGRES_HOST,
    DEFAULT_POSTGRES_PASSWORD, DEFAULT_POSTGRES_PORT, DEFAULT_POSTGRES_USER, DISCOVERY_ENV,
    DISCOVERY_INTERVAL_FALLBACK, DOCKER_LOG_DIR_ENV, POLL_ENV, POLL_INTERVAL_FALLBACK,
    READ_EXISTING_ENV,
};

#[derive(Clone)]
pub struct Config {
    pub port: u16,
    pub log_dir: PathBuf,
    pub read_existing: bool,
    pub discovery_interval: Duration,
    pub poll_interval: Duration,
    pub database_url: String,
}

impl Config {
    pub fn from_env() -> Self {
        let port = env::args()
            .nth(1)
            .or_else(|| env::var("PORT").ok())
            .and_then(|value| value.parse::<u16>().ok())
            .unwrap_or(DEFAULT_PORT);

        Self {
            port,
            log_dir: env::var(DOCKER_LOG_DIR_ENV)
                .map(PathBuf::from)
                .unwrap_or_else(|_| PathBuf::from(DEFAULT_LOG_DIR)),
            read_existing: env_flag(READ_EXISTING_ENV),
            discovery_interval: env_duration_secs(DISCOVERY_ENV, DISCOVERY_INTERVAL_FALLBACK),
            poll_interval: env_duration_millis(POLL_ENV, POLL_INTERVAL_FALLBACK),
            database_url: build_database_url(),
        }
    }
}

fn build_database_url() -> String {
    if let Some(url) = url_from_postgres_parts() {
        return normalize_postgres_url(&url);
    }
    let raw = env::var("DATABASE_URL").unwrap_or_else(|_| {
        let host = env::var("POSTGRES_HOST").unwrap_or_else(|_| DEFAULT_POSTGRES_HOST.to_string());
        let port = env::var("POSTGRES_PORT").unwrap_or_else(|_| DEFAULT_POSTGRES_PORT.to_string());
        let db = env::var("POSTGRES_DB").unwrap_or_else(|_| DEFAULT_POSTGRES_DB.to_string());
        let user = env::var("POSTGRES_USER").unwrap_or_else(|_| DEFAULT_POSTGRES_USER.to_string());
        let password =
            env::var("POSTGRES_PASSWORD").unwrap_or_else(|_| DEFAULT_POSTGRES_PASSWORD.to_string());
        format!(
            "postgresql://{}:{}@{host}:{port}/{}",
            encode_pg_component(&user),
            encode_pg_component(&password),
            encode_pg_component(&db),
        )
    });

    normalize_postgres_url(&raw)
}

fn url_from_postgres_parts() -> Option<String> {
    let user = env::var("POSTGRES_USER").ok()?;
    let password = env::var("POSTGRES_PASSWORD").ok()?;
    let db = env::var("POSTGRES_DB").ok()?;
    if user.is_empty() || db.is_empty() {
        return None;
    }
    let host = env::var("POSTGRES_HOST").unwrap_or_else(|_| DEFAULT_POSTGRES_HOST.to_string());
    let port = env::var("POSTGRES_PORT").unwrap_or_else(|_| DEFAULT_POSTGRES_PORT.to_string());
    Some(format!(
        "postgresql://{}:{}@{host}:{port}/{}",
        encode_pg_component(&user),
        encode_pg_component(&password),
        encode_pg_component(&db),
    ))
}

fn encode_pg_component(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for &b in s.as_bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char);
            }
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}

fn normalize_postgres_url(raw: &str) -> String {
    raw.split_once('?')
        .map(|(url, _)| url.to_string())
        .unwrap_or_else(|| raw.to_string())
}

fn env_flag(name: &str) -> bool {
    env::var(name)
        .map(|value| matches!(value.as_str(), "1" | "true" | "TRUE" | "yes" | "YES"))
        .unwrap_or(false)
}

fn env_duration_secs(name: &str, default_value: Duration) -> Duration {
    env_u64(name)
        .map(Duration::from_secs)
        .unwrap_or(default_value)
}

fn env_duration_millis(name: &str, default_value: Duration) -> Duration {
    env_u64(name)
        .map(Duration::from_millis)
        .unwrap_or(default_value)
}

fn env_u64(name: &str) -> Option<u64> {
    env::var(name).ok()?.parse::<u64>().ok()
}
