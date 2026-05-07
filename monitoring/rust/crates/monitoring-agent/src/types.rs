use serde::Serialize;
use std::collections::HashMap;

pub type U64 = u64;

#[derive(Clone, Copy)]
pub struct CpuSnapshot {
    pub idle: U64,
    pub total: U64,
}

#[derive(Clone, Copy, Default, Serialize)]
pub struct CpuMetrics {
    pub load_1: f64,
    pub load_5: f64,
    pub load_15: f64,
    pub cores: usize,
    pub usage_percent: f64,
}

#[derive(Clone, Copy, Default, Serialize)]
pub struct MemoryMetrics {
    pub total_mb: U64,
    pub used_mb: U64,
    pub free_mb: U64,
    pub usage_percent: f64,
}

#[derive(Clone, Copy, Default, Serialize)]
pub struct DiskMetrics {
    pub total_gb: f64,
    pub used_gb: f64,
    pub free_gb: f64,
    pub usage_percent: f64,
}

#[derive(Clone, Default, Serialize)]
pub struct ContainerMetrics {
    pub name: String,
    pub cpu_percent: f64,
    pub memory_mb: U64,
    pub memory_limit_mb: U64,
    pub memory_percent: f64,
    pub network_rx_bytes: U64,
    pub network_tx_bytes: U64,
    pub network_rx_mb: f64,
    pub network_tx_mb: f64,
    pub response_time_ms: f64,
    pub http_status: u16,
}

#[derive(Default, Serialize)]
pub struct NetworkSummary {
    pub total_rx_mb: f64,
    pub total_tx_mb: f64,
    pub total_mb: f64,
}

#[derive(Default, Serialize)]
pub struct MetricVariations {
    pub cpu_change_percent: f64,
    pub memory_change_percent: f64,
    pub response_time_change_percent: f64,
    pub availability_change_percent: f64,
}

#[derive(Default, Serialize)]
pub struct ServiceSummary {
    pub healthy: usize,
    pub total: usize,
    pub degraded: usize,
    pub offline: usize,
    pub errors: usize,
}

#[derive(Default, Serialize)]
pub struct SystemSummary {
    pub cpu_usage_percent: f64,
    pub memory_usage_percent: f64,
}

#[derive(Serialize)]
pub struct MetricsResponse {
    pub timestamp: U64,
    pub cpu: CpuMetrics,
    pub memory: MemoryMetrics,
    pub disk: DiskMetrics,
    pub container_count: usize,
    pub avg_response_time_ms: f64,
    pub avg_cpu_percent: f64,
    pub avg_memory_percent: f64,
    pub availability_percent: f64,
    pub load_score: f64,
    pub network: NetworkSummary,
    pub project_memory_mb: U64,
    pub project_cpu_avg: f64,
    pub variations: MetricVariations,
    pub services: ServiceSummary,
    pub error_rate_per_min: f64,
    pub system: SystemSummary,
    pub containers: Vec<ContainerMetrics>,
}

#[derive(Clone)]
pub struct DockerContainer {
    pub id: String,
    pub name: String,
}

#[derive(Default)]
pub struct CollectorState {
    pub system_cpu: Option<CpuSnapshot>,
    pub container_cpu: HashMap<String, CpuSnapshot>,
}
