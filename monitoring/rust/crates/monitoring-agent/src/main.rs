use serde_json::json;
use std::env;
use std::fs;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

const DEFAULT_PORT: u16 = 8015;

fn main() -> std::io::Result<()> {
    let config = Config::from_env();
    let previous_cpu = Arc::new(Mutex::new(None));

    let listener = TcpListener::bind(("0.0.0.0", config.port))?;
    eprintln!("monitoring-agent Rust listening on {}", config.port);

    for stream in listener.incoming() {
        match stream {
            Ok(mut stream) => {
                if let Err(error) = handle_request(&mut stream, &config, &previous_cpu) {
                    eprintln!("monitoring-agent request error: {error}");
                }
            }
            Err(error) => eprintln!("monitoring-agent accept error: {error}"),
        }
    }

    Ok(())
}

struct Config {
    port: u16,
    procfs_path: PathBuf,
}

#[derive(Clone, Copy)]
struct CpuSnapshot {
    idle: u64,
    total: u64,
}

fn handle_request(
    stream: &mut TcpStream,
    config: &Config,
    previous_cpu: &Arc<Mutex<Option<CpuSnapshot>>>,
) -> std::io::Result<()> {
    let mut buffer = [0_u8; 4096];
    let bytes_read = stream.read(&mut buffer)?;
    let request = String::from_utf8_lossy(&buffer[..bytes_read]);

    if request.starts_with("GET /health ") {
        return write_json(
            stream,
            200,
            r#"{"status":"ok","service":"jobbingtrack-monitoring-agent","runtime":"rust"}"#,
        );
    }

    if request.starts_with("GET /api/v1/metrics ") || request.starts_with("GET / ") {
        let metrics = collect_metrics(config, previous_cpu);
        return write_json(stream, 200, &metrics.to_string());
    }

    write_json(stream, 404, r#"{"error":"Endpoint not found"}"#)
}

impl Config {
    fn from_env() -> Self {
        Self {
            port: env::var("PORT")
                .ok()
                .and_then(|value| value.parse::<u16>().ok())
                .unwrap_or(DEFAULT_PORT),
            procfs_path: env::var("PROCFS_PATH")
                .map(PathBuf::from)
                .unwrap_or_else(|_| PathBuf::from("/proc")),
        }
    }
}

fn collect_metrics(
    config: &Config,
    previous_cpu: &Arc<Mutex<Option<CpuSnapshot>>>,
) -> serde_json::Value {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default();
    let (load_1, load_5, load_15) = read_loadavg(config).unwrap_or((0.0, 0.0, 0.0));
    let cores = std::thread::available_parallelism()
        .map(|value| value.get())
        .unwrap_or(1);
    let cpu_usage_percent = read_cpu_usage_percent(config, previous_cpu).unwrap_or(0.0);
    let memory = read_meminfo(config).unwrap_or_default();
    let disk = disk_placeholder();

    json!({
        "timestamp": timestamp,
        "cpu": {
            "load_1": load_1,
            "load_5": load_5,
            "load_15": load_15,
            "cores": cores,
            "usage_percent": cpu_usage_percent
        },
        "memory": {
            "total_mb": memory.total_mb,
            "used_mb": memory.used_mb,
            "free_mb": memory.free_mb,
            "usage_percent": memory.usage_percent
        },
        "disk": disk,
        "container_count": 0,
        "avg_response_time_ms": 0.0,
        "avg_cpu_percent": 0.0,
        "avg_memory_percent": 0.0,
        "availability_percent": 100.0,
        "load_score": (cpu_usage_percent * 0.35) + (memory.usage_percent * 0.30),
        "network": {
            "total_rx_mb": 0.0,
            "total_tx_mb": 0.0,
            "total_mb": 0.0
        },
        "project_memory_mb": 0,
        "project_cpu_avg": 0.0,
        "variations": {
            "cpu_change_percent": 0.0,
            "memory_change_percent": 0.0,
            "response_time_change_percent": 0.0,
            "availability_change_percent": 0.0
        },
        "services": {
            "healthy": 0,
            "total": 0,
            "degraded": 0,
            "offline": 0,
            "errors": 0
        },
        "error_rate_per_min": 0.0,
        "system": {
            "cpu_usage_percent": cpu_usage_percent,
            "memory_usage_percent": memory.usage_percent
        },
        "containers": []
    })
}

#[derive(Default)]
struct MemorySnapshot {
    total_mb: u64,
    used_mb: u64,
    free_mb: u64,
    usage_percent: f64,
}

fn read_loadavg(config: &Config) -> Option<(f64, f64, f64)> {
    let content = fs::read_to_string(config.procfs_path.join("loadavg")).ok()?;
    let mut parts = content.split_whitespace();
    Some((
        parts.next()?.parse().ok()?,
        parts.next()?.parse().ok()?,
        parts.next()?.parse().ok()?,
    ))
}

fn read_meminfo(config: &Config) -> Option<MemorySnapshot> {
    let content = fs::read_to_string(config.procfs_path.join("meminfo")).ok()?;
    let mut total_kb = 0_u64;
    let mut available_kb = 0_u64;

    for line in content.lines() {
        if let Some(value) = line.strip_prefix("MemTotal:") {
            total_kb = parse_meminfo_kb(value)?;
        } else if let Some(value) = line.strip_prefix("MemAvailable:") {
            available_kb = parse_meminfo_kb(value)?;
        }
    }

    if total_kb == 0 {
        return None;
    }

    let used_kb = total_kb.saturating_sub(available_kb);
    Some(MemorySnapshot {
        total_mb: total_kb / 1024,
        used_mb: used_kb / 1024,
        free_mb: available_kb / 1024,
        usage_percent: used_kb as f64 * 100.0 / total_kb as f64,
    })
}

fn parse_meminfo_kb(value: &str) -> Option<u64> {
    value.split_whitespace().next()?.parse::<u64>().ok()
}

fn read_cpu_usage_percent(
    config: &Config,
    previous_cpu: &Arc<Mutex<Option<CpuSnapshot>>>,
) -> Option<f64> {
    let content = fs::read_to_string(config.procfs_path.join("stat")).ok()?;
    let line = content.lines().next()?;
    let values = line
        .split_whitespace()
        .skip(1)
        .filter_map(|part| part.parse::<u64>().ok())
        .collect::<Vec<_>>();
    if values.len() < 4 {
        return None;
    }

    let idle = values.get(3).copied().unwrap_or(0) + values.get(4).copied().unwrap_or(0);
    let total = values.iter().copied().sum::<u64>();
    let current = CpuSnapshot { idle, total };
    let mut previous = previous_cpu.lock().ok()?;
    let percent = previous
        .map(|old| {
            let total_delta = current.total.saturating_sub(old.total);
            let idle_delta = current.idle.saturating_sub(old.idle);
            if total_delta == 0 {
                0.0
            } else {
                (1.0 - (idle_delta as f64 / total_delta as f64)) * 100.0
            }
        })
        .unwrap_or(0.0);
    *previous = Some(current);
    Some(percent.clamp(0.0, 100.0))
}

fn disk_placeholder() -> serde_json::Value {
    json!({
        "total_gb": 0.0,
        "used_gb": 0.0,
        "free_gb": 0.0,
        "usage_percent": 0.0
    })
}

fn write_json(stream: &mut TcpStream, status: u16, body: &str) -> std::io::Result<()> {
    let reason = match status {
        200 => "OK",
        404 => "Not Found",
        _ => "OK",
    };
    write!(
        stream,
        "HTTP/1.1 {status} {reason}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    )
}
