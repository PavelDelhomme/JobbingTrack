use crate::config::Config;
use crate::constants::{BYTES_PER_MIB, ONE_HUNDRED_PERCENT};
use crate::types::{CpuMetrics, CpuSnapshot, DiskMetrics, MemoryMetrics, U64};
use std::fs;
use std::path::Path;

pub fn read_cpu_metrics(config: &Config, previous: Option<CpuSnapshot>) -> CpuMetrics {
    let loads = read_loadavg(config).unwrap_or_default();
    let current = read_cpu_snapshot(&config.procfs_path.join("stat"));
    let usage_percent = current
        .and_then(|snapshot| previous.map(|old| compute_cpu_percent(old, snapshot)))
        .unwrap_or_default();

    CpuMetrics {
        load_1: loads.0,
        load_5: loads.1,
        load_15: loads.2,
        cores: std::thread::available_parallelism()
            .map(|value| value.get())
            .unwrap_or(1),
        usage_percent,
    }
}

pub fn read_cpu_snapshot(path: &Path) -> Option<CpuSnapshot> {
    let content = fs::read_to_string(path).ok()?;
    let values = parse_cpu_values(content.lines().next()?);
    let idle = values.get(3).copied()? + values.get(4).copied().unwrap_or_default();
    let total = values.iter().copied().sum::<U64>();
    Some(CpuSnapshot { idle, total })
}

pub fn read_memory_metrics(config: &Config) -> MemoryMetrics {
    read_meminfo(&config.procfs_path.join("meminfo")).unwrap_or_default()
}

pub fn read_disk_metrics() -> DiskMetrics {
    DiskMetrics {
        total_gb: 0.0,
        used_gb: 0.0,
        free_gb: 0.0,
        usage_percent: 0.0,
    }
}

pub fn compute_cpu_percent(old: CpuSnapshot, current: CpuSnapshot) -> f64 {
    let total_delta = current.total.saturating_sub(old.total);
    let idle_delta = current.idle.saturating_sub(old.idle);
    if total_delta == 0 {
        return 0.0;
    }
    ((1.0 - (idle_delta as f64 / total_delta as f64)) * ONE_HUNDRED_PERCENT)
        .clamp(0.0, ONE_HUNDRED_PERCENT)
}

pub fn bytes_to_mib(bytes: U64) -> f64 {
    bytes as f64 / BYTES_PER_MIB
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

fn read_meminfo(path: &Path) -> Option<MemoryMetrics> {
    let content = fs::read_to_string(path).ok()?;
    let mut total_kb = 0_u64;
    let mut available_kb = 0_u64;

    for line in content.lines() {
        if let Some(value) = line.strip_prefix("MemTotal:") {
            total_kb = parse_meminfo_kb(value)?;
        }
        if let Some(value) = line.strip_prefix("MemAvailable:") {
            available_kb = parse_meminfo_kb(value)?;
        }
    }

    build_memory_metrics(total_kb, available_kb)
}

fn build_memory_metrics(total_kb: U64, available_kb: U64) -> Option<MemoryMetrics> {
    if total_kb == 0 {
        return None;
    }
    let used_kb = total_kb.saturating_sub(available_kb);
    Some(MemoryMetrics {
        total_mb: total_kb / 1024,
        used_mb: used_kb / 1024,
        free_mb: available_kb / 1024,
        usage_percent: used_kb as f64 * ONE_HUNDRED_PERCENT / total_kb as f64,
    })
}

fn parse_cpu_values(line: &str) -> Vec<U64> {
    line.split_whitespace()
        .skip(1)
        .filter_map(|part| part.parse::<U64>().ok())
        .collect()
}

fn parse_meminfo_kb(value: &str) -> Option<U64> {
    value.split_whitespace().next()?.parse::<U64>().ok()
}
