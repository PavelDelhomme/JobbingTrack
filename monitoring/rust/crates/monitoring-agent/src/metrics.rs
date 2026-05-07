use crate::config::Config;
use crate::constants::{
    CPU_WEIGHT, HEALTHY_AVAILABILITY_PERCENT, MEMORY_WEIGHT, ONE_HUNDRED_PERCENT,
    RESPONSE_TIME_WEIGHT, SERVICE_DEGRADED_RESPONSE_MS, ZERO_FLOAT,
};
use crate::docker::list_containers;
use crate::health::check_containers_health;
use crate::procfs::{bytes_to_mib, compute_cpu_percent, read_cpu_metrics, read_cpu_snapshot};
use crate::procfs::{read_disk_metrics, read_memory_metrics};
use crate::storage::{HistoryQuery, Storage};
use crate::types::{
    CollectorState, ContainerMetrics, DiskMetrics, DockerContainer, MetricVariations,
    MetricsResponse, NetworkSummary, ServiceSummary, SystemSummary, U64,
};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

pub struct MetricsCollector {
    config: Config,
    state: Mutex<CollectorState>,
    storage: Storage,
}

impl MetricsCollector {
    pub fn new(config: Config) -> Self {
        Self {
            storage: Storage::new(config.database_url.clone()),
            config,
            state: Mutex::new(CollectorState::default()),
        }
    }

    pub fn collect(&self) -> MetricsResponse {
        let mut state = self.state.lock().unwrap_or_else(|error| error.into_inner());
        let cpu_snapshot = read_cpu_snapshot(&self.config.procfs_path.join("stat"));
        let cpu = read_cpu_metrics(&self.config, state.system_cpu);
        let memory = read_memory_metrics(&self.config);
        let disk = read_disk_metrics();
        let containers = self.collect_containers(&mut state);

        state.system_cpu = cpu_snapshot;
        let metrics = build_response(cpu, memory, disk, containers);
        self.storage.save_metrics(&metrics);
        metrics
    }

    pub fn history(&self, query: &HistoryQuery) -> Result<String, postgres::Error> {
        self.storage.history(query)
    }

    fn collect_containers(&self, state: &mut CollectorState) -> Vec<ContainerMetrics> {
        let containers = list_containers(&self.config);
        let pids = build_container_pid_map(&self.config, &containers);
        let mut metrics = containers
            .iter()
            .map(|container| self.collect_container(container, pids.get(&container.id), state))
            .collect::<Vec<_>>();
        apply_health_checks(&mut metrics);
        metrics
    }

    fn collect_container(
        &self,
        container: &DockerContainer,
        pid: Option<&i32>,
        state: &mut CollectorState,
    ) -> ContainerMetrics {
        let cgroup_dir = resolve_cgroup_dir(&self.config, &container.id);
        let cpu_percent = read_container_cpu(&cgroup_dir, &container.id, state);
        let memory = read_container_memory(&cgroup_dir, &self.config);
        let network = pid
            .and_then(|pid| read_container_network(&self.config, *pid))
            .unwrap_or_default();

        ContainerMetrics {
            name: container.name.clone(),
            cpu_percent,
            memory_mb: memory.memory_mb,
            memory_limit_mb: memory.memory_limit_mb,
            memory_percent: memory.memory_percent,
            network_rx_bytes: network.rx_bytes,
            network_tx_bytes: network.tx_bytes,
            network_rx_mb: bytes_to_mib(network.rx_bytes),
            network_tx_mb: bytes_to_mib(network.tx_bytes),
            response_time_ms: ZERO_FLOAT,
            http_status: 0,
        }
    }
}

#[derive(Default)]
struct ContainerMemory {
    memory_mb: U64,
    memory_limit_mb: U64,
    memory_percent: f64,
}

#[derive(Default)]
struct ContainerNetwork {
    rx_bytes: U64,
    tx_bytes: U64,
}

fn build_response(
    cpu: crate::types::CpuMetrics,
    memory: crate::types::MemoryMetrics,
    disk: DiskMetrics,
    containers: Vec<ContainerMetrics>,
) -> MetricsResponse {
    let averages = compute_container_averages(&containers);
    let network = compute_network_summary(&containers);
    let services = compute_service_summary(&containers);
    let availability = compute_availability(&services);
    MetricsResponse {
        timestamp: current_timestamp(),
        container_count: containers.len(),
        avg_response_time_ms: averages.2,
        avg_cpu_percent: averages.0,
        avg_memory_percent: averages.1,
        availability_percent: availability,
        load_score: compute_load_score(cpu.usage_percent, memory.usage_percent, averages.2),
        project_memory_mb: containers.iter().map(|item| item.memory_mb).sum(),
        project_cpu_avg: averages.0,
        variations: MetricVariations::default(),
        services,
        error_rate_per_min: containers
            .iter()
            .filter(|item| item.http_status >= 400 || item.http_status == 0)
            .count() as f64
            * 4.0,
        system: SystemSummary {
            cpu_usage_percent: cpu.usage_percent,
            memory_usage_percent: memory.usage_percent,
        },
        cpu,
        memory,
        disk,
        network,
        containers,
    }
}

fn compute_container_averages(containers: &[ContainerMetrics]) -> (f64, f64, f64) {
    if containers.is_empty() {
        return (ZERO_FLOAT, ZERO_FLOAT, ZERO_FLOAT);
    }
    let cpu = containers.iter().map(|item| item.cpu_percent).sum::<f64>();
    let memory = containers
        .iter()
        .map(|item| item.memory_percent)
        .sum::<f64>();
    let response_time = containers
        .iter()
        .map(|item| item.response_time_ms)
        .sum::<f64>();
    (
        cpu / containers.len() as f64,
        memory / containers.len() as f64,
        response_time / containers.len() as f64,
    )
}

fn apply_health_checks(containers: &mut [ContainerMetrics]) {
    let names = containers
        .iter()
        .map(|container| container.name.clone())
        .collect::<Vec<_>>();
    let results = check_containers_health(&names);

    for container in containers {
        if let Some(result) = results.get(&container.name) {
            container.response_time_ms = result.response_time_ms;
            container.http_status = result.http_status;
        }
    }
}

fn compute_network_summary(containers: &[ContainerMetrics]) -> NetworkSummary {
    let rx = containers
        .iter()
        .map(|item| item.network_rx_bytes)
        .sum::<U64>();
    let tx = containers
        .iter()
        .map(|item| item.network_tx_bytes)
        .sum::<U64>();
    NetworkSummary {
        total_rx_mb: bytes_to_mib(rx),
        total_tx_mb: bytes_to_mib(tx),
        total_mb: bytes_to_mib(rx + tx),
    }
}

fn compute_service_summary(containers: &[ContainerMetrics]) -> ServiceSummary {
    let mut services = ServiceSummary {
        total: containers.len(),
        ..ServiceSummary::default()
    };
    for container in containers {
        update_service_summary(container, &mut services);
    }
    services
}

fn update_service_summary(container: &ContainerMetrics, services: &mut ServiceSummary) {
    if container.http_status == 0 || container.http_status >= 500 {
        services.offline += 1;
        services.errors += 1;
        return;
    }
    if container.http_status >= 400 || container.response_time_ms > SERVICE_DEGRADED_RESPONSE_MS {
        services.degraded += 1;
        return;
    }
    services.healthy += 1;
}

fn compute_availability(services: &ServiceSummary) -> f64 {
    if services.total == 0 {
        return HEALTHY_AVAILABILITY_PERCENT;
    }
    services.healthy as f64 * ONE_HUNDRED_PERCENT / services.total as f64
}

fn compute_load_score(cpu: f64, memory: f64, response_time_ms: f64) -> f64 {
    let response_score = (response_time_ms / 10.0).clamp(ZERO_FLOAT, ONE_HUNDRED_PERCENT);
    ((cpu * CPU_WEIGHT) + (memory * MEMORY_WEIGHT) + (response_score * RESPONSE_TIME_WEIGHT))
        .clamp(ZERO_FLOAT, ONE_HUNDRED_PERCENT)
}

fn current_timestamp() -> U64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default()
}

fn resolve_cgroup_dir(config: &Config, container_id: &str) -> Option<PathBuf> {
    cgroup_candidates(config, container_id)
        .into_iter()
        .find(|candidate| candidate.is_dir())
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

fn read_container_cpu(
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
    let current = crate::types::CpuSnapshot {
        idle: 0,
        total: usage_usec,
    };
    let previous = state
        .container_cpu
        .insert(container_id.to_string(), current);
    previous.map_or(ZERO_FLOAT, |old| compute_cpu_percent(old, current))
}

fn read_container_memory(cgroup_dir: &Option<PathBuf>, config: &Config) -> ContainerMemory {
    let Some(dir) = cgroup_dir else {
        return ContainerMemory::default();
    };
    let current = read_u64_file(&dir.join("memory.current")).unwrap_or_default();
    let limit = read_memory_limit(&dir.join("memory.max")).or_else(|| host_memory_limit(config));
    let memory_percent = limit
        .filter(|limit| *limit > 0)
        .map(|limit| current as f64 * ONE_HUNDRED_PERCENT / limit as f64)
        .unwrap_or_default();
    ContainerMemory {
        memory_mb: (bytes_to_mib(current).round()) as U64,
        memory_limit_mb: limit
            .map(|value| (bytes_to_mib(value).round()) as U64)
            .unwrap_or(0),
        memory_percent,
    }
}

fn host_memory_limit(config: &Config) -> Option<U64> {
    let memory = read_memory_metrics(config);
    (memory.total_mb > 0).then_some(memory.total_mb * 1024 * 1024)
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

fn build_container_pid_map(
    config: &Config,
    containers: &[DockerContainer],
) -> HashMap<String, i32> {
    let mut pids = HashMap::new();
    let Ok(entries) = fs::read_dir(&config.procfs_path) else {
        return pids;
    };
    for entry in entries.flatten() {
        collect_pid_match(&config.procfs_path, &entry.path(), containers, &mut pids);
    }
    pids
}

fn collect_pid_match(
    procfs_path: &Path,
    pid_path: &Path,
    containers: &[DockerContainer],
    pids: &mut HashMap<String, i32>,
) {
    let Some(pid) = pid_from_path(pid_path) else {
        return;
    };
    let cgroup_path = procfs_path.join(pid.to_string()).join("cgroup");
    let Ok(cgroup) = fs::read_to_string(cgroup_path) else {
        return;
    };
    for container in containers {
        if cgroup.contains(&container.id) {
            pids.entry(container.id.clone()).or_insert(pid);
        }
    }
}

fn pid_from_path(path: &Path) -> Option<i32> {
    path.file_name()?.to_string_lossy().parse::<i32>().ok()
}

fn read_container_network(config: &Config, pid: i32) -> Option<ContainerNetwork> {
    let content =
        fs::read_to_string(config.procfs_path.join(pid.to_string()).join("net/dev")).ok()?;
    let mut network = ContainerNetwork::default();
    for line in content.lines().skip(2) {
        add_network_line(line, &mut network);
    }
    Some(network)
}

fn add_network_line(line: &str, network: &mut ContainerNetwork) {
    let Some((iface, stats)) = line.split_once(':') else {
        return;
    };
    if iface.trim() == "lo" {
        return;
    }
    let values = stats.split_whitespace().collect::<Vec<_>>();
    network.rx_bytes += values
        .first()
        .and_then(|value| value.parse().ok())
        .unwrap_or(0);
    network.tx_bytes += values
        .get(8)
        .and_then(|value| value.parse().ok())
        .unwrap_or(0);
}
