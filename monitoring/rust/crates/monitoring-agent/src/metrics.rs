mod cgroup;
mod network;
mod response;

use crate::config::Config;
use crate::docker::list_containers;
use crate::health::check_containers_health;
use crate::procfs::{
    bytes_to_mib, read_cpu_metrics, read_cpu_snapshot, read_disk_metrics, read_memory_metrics,
};
use crate::storage::{HistoryQuery, Storage};
use crate::types::{CollectorState, ContainerMetrics, DockerContainer, MetricsResponse};
use cgroup::{read_container_cpu, read_container_memory, resolve_cgroup_dir};
use network::{build_container_pid_map, read_container_network};
use response::build_response;
use std::sync::Mutex;

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
            response_time_ms: 0.0,
            http_status: 0,
        }
    }
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
