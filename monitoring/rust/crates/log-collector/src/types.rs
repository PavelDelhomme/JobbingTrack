use std::path::PathBuf;

use serde::Deserialize;

#[derive(Debug)]
pub struct WatchedLog {
    pub container_id: String,
    pub container_name: String,
    pub path: PathBuf,
    pub position: u64,
}

#[derive(Debug)]
pub struct LogEntry {
    pub timestamp: String,
    pub container_id: String,
    pub container_name: String,
    pub level: String,
    pub message: String,
    pub source: String,
    pub response_time_ms: f64,
    pub http_status: i32,
    pub is_error: bool,
}

#[derive(Deserialize)]
pub(crate) struct DockerLogLine {
    pub log: String,
    pub time: Option<String>,
}

#[derive(Deserialize)]
pub(crate) struct DockerContainerConfig {
    #[serde(rename = "Name")]
    pub name: Option<String>,
}
