use std::time::{SystemTime, UNIX_EPOCH};

use crate::constants::{
    CPU_WEIGHT, HEALTHY_AVAILABILITY_PERCENT, MEMORY_WEIGHT, ONE_HUNDRED_PERCENT,
    RESPONSE_TIME_WEIGHT, SERVICE_DEGRADED_RESPONSE_MS, ZERO_FLOAT,
};
use crate::procfs::bytes_to_mib;
use crate::types::{
    ContainerMetrics, CpuMetrics, DiskMetrics, MemoryMetrics, MetricVariations, MetricsResponse,
    NetworkSummary, ServiceSummary, SystemSummary, U64,
};

pub(super) fn build_response(
    cpu: CpuMetrics,
    memory: MemoryMetrics,
    disk: DiskMetrics,
    containers: Vec<ContainerMetrics>,
) -> MetricsResponse {
    let averages = ContainerAverages::from_containers(&containers);
    let network = compute_network_summary(&containers);
    let services = compute_service_summary(&containers);
    let availability = compute_availability(&services);

    MetricsResponse {
        timestamp: current_timestamp(),
        container_count: containers.len(),
        avg_response_time_ms: averages.response_time_ms,
        avg_cpu_percent: averages.cpu_percent,
        avg_memory_percent: averages.memory_percent,
        availability_percent: availability,
        load_score: compute_load_score(
            cpu.usage_percent,
            memory.usage_percent,
            averages.response_time_ms,
        ),
        project_memory_mb: containers.iter().map(|item| item.memory_mb).sum(),
        project_cpu_avg: averages.cpu_percent,
        variations: MetricVariations::default(),
        services,
        error_rate_per_min: compute_error_rate_per_min(&containers),
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

struct ContainerAverages {
    cpu_percent: f64,
    memory_percent: f64,
    response_time_ms: f64,
}

impl ContainerAverages {
    fn from_containers(containers: &[ContainerMetrics]) -> Self {
        if containers.is_empty() {
            return Self::zero();
        }

        Self {
            cpu_percent: average(containers, |item| item.cpu_percent),
            memory_percent: average(containers, |item| item.memory_percent),
            response_time_ms: average(containers, |item| item.response_time_ms),
        }
    }

    fn zero() -> Self {
        Self {
            cpu_percent: ZERO_FLOAT,
            memory_percent: ZERO_FLOAT,
            response_time_ms: ZERO_FLOAT,
        }
    }
}

fn average(containers: &[ContainerMetrics], select: impl Fn(&ContainerMetrics) -> f64) -> f64 {
    containers.iter().map(select).sum::<f64>() / containers.len() as f64
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

fn compute_error_rate_per_min(containers: &[ContainerMetrics]) -> f64 {
    containers
        .iter()
        .filter(|item| item.http_status >= 400 || item.http_status == 0)
        .count() as f64
        * 4.0
}

fn current_timestamp() -> U64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default()
}
