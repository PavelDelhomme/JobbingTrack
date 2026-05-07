use crate::constants::{
    HEALTH_DEFAULT_PATH, HEALTH_REQUEST_MAX_BYTES, HEALTH_REQUEST_TIMEOUT, HEALTH_TARGETS,
};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::{TcpStream, ToSocketAddrs};
use std::thread;
use std::time::Instant;

#[derive(Clone, Default)]
pub struct HealthResult {
    pub response_time_ms: f64,
    pub http_status: u16,
}

struct HealthEndpoint {
    host: String,
    port: u16,
    path: &'static str,
}

pub fn check_container_health(container_name: &str) -> HealthResult {
    let endpoint = health_endpoint(container_name);
    let started_at = Instant::now();
    let status = request_status(&endpoint).unwrap_or_default();

    HealthResult {
        response_time_ms: started_at.elapsed().as_secs_f64() * 1000.0,
        http_status: status,
    }
}

pub fn check_containers_health(names: &[String]) -> HashMap<String, HealthResult> {
    let handles = names
        .iter()
        .cloned()
        .map(|name| thread::spawn(move || check_named_container(name)))
        .collect::<Vec<_>>();
    let mut results = HashMap::new();

    for handle in handles {
        match handle.join() {
            Ok((name, result)) => {
                results.insert(name, result);
            }
            Err(_) => eprintln!("monitoring-agent health worker panicked"),
        }
    }
    results
}

fn check_named_container(name: String) -> (String, HealthResult) {
    let result = check_container_health(&name);
    (name, result)
}

fn health_endpoint(container_name: &str) -> HealthEndpoint {
    for target in HEALTH_TARGETS {
        if container_name.contains(target.needle) {
            return HealthEndpoint {
                host: container_name.to_string(),
                port: target.port,
                path: target.path,
            };
        }
    }
    HealthEndpoint {
        host: container_name.to_string(),
        port: 80,
        path: HEALTH_DEFAULT_PATH,
    }
}

fn request_status(endpoint: &HealthEndpoint) -> std::io::Result<u16> {
    let mut stream = connect(endpoint)?;
    let request = build_request(endpoint);
    let mut response = [0_u8; HEALTH_REQUEST_MAX_BYTES];

    stream.write_all(request.as_bytes())?;
    let bytes_read = stream.read(&mut response)?;
    Ok(parse_status_code(&response[..bytes_read]))
}

fn connect(endpoint: &HealthEndpoint) -> std::io::Result<TcpStream> {
    let address = (endpoint.host.as_str(), endpoint.port)
        .to_socket_addrs()?
        .next()
        .ok_or_else(|| std::io::Error::other("No socket address resolved"))?;
    let stream = TcpStream::connect_timeout(&address, HEALTH_REQUEST_TIMEOUT)?;

    stream.set_read_timeout(Some(HEALTH_REQUEST_TIMEOUT))?;
    stream.set_write_timeout(Some(HEALTH_REQUEST_TIMEOUT))?;
    Ok(stream)
}

fn build_request(endpoint: &HealthEndpoint) -> String {
    format!(
        "GET {} HTTP/1.1\r\nHost: {}\r\nConnection: close\r\n\r\n",
        endpoint.path, endpoint.host
    )
}

fn parse_status_code(response: &[u8]) -> u16 {
    let line = String::from_utf8_lossy(response);
    line.split_whitespace()
        .nth(1)
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or_default()
}
