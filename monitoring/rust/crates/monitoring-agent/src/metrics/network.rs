use std::collections::HashMap;
use std::fs;
use std::path::Path;

use crate::config::Config;
use crate::types::{DockerContainer, U64};

#[derive(Default)]
pub(super) struct ContainerNetwork {
    pub rx_bytes: U64,
    pub tx_bytes: U64,
}

pub(super) fn build_container_pid_map(
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

pub(super) fn read_container_network(config: &Config, pid: i32) -> Option<ContainerNetwork> {
    let content =
        fs::read_to_string(config.procfs_path.join(pid.to_string()).join("net/dev")).ok()?;
    let mut network = ContainerNetwork::default();
    for line in content.lines().skip(2) {
        add_network_line(line, &mut network);
    }
    Some(network)
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

fn add_network_line(line: &str, network: &mut ContainerNetwork) {
    let Some((iface, stats)) = line.split_once(':') else {
        return;
    };
    if iface.trim() == "lo" {
        return;
    }
    let values = stats.split_whitespace().collect::<Vec<_>>();
    network.rx_bytes += parse_stat(&values, 0);
    network.tx_bytes += parse_stat(&values, 8);
}

fn parse_stat(values: &[&str], index: usize) -> U64 {
    values
        .get(index)
        .and_then(|value| value.parse().ok())
        .unwrap_or(0)
}
