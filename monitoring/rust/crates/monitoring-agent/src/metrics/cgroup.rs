use std::fs;
use std::path::{Path, PathBuf};
use std::time::Instant;

use crate::config::Config;
use crate::constants::{MICROSECONDS_PER_SECOND, ONE_HUNDRED_PERCENT, ZERO_FLOAT};
use crate::procfs::{bytes_to_mib, read_memory_metrics};
use crate::types::{CollectorState, ContainerCpuSnapshot, U64};

#[derive(Default)]
pub(super) struct ContainerMemory {
    pub memory_mb: U64,
    pub memory_limit_mb: U64,
    pub memory_percent: f64,
}

pub(super) fn resolve_cgroup_dir(config: &Config, container_id: &str) -> Option<PathBuf> {
    cgroup_candidates(config, container_id)
        .into_iter()
        .find(|candidate| candidate.is_dir())
}

pub(super) fn read_container_cpu(
    cgroup_dir: &Option<PathBuf>,
    container_id: &str,
    state: &mut CollectorState,
) -> f64 {
    let Some(dir) = cgroup_dir else {
        return ZERO_FLOAT;
    };
    let Some(usage_usec) = read_usage_usec(&dir.join("cpu.stat")) else {
        return ZERO_FLOAT;
    };

    let current = ContainerCpuSnapshot {
        usage_usec,
        sampled_at: Instant::now(),
    };
    let previous = state
        .container_cpu
        .insert(container_id.to_string(), current);
    previous.map_or(ZERO_FLOAT, |old| {
        compute_container_cpu_percent(old, current)
    })
}

pub(super) fn read_container_memory(
    cgroup_dir: &Option<PathBuf>,
    config: &Config,
) -> ContainerMemory {
    let Some(dir) = cgroup_dir else {
        return ContainerMemory::default();
    };

    let current = read_u64_file(&dir.join("memory.current")).unwrap_or_default();
    let limit = read_memory_limit(&dir.join("memory.max")).or_else(|| host_memory_limit(config));
    ContainerMemory {
        memory_mb: (bytes_to_mib(current).round()) as U64,
        memory_limit_mb: limit
            .map(|value| (bytes_to_mib(value).round()) as U64)
            .unwrap_or(0),
        memory_percent: memory_percent(current, limit),
    }
}

fn cgroup_candidates(config: &Config, container_id: &str) -> Vec<PathBuf> {
    let root = config.sysfs_path.join("fs/cgroup");
    vec![
        root.join(format!("system.slice/docker-{container_id}.scope")),
        root.join("docker").join(container_id),
        root.join(format!("docker-{container_id}.scope")),
        root.join(format!(
            "system.slice/containerd.service/docker-{container_id}.scope"
        )),
    ]
}

fn compute_container_cpu_percent(
    previous: ContainerCpuSnapshot,
    current: ContainerCpuSnapshot,
) -> f64 {
    let elapsed_usec = current
        .sampled_at
        .duration_since(previous.sampled_at)
        .as_secs_f64()
        * MICROSECONDS_PER_SECOND;
    if elapsed_usec <= ZERO_FLOAT || current.usage_usec < previous.usage_usec {
        return ZERO_FLOAT;
    }
    let usage_delta = current.usage_usec - previous.usage_usec;
    usage_delta as f64 * ONE_HUNDRED_PERCENT / elapsed_usec
}

fn host_memory_limit(config: &Config) -> Option<U64> {
    let memory = read_memory_metrics(config);
    (memory.total_mb > 0).then_some(memory.total_mb * 1024 * 1024)
}

fn memory_percent(current: U64, limit: Option<U64>) -> f64 {
    limit
        .filter(|limit| *limit > 0)
        .map(|limit| current as f64 * ONE_HUNDRED_PERCENT / limit as f64)
        .unwrap_or_default()
}

fn read_usage_usec(path: &Path) -> Option<U64> {
    fs::read_to_string(path).ok()?.lines().find_map(|line| {
        let (key, value) = line.split_once(' ')?;
        (key == "usage_usec")
            .then(|| value.parse::<U64>().ok())
            .flatten()
    })
}

fn read_memory_limit(path: &Path) -> Option<U64> {
    let value = fs::read_to_string(path).ok()?;
    let value = value.trim();
    (value != "max")
        .then(|| value.parse::<U64>().ok())
        .flatten()
}

fn read_u64_file(path: &Path) -> Option<U64> {
    fs::read_to_string(path).ok()?.trim().parse::<U64>().ok()
}
