use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::Arc;
use std::thread;

use serde_json::json;

use crate::config::Config;
use crate::constants::{
    HTTP_BIND_ADDRESS, HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND, HTTP_NOT_IMPLEMENTED, HTTP_OK,
    HTTP_REQUEST_BUFFER_SIZE,
};
use crate::storage::query_logs;

pub fn start_http_server(config: Arc<Config>) -> std::io::Result<()> {
    let listener = TcpListener::bind((HTTP_BIND_ADDRESS, config.port))?;
    eprintln!("log-collector Rust HTTP listening on {}", config.port);

    thread::spawn(move || {
        for stream in listener.incoming() {
            match stream {
                Ok(mut stream) => {
                    if let Err(error) = handle_request(&mut stream, &config) {
                        eprintln!("log-collector request error: {error}");
                    }
                }
                Err(error) => eprintln!("log-collector accept error: {error}"),
            }
        }
    });

    Ok(())
}

fn handle_request(stream: &mut TcpStream, config: &Config) -> std::io::Result<()> {
    let request = read_request(stream)?;

    if is_health_request(&request) {
        return write_json(
            stream,
            HTTP_OK,
            r#"{"status":"ok","service":"jobbingtrack-log-collector","runtime":"rust"}"#,
        );
    }

    if request.starts_with("GET /api/v1/logs") {
        return write_logs_response(stream, config, &request);
    }

    write_json(stream, HTTP_NOT_FOUND, r#"{"error":"Not found"}"#)
}

fn read_request(stream: &mut TcpStream) -> std::io::Result<String> {
    let mut buffer = [0_u8; HTTP_REQUEST_BUFFER_SIZE];
    let bytes_read = stream.read(&mut buffer)?;
    Ok(String::from_utf8_lossy(&buffer[..bytes_read]).to_string())
}

fn is_health_request(request: &str) -> bool {
    request.starts_with("GET /health ") || request.starts_with("GET /api/v1/health ")
}

fn write_logs_response(
    stream: &mut TcpStream,
    config: &Config,
    request: &str,
) -> std::io::Result<()> {
    let params = parse_query_params(request);
    match query_logs(config, &params) {
        Ok(body) => write_json(stream, HTTP_OK, &body),
        Err(error) => write_json(
            stream,
            HTTP_INTERNAL_ERROR,
            &json!({"success": false, "error": error.to_string()}).to_string(),
        ),
    }
}

fn parse_query_params(request: &str) -> HashMap<String, String> {
    let path = request.split_whitespace().nth(1).unwrap_or_default();
    let Some((_, query)) = path.split_once('?') else {
        return HashMap::new();
    };

    query
        .split('&')
        .filter_map(|pair| {
            let (key, value) = pair.split_once('=')?;
            Some((key.to_string(), value.trim_end_matches(' ').to_string()))
        })
        .collect()
}

fn write_json(stream: &mut TcpStream, status: u16, body: &str) -> std::io::Result<()> {
    let reason = http_reason(status);
    write!(
        stream,
        "HTTP/1.1 {status} {reason}\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    )
}

fn http_reason(status: u16) -> &'static str {
    match status {
        HTTP_OK => "OK",
        HTTP_NOT_FOUND => "Not Found",
        HTTP_INTERNAL_ERROR => "Internal Server Error",
        HTTP_NOT_IMPLEMENTED => "Not Implemented",
        _ => "OK",
    }
}
