use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};

use crate::config::Config;
use crate::constants::{
    HTTP_BIND_ADDRESS, HTTP_NOT_FOUND, HTTP_NOT_IMPLEMENTED, HTTP_OK, HTTP_REQUEST_BUFFER_SIZE,
};

pub fn serve(config: Config) -> std::io::Result<()> {
    let listener = TcpListener::bind((HTTP_BIND_ADDRESS, config.port))?;
    eprintln!("metrics-aggregator Rust listening on {}", config.port);

    for stream in listener.incoming() {
        match stream {
            Ok(mut stream) => {
                if let Err(error) = handle_request(&mut stream) {
                    eprintln!("metrics-aggregator request error: {error}");
                }
            }
            Err(error) => eprintln!("metrics-aggregator accept error: {error}"),
        }
    }

    Ok(())
}

fn handle_request(stream: &mut TcpStream) -> std::io::Result<()> {
    let request = read_request(stream)?;

    if is_health_request(&request) {
        return write_json(
            stream,
            HTTP_OK,
            r#"{"status":"ok","service":"jobbingtrack-metrics-aggregator-rs","runtime":"rust"}"#,
        );
    }

    if is_migration_placeholder_request(&request) {
        return write_json(
            stream,
            HTTP_NOT_IMPLEMENTED,
            r#"{"success":false,"service":"jobbingtrack-metrics-aggregator-rs","runtime":"rust","error":"aggregator API migration not enabled yet"}"#,
        );
    }

    write_json(stream, HTTP_NOT_FOUND, r#"{"error":"Endpoint not found"}"#)
}

fn read_request(stream: &mut TcpStream) -> std::io::Result<String> {
    let mut buffer = [0_u8; HTTP_REQUEST_BUFFER_SIZE];
    let bytes_read = stream.read(&mut buffer)?;
    Ok(String::from_utf8_lossy(&buffer[..bytes_read]).to_string())
}

fn is_health_request(request: &str) -> bool {
    request.starts_with("GET /api/v1/health ") || request.starts_with("GET /health ")
}

fn is_migration_placeholder_request(request: &str) -> bool {
    request.starts_with("GET /api/v1/metrics ") || request.starts_with("GET /api/v1/persistence/")
}

fn write_json(stream: &mut TcpStream, status: u16, body: &str) -> std::io::Result<()> {
    let reason = http_reason(status);
    write!(
        stream,
        "HTTP/1.1 {status} {reason}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    )
}

fn http_reason(status: u16) -> &'static str {
    match status {
        HTTP_OK => "OK",
        HTTP_NOT_FOUND => "Not Found",
        HTTP_NOT_IMPLEMENTED => "Not Implemented",
        _ => "OK",
    }
}
