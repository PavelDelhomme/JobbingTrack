use chrono::{DateTime, Utc};
use postgres::{Client, NoTls, Row};
use serde::Deserialize;
use serde_json::json;
use std::collections::HashMap;
use std::env;
use std::fs::{self, File};
use std::io::{BufRead, BufReader, Read, Seek, SeekFrom, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const DEFAULT_PORT: u16 = 3019;
const DEFAULT_LOG_DIR: &str = "/var/lib/docker/containers";
const DEFAULT_DISCOVERY_INTERVAL_SEC: u64 = 10;
const DEFAULT_POLL_INTERVAL_MS: u64 = 2000;
const JOBBINGTRACK_PREFIX: &str = "jobbingtrack-";
const HTTP_OK: u16 = 200;
const HTTP_NOT_FOUND: u16 = 404;
const HTTP_INTERNAL_ERROR: u16 = 500;
const HTTP_NOT_IMPLEMENTED: u16 = 501;

#[derive(Clone)]
struct Config {
    port: u16,
    log_dir: PathBuf,
    read_existing: bool,
    discovery_interval: Duration,
    poll_interval: Duration,
    database_url: String,
}

#[derive(Debug)]
struct WatchedLog {
    container_id: String,
    container_name: String,
    path: PathBuf,
    position: u64,
}

#[derive(Debug)]
struct LogEntry {
    timestamp: String,
    container_id: String,
    container_name: String,
    level: String,
    message: String,
    source: String,
    response_time_ms: f64,
    http_status: i32,
    is_error: bool,
}

#[derive(Deserialize)]
struct DockerLogLine {
    log: String,
    time: Option<String>,
}

#[derive(Deserialize)]
struct DockerContainerConfig {
    #[serde(rename = "Name")]
    name: Option<String>,
}

fn main() -> std::io::Result<()> {
    let config = Arc::new(Config::from_env());
    start_http_server(Arc::clone(&config))?;
    run_collector(config)
}

impl Config {
    fn from_env() -> Self {
        let port = env::args()
            .nth(1)
            .or_else(|| env::var("PORT").ok())
            .and_then(|value| value.parse::<u16>().ok())
            .unwrap_or(DEFAULT_PORT);

        let database_url = env::var("DATABASE_URL").unwrap_or_else(|_| {
            let host = env::var("POSTGRES_HOST").unwrap_or_else(|_| "postgres".to_string());
            let port = env::var("POSTGRES_PORT").unwrap_or_else(|_| "5432".to_string());
            let db = env::var("POSTGRES_DB").unwrap_or_else(|_| "jobbingtrack".to_string());
            let user = env::var("POSTGRES_USER").unwrap_or_else(|_| "jobbingtrack".to_string());
            let password =
                env::var("POSTGRES_PASSWORD").unwrap_or_else(|_| "jobbingtrack123".to_string());
            format!("postgresql://{user}:{password}@{host}:{port}/{db}")
        });
        let database_url = normalize_postgres_url(&database_url);

        Self {
            port,
            log_dir: env::var("LOG_COLLECTOR_DOCKER_LOG_DIR")
                .map(PathBuf::from)
                .unwrap_or_else(|_| PathBuf::from(DEFAULT_LOG_DIR)),
            read_existing: env_flag("LOG_COLLECTOR_READ_EXISTING"),
            discovery_interval: Duration::from_secs(env_u64(
                "LOG_COLLECTOR_DISCOVERY_INTERVAL_SEC",
                DEFAULT_DISCOVERY_INTERVAL_SEC,
            )),
            poll_interval: Duration::from_millis(env_u64(
                "LOG_COLLECTOR_POLL_INTERVAL_MS",
                DEFAULT_POLL_INTERVAL_MS,
            )),
            database_url,
        }
    }
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

fn env_u64(name: &str, default_value: u64) -> u64 {
    env::var(name)
        .ok()
        .and_then(|value| value.parse::<u64>().ok())
        .unwrap_or(default_value)
}

fn start_http_server(config: Arc<Config>) -> std::io::Result<()> {
    let listener = TcpListener::bind(("0.0.0.0", config.port))?;
    eprintln!("log-collector Rust HTTP listening on {}", config.port);

    thread::spawn(move || {
        for stream in listener.incoming() {
            match stream {
                Ok(mut stream) => {
                    if let Err(error) = handle_request(&mut stream, &config) {
                        eprintln!("log-collector request error: {error}");
                    }
                }
                Err(error) => eprintln!("log-collector accept error: {error}"),
            }
        }
    });

    Ok(())
}

fn run_collector(config: Arc<Config>) -> std::io::Result<()> {
    eprintln!(
        "log-collector Rust scanning {} (read_existing={})",
        config.log_dir.display(),
        config.read_existing
    );

    let mut client = connect_storage(&config);
    let mut watched = HashMap::<PathBuf, WatchedLog>::new();
    let mut last_discovery = UNIX_EPOCH;

    loop {
        let now = SystemTime::now();
        if now.duration_since(last_discovery).unwrap_or_default() >= config.discovery_interval {
            discover_logs(&config, &mut watched);
            last_discovery = now;
        }

        if client.is_none() {
            client = connect_storage(&config);
        }

        for watch in watched.values_mut() {
            if let Err(error) = read_new_lines(watch, client.as_mut()) {
                eprintln!(
                    "log-collector read error for {}: {error}",
                    watch.path.display()
                );
            }
        }

        thread::sleep(config.poll_interval);
    }
}

fn connect_storage(config: &Config) -> Option<Client> {
    match Client::connect(&config.database_url, NoTls) {
        Ok(mut client) => {
            if let Err(error) = ensure_schema(&mut client) {
                eprintln!("log-collector schema error: {error}");
                None
            } else {
                Some(client)
            }
        }
        Err(error) => {
            eprintln!("log-collector PostgreSQL connection failed: {error}");
            None
        }
    }
}

fn ensure_schema(client: &mut Client) -> Result<(), postgres::Error> {
    client.batch_execute(
        "CREATE TABLE IF NOT EXISTS log_collector_logs (
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
        CREATE INDEX IF NOT EXISTS idx_log_collector_error ON log_collector_logs(is_error) WHERE is_error = TRUE;",
    )
}

fn discover_logs(config: &Config, watched: &mut HashMap<PathBuf, WatchedLog>) {
    let Ok(entries) = fs::read_dir(&config.log_dir) else {
        return;
    };

    for entry in entries.flatten() {
        let Ok(file_type) = entry.file_type() else {
            continue;
        };
        if !file_type.is_dir() {
            continue;
        }

        let container_id = entry.file_name().to_string_lossy().to_string();
        let log_path = entry.path().join(format!("{container_id}-json.log"));

        if watched.contains_key(&log_path) || !log_path.is_file() {
            continue;
        }

        let position = if config.read_existing {
            0
        } else {
            log_path
                .metadata()
                .map(|metadata| metadata.len())
                .unwrap_or(0)
        };
        let container_name =
            read_container_name(&entry.path()).unwrap_or_else(|| container_id.clone());
        if !is_jobbingtrack_container_name(&container_name) {
            continue;
        }

        watched.insert(
            log_path.clone(),
            WatchedLog {
                container_id,
                container_name,
                path: log_path,
                position,
            },
        );
    }
}

fn read_container_name(container_dir: &Path) -> Option<String> {
    let config_path = container_dir.join("config.v2.json");
    let text = fs::read_to_string(config_path).ok()?;
    let config = serde_json::from_str::<DockerContainerConfig>(&text).ok()?;
    config
        .name
        .map(|name| name.trim_start_matches('/').to_string())
}

fn is_jobbingtrack_container_name(name: &str) -> bool {
    name.contains(JOBBINGTRACK_PREFIX)
}

fn read_new_lines(watch: &mut WatchedLog, client: Option<&mut Client>) -> std::io::Result<()> {
    let metadata = fs::metadata(&watch.path)?;
    if metadata.len() < watch.position {
        watch.position = 0;
    }
    if metadata.len() == watch.position {
        return Ok(());
    }

    let mut file = File::open(&watch.path)?;
    file.seek(SeekFrom::Start(watch.position))?;
    let mut reader = BufReader::new(file);
    let mut line = String::new();
    let mut current_position = watch.position;
    let mut client = client;

    loop {
        line.clear();
        let bytes_read = reader.read_line(&mut line)?;
        if bytes_read == 0 {
            break;
        }
        current_position += bytes_read as u64;

        if let Some(entry) = parse_docker_log_line(&line, watch)
            && let Some(db) = client.as_deref_mut()
            && let Err(error) = store_log_entry(db, &entry)
        {
            eprintln!("log-collector insert error: {error}");
        }
    }

    watch.position = current_position;
    Ok(())
}

fn parse_docker_log_line(line: &str, watch: &WatchedLog) -> Option<LogEntry> {
    let parsed = serde_json::from_str::<DockerLogLine>(line).ok()?;
    let message = parsed.log.trim_end_matches(['\n', '\r']).to_string();
    if message.is_empty() {
        return None;
    }

    let timestamp = parsed
        .time
        .and_then(|raw| DateTime::parse_from_rfc3339(&raw).ok())
        .map(|dt| {
            dt.with_timezone(&Utc)
                .format("%Y-%m-%d %H:%M:%S")
                .to_string()
        })
        .unwrap_or_else(|| Utc::now().format("%Y-%m-%d %H:%M:%S").to_string());

    let (level, is_error) = detect_level(&message);
    let response_time_ms = detect_response_time_ms(&message);
    let http_status = detect_http_status(&message);
    let is_error = is_error || http_status >= 400;

    Some(LogEntry {
        timestamp,
        container_id: watch.container_id.clone(),
        container_name: watch.container_name.clone(),
        source: watch.container_name.clone(),
        level,
        message,
        response_time_ms,
        http_status,
        is_error,
    })
}

fn detect_level(message: &str) -> (String, bool) {
    let lower = message.to_ascii_lowercase();
    if [
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
    ]
    .iter()
    .any(|needle| lower.contains(needle))
    {
        ("ERROR".to_string(), true)
    } else if ["warn", "warning", "suspicious"]
        .iter()
        .any(|needle| lower.contains(needle))
    {
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

fn store_log_entry(client: &mut Client, entry: &LogEntry) -> Result<u64, postgres::Error> {
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

fn handle_request(stream: &mut TcpStream, config: &Config) -> std::io::Result<()> {
    let mut buffer = [0_u8; 4096];
    let bytes_read = stream.read(&mut buffer)?;
    let request = String::from_utf8_lossy(&buffer[..bytes_read]);

    if request.starts_with("GET /health ") || request.starts_with("GET /api/v1/health ") {
        return write_json(
            stream,
            HTTP_OK,
            r#"{"status":"ok","service":"jobbingtrack-log-collector","runtime":"rust"}"#,
        );
    }

    if request.starts_with("GET /api/v1/logs") {
        return match query_logs(config, &request) {
            Ok(body) => write_json(stream, HTTP_OK, &body),
            Err(error) => write_json(
                stream,
                HTTP_INTERNAL_ERROR,
                &json!({"success": false, "error": error.to_string()}).to_string(),
            ),
        };
    }

    write_json(stream, HTTP_NOT_FOUND, r#"{"error":"Not found"}"#)
}

fn query_logs(config: &Config, request: &str) -> Result<String, Box<dyn std::error::Error>> {
    let params = parse_query_params(request);
    let limit = params
        .get("limit")
        .and_then(|value| value.parse::<i64>().ok())
        .filter(|value| (1..=2000).contains(value))
        .unwrap_or(100);
    let level = params.get("level").cloned().unwrap_or_default();
    let level = if matches!(
        level.to_ascii_uppercase().as_str(),
        "INFO" | "WARN" | "ERROR" | "DEBUG"
    ) {
        level.to_ascii_uppercase()
    } else {
        String::new()
    };
    let container = params
        .get("container")
        .filter(|value| {
            value
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'))
        })
        .cloned()
        .unwrap_or_default();
    let errors_only = matches!(
        params.get("errors_only").map(String::as_str),
        Some("1") | Some("true") | Some("TRUE")
    );

    let mut client = Client::connect(&config.database_url, NoTls)?;
    let rows = client.query(
        "SELECT timestamp::text, container_id, container_name, level, message, source,
            response_time_ms::text, http_status::text, is_error::text
         FROM log_collector_logs
         WHERE ($1::boolean = false OR is_error = true)
           AND ($2::text = '' OR level = $2)
           AND ($3::text = '' OR container_name = $3)
         ORDER BY timestamp DESC
         LIMIT $4::integer",
        &[&errors_only, &level, &container, &(limit as i32)],
    )?;

    let data = rows.iter().map(row_to_json).collect::<Vec<_>>();
    Ok(json!({"success": true, "data": data}).to_string())
}

fn parse_query_params(request: &str) -> HashMap<String, String> {
    let path = request.split_whitespace().nth(1).unwrap_or_default();
    let Some((_, query)) = path.split_once('?') else {
        return HashMap::new();
    };

    query
        .split('&')
        .filter_map(|pair| {
            let (key, value) = pair.split_once('=')?;
            Some((key.to_string(), value.trim_end_matches(' ').to_string()))
        })
        .collect()
}

fn row_to_json(row: &Row) -> serde_json::Value {
    json!({
        "timestamp": row.get::<_, String>(0),
        "container_id": row.get::<_, Option<String>>(1).unwrap_or_default(),
        "container_name": row.get::<_, Option<String>>(2).unwrap_or_default(),
        "level": row.get::<_, String>(3),
        "message": row.get::<_, String>(4),
        "source": row.get::<_, Option<String>>(5).unwrap_or_default(),
        "response_time_ms": row.get::<_, Option<String>>(6).unwrap_or_else(|| "0".to_string()).parse::<f64>().unwrap_or(0.0),
        "http_status": row.get::<_, Option<String>>(7).unwrap_or_else(|| "0".to_string()).parse::<i32>().unwrap_or(0),
        "is_error": matches!(row.get::<_, Option<String>>(8).as_deref(), Some("true") | Some("t")),
    })
}

fn write_json(stream: &mut TcpStream, status: u16, body: &str) -> std::io::Result<()> {
    let reason = match status {
        HTTP_OK => "OK",
        HTTP_NOT_FOUND => "Not Found",
        HTTP_INTERNAL_ERROR => "Internal Server Error",
        HTTP_NOT_IMPLEMENTED => "Not Implemented",
        _ => "OK",
    };
    write!(
        stream,
        "HTTP/1.1 {status} {reason}\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    )
}
