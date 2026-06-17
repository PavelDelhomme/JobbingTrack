use std::fs;
use std::path::PathBuf;

use crate::config::Config;
use crate::types::U64;

#[derive(Default, Debug, PartialEq, Eq)]
pub(super) struct ContainerBlockIo {
    pub read_bytes: U64,
    pub write_bytes: U64,
}

/// Cumuls Block I/O conteneur via cgroup v2 `io.stat` (même source que `docker stats BlockIO`).
pub(super) fn read_container_block_io_from_cgroup(
    cgroup_dir: &Option<PathBuf>,
) -> ContainerBlockIo {
    let Some(dir) = cgroup_dir else {
        return ContainerBlockIo::default();
    };
    let content = fs::read_to_string(dir.join("io.stat")).unwrap_or_default();
    parse_cgroup_io_stat(&content)
}

/// Fallback : `/proc/<pid>/io` (souvent refusé hors root — préférer cgroup).
pub(super) fn read_container_block_io_from_proc(config: &Config, pid: i32) -> Option<ContainerBlockIo> {
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

fn parse_cgroup_io_stat(content: &str) -> ContainerBlockIo {
    let mut io = ContainerBlockIo::default();
    for line in content.lines() {
        for part in line.split_whitespace().skip(1) {
            let Some((key, value)) = part.split_once('=') else {
                continue;
            };
            match key {
                "rbytes" => io.read_bytes += value.parse().unwrap_or(0),
                "wbytes" => io.write_bytes += value.parse().unwrap_or(0),
                _ => {}
            }
        }
    }
    io
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_cgroup_io_stat_sums_devices() {
        let sample = "259:2 rbytes=1000 wbytes=2000 rios=1 wios=2\n259:3 rbytes=500 wbytes=700 rios=1 wios=1\n";
        assert_eq!(
            parse_cgroup_io_stat(sample),
            ContainerBlockIo {
                read_bytes: 1500,
                write_bytes: 2700,
            }
        );
    }
}
