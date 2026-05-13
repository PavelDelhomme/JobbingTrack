mod history;
mod sql;

pub use history::HistoryQuery;

use crate::constants::POSTGRES_CONNECT_TIMEOUT_SEC;
use crate::types::{ContainerMetrics, MetricsResponse};
use postgres::{Client, NoTls};
use std::sync::Mutex;

use history::query_history;
use sql::{CREATE_SCHEMA_SQL, INSERT_CONTAINER_SQL, INSERT_SYSTEM_SQL};

pub struct Storage {
    client: Mutex<Option<Client>>,
    database_url: String,
}

impl Storage {
    pub fn new(database_url: String) -> Self {
        Self {
            client: Mutex::new(None),
            database_url,
        }
    }

    pub fn save_metrics(&self, metrics: &MetricsResponse) {
        let mut guard = self
            .client
            .lock()
            .unwrap_or_else(|error| error.into_inner());
        if let Err(error) = save_with_client(&mut guard, &self.database_url, metrics) {
            eprintln!("monitoring-agent storage save error: {error}");
            *guard = None;
        }
    }

    pub fn history(&self, query: &HistoryQuery) -> Result<String, postgres::Error> {
        let mut guard = self
            .client
            .lock()
            .unwrap_or_else(|error| error.into_inner());
        let client = ensure_client(&mut guard, &self.database_url)?;
        ensure_schema(client)?;
        query_history(client, query)
    }
}

fn save_with_client(
    client: &mut Option<Client>,
    database_url: &str,
    metrics: &MetricsResponse,
) -> Result<(), postgres::Error> {
    let client = ensure_client(client, database_url)?;
    ensure_schema(client)?;
    let system_id = insert_system_metrics(client, metrics)?;
    insert_container_metrics(client, system_id, &metrics.containers)
}

fn ensure_client<'a>(
    client: &'a mut Option<Client>,
    database_url: &str,
) -> Result<&'a mut Client, postgres::Error> {
    if client.is_none() {
        let mut new_client = Client::connect(&connect_url(database_url), NoTls)?;
        new_client.batch_execute("SET search_path TO public")?;
        *client = Some(new_client);
    }
    Ok(client.as_mut().expect("client was initialized"))
}

fn connect_url(database_url: &str) -> String {
    if database_url.contains("connect_timeout=") {
        return database_url.to_string();
    }
    format!("{database_url}?connect_timeout={POSTGRES_CONNECT_TIMEOUT_SEC}")
}

fn ensure_schema(client: &mut Client) -> Result<(), postgres::Error> {
    client.batch_execute(CREATE_SCHEMA_SQL)
}

fn insert_system_metrics(
    client: &mut Client,
    metrics: &MetricsResponse,
) -> Result<i64, postgres::Error> {
    let cpu_cores = metrics.cpu.cores as i32;
    let memory_total_mb = metrics.memory.total_mb as i64;
    let memory_used_mb = metrics.memory.used_mb as i64;
    let memory_free_mb = metrics.memory.free_mb as i64;
    let container_count = metrics.container_count as i32;
    let total_network_rx_bytes = network_rx_bytes(metrics) as i64;
    let total_network_tx_bytes = network_tx_bytes(metrics) as i64;
    let project_memory_mb = metrics.project_memory_mb as i64;

    let row = client.query_one(
        INSERT_SYSTEM_SQL,
        &[
            &metrics.cpu.load_1,
            &metrics.cpu.load_5,
            &metrics.cpu.load_15,
            &cpu_cores,
            &metrics.system.cpu_usage_percent,
            &memory_total_mb,
            &memory_used_mb,
            &memory_free_mb,
            &metrics.memory.usage_percent,
            &metrics.disk.total_gb,
            &metrics.disk.used_gb,
            &metrics.disk.free_gb,
            &metrics.disk.usage_percent,
            &container_count,
            &metrics.avg_response_time_ms,
            &metrics.avg_cpu_percent,
            &metrics.avg_memory_percent,
            &metrics.availability_percent,
            &metrics.load_score,
            &total_network_rx_bytes,
            &total_network_tx_bytes,
            &metrics.project_cpu_avg,
            &project_memory_mb,
        ],
    )?;
    Ok(row.get::<_, i64>(0))
}

fn insert_container_metrics(
    client: &mut Client,
    system_id: i64,
    containers: &[ContainerMetrics],
) -> Result<(), postgres::Error> {
    for container in containers {
        insert_container_metric(client, system_id, container)?;
    }
    Ok(())
}

fn insert_container_metric(
    client: &mut Client,
    system_id: i64,
    container: &ContainerMetrics,
) -> Result<u64, postgres::Error> {
    client.execute(
        INSERT_CONTAINER_SQL,
        &[
            &system_id,
            &container.name,
            &container.cpu_percent,
            &(container.memory_mb as i64),
            &(container.memory_limit_mb as i64),
            &container.memory_percent,
            &(container.network_rx_bytes as i64),
            &(container.network_tx_bytes as i64),
            &container.response_time_ms,
            &(container.http_status as i32),
        ],
    )
}

fn network_rx_bytes(metrics: &MetricsResponse) -> u64 {
    metrics
        .containers
        .iter()
        .map(|container| container.network_rx_bytes)
        .sum()
}

fn network_tx_bytes(metrics: &MetricsResponse) -> u64 {
    metrics
        .containers
        .iter()
        .map(|container| container.network_tx_bytes)
        .sum()
}
