use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

use crate::config::Config;
use crate::constants::JOBBINGTRACK_PREFIX;
use crate::types::{DockerContainerConfig, WatchedLog};

pub fn discover_logs(config: &Config, watched: &mut HashMap<PathBuf, WatchedLog>) {
    let Ok(entries) = fs::read_dir(&config.log_dir) else {
        return;
    };

    for entry in entries.flatten() {
        if !entry
            .file_type()
            .map(|file_type| file_type.is_dir())
            .unwrap_or(false)
        {
            continue;
        }

        add_container_log_if_needed(
            config,
            watched,
            &entry.path(),
            &entry.file_name().to_string_lossy(),
        );
    }
}

fn add_container_log_if_needed(
    config: &Config,
    watched: &mut HashMap<PathBuf, WatchedLog>,
    container_dir: &Path,
    container_id: &str,
) {
    let log_path = container_dir.join(format!("{container_id}-json.log"));
    if watched.contains_key(&log_path) || !log_path.is_file() {
        return;
    }

    let container_name =
        read_container_name(container_dir).unwrap_or_else(|| container_id.to_string());
    if !is_jobbingtrack_container_name(&container_name) {
        return;
    }

    let position = initial_position(config, &log_path);
    watched.insert(
        log_path.clone(),
        WatchedLog {
            container_id: container_id.to_string(),
            container_name,
            path: log_path,
            position,
        },
    );
}

fn initial_position(config: &Config, log_path: &Path) -> u64 {
    if config.read_existing {
        0
    } else {
        log_path
            .metadata()
            .map(|metadata| metadata.len())
            .unwrap_or(0)
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
