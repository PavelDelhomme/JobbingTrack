use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::PathBuf;
use std::sync::Arc;
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};

use postgres::Client;

use crate::config::Config;
use crate::discovery::discover_logs;
use crate::parser::parse_docker_log_line;
use crate::storage::{connect_storage, store_log_entry};
use crate::types::WatchedLog;

pub fn run_collector(config: Arc<Config>) -> std::io::Result<()> {
    eprintln!(
        "log-collector Rust scanning {} (read_existing={})",
        config.log_dir.display(),
        config.read_existing
    );

    let mut client = connect_storage(&config);
    let mut watched = HashMap::<PathBuf, WatchedLog>::new();
    let mut last_discovery = UNIX_EPOCH;

    loop {
        let now = SystemTime::now();
        if should_discover(now, last_discovery, &config) {
            discover_logs(&config, &mut watched);
            last_discovery = now;
        }

        reconnect_storage_if_needed(&config, &mut client);
        read_watched_logs(&mut watched, client.as_mut());
        thread::sleep(config.poll_interval);
    }
}

fn should_discover(now: SystemTime, last_discovery: SystemTime, config: &Config) -> bool {
    now.duration_since(last_discovery).unwrap_or_default() >= config.discovery_interval
}

fn reconnect_storage_if_needed(config: &Config, client: &mut Option<Client>) {
    if client.is_none() {
        *client = connect_storage(config);
    }
}

fn read_watched_logs(watched: &mut HashMap<PathBuf, WatchedLog>, client: Option<&mut Client>) {
    let mut client = client;
    for watch in watched.values_mut() {
        if let Err(error) = read_new_lines(watch, client.as_deref_mut()) {
            eprintln!(
                "log-collector read error for {}: {error}",
                watch.path.display()
            );
        }
    }
}

fn read_new_lines(watch: &mut WatchedLog, client: Option<&mut Client>) -> std::io::Result<()> {
    let metadata = fs::metadata(&watch.path)?;
    reset_position_if_truncated(watch, metadata.len());
    if metadata.len() == watch.position {
        return Ok(());
    }

    let mut reader = open_reader_at_position(watch)?;
    let new_position = read_lines_from_position(&mut reader, watch, client)?;
    watch.position = new_position;
    Ok(())
}

fn reset_position_if_truncated(watch: &mut WatchedLog, file_len: u64) {
    if file_len < watch.position {
        watch.position = 0;
    }
}

fn open_reader_at_position(watch: &WatchedLog) -> std::io::Result<BufReader<File>> {
    let mut file = File::open(&watch.path)?;
    file.seek(SeekFrom::Start(watch.position))?;
    Ok(BufReader::new(file))
}

fn read_lines_from_position(
    reader: &mut BufReader<File>,
    watch: &WatchedLog,
    client: Option<&mut Client>,
) -> std::io::Result<u64> {
    let mut line = String::new();
    let mut current_position = watch.position;
    let mut client = client;

    loop {
        line.clear();
        let bytes_read = reader.read_line(&mut line)?;
        if bytes_read == 0 {
            break;
        }

        current_position += bytes_read as u64;
        parse_and_store_line(&line, watch, client.as_deref_mut());
    }

    Ok(current_position)
}

fn parse_and_store_line(line: &str, watch: &WatchedLog, client: Option<&mut Client>) {
    let Some(entry) = parse_docker_log_line(line, watch) else {
        return;
    };
    let Some(db) = client else {
        return;
    };

    if let Err(error) = store_log_entry(db, &entry) {
        eprintln!("log-collector insert error: {error}");
    }
}
