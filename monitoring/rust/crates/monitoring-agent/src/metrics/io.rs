use std::fs;

use crate::config::Config;
use crate::types::U64;

#[derive(Default)]
pub(super) struct ContainerBlockIo {
    pub read_bytes: U64,
    pub write_bytes: U64,
}

/// Cumuls lecture/écriture disque du conteneur via `/proc/<pid>/io` (aligné iotop).
pub(super) fn read_container_block_io(config: &Config, pid: i32) -> Option<ContainerBlockIo> {
    let content = fs::read_to_string(config.procfs_path.join(pid.to_string()).join("io")).ok()?;
    let mut io = ContainerBlockIo::default();
    for line in content.lines() {
        let (key, value) = line.split_once(':')?;
        match key.trim() {
            "read_bytes" => io.read_bytes = value.trim().parse().unwrap_or_default(),
            "write_bytes" => io.write_bytes = value.trim().parse().unwrap_or_default(),
            _ => {}
        }
    }
    Some(io)
}
