use crate::config::Config;
use crate::constants::{
    HTTP_BIND_ADDRESS, HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND, HTTP_OK, HTTP_REQUEST_BUFFER_SIZE,
};
use crate::metrics::MetricsCollector;
use crate::storage::HistoryQuery;
use serde_json::json;
use std::collections::HashMap;
use std::io::{ErrorKind, Read, Write};
use std::net::{TcpListener, TcpStream};

pub fn serve(config: Config, collector: MetricsCollector) -> std::io::Result<()> {
    let listener = TcpListener::bind((HTTP_BIND_ADDRESS, config.port))?;
    eprintln!("monitoring-agent Rust listening on {}", config.port);

    for stream in listener.incoming() {
        match stream {
            Ok(mut stream) => {
                if let Err(error) = handle_stream(&mut stream, &collector) {
                    if !is_benign_client_disconnect(&error) {
                        eprintln!("monitoring-agent request error: {error}");
                    }
                }
            }
            Err(error) => eprintln!("monitoring-agent accept error: {error}"),
        }
    }
    Ok(())
}

fn is_benign_client_disconnect(error: &std::io::Error) -> bool {
    matches!(
        error.kind(),
        ErrorKind::BrokenPipe | ErrorKind::ConnectionReset | ErrorKind::UnexpectedEof
    )
}

fn handle_stream(stream: &mut TcpStream, collector: &MetricsCollector) -> std::io::Result<()> {
    let mut buffer = [0_u8; HTTP_REQUEST_BUFFER_SIZE];
    let bytes_read = stream.read(&mut buffer)?;
    let request = String::from_utf8_lossy(&buffer[..bytes_read]);

    if is_health_request(&request) {
        return write_json(stream, HTTP_OK, &health_body().to_string());
    }
    if is_metrics_request(&request) {
        return write_json(
            stream,
            HTTP_OK,
            &serde_json::to_string(&collector.collect())?,
        );
    }
    if is_history_request(&request) {
        return write_history(stream, collector, &request);
    }
    write_json(stream, HTTP_NOT_FOUND, &not_found_body().to_string())
}

fn is_health_request(request: &str) -> bool {
    request.starts_with("GET /health ") || request.starts_with("GET /api/v1/health ")
}

fn is_metrics_request(request: &str) -> bool {
    request.starts_with("GET /api/v1/metrics ") || request.starts_with("GET / ")
}

fn is_history_request(request: &str) -> bool {
    request.starts_with("GET /api/v1/persistence/system/metrics")
}

fn write_history(
    stream: &mut TcpStream,
    collector: &MetricsCollector,
    request: &str,
) -> std::io::Result<()> {
    let query = history_query_from_request(request);
    match collector.history(&query) {
        Ok(body) => write_json(stream, HTTP_OK, &body),
        Err(error) => write_json(
            stream,
            HTTP_INTERNAL_ERROR,
            &storage_error_body(&error).to_string(),
        ),
    }
}

fn history_query_from_request(request: &str) -> HistoryQuery {
    let params = parse_query_params(request);
    HistoryQuery::new(
        parse_i64_param(&params, "limit"),
        parse_i64_param(&params, "offset"),
        normalize_query_date(params.get("startDate")),
        normalize_query_date(params.get("endDate")),
    )
}

fn parse_query_params(request: &str) -> HashMap<String, String> {
    let mut params = HashMap::new();
    let Some(path) = request.split_whitespace().nth(1) else {
        return params;
    };
    let Some((_, query)) = path.split_once('?') else {
        return params;
    };
    for pair in query.split('&') {
        insert_query_param(pair, &mut params);
    }
    params
}

fn insert_query_param(pair: &str, params: &mut HashMap<String, String>) {
    let Some((key, value)) = pair.split_once('=') else {
        return;
    };
    params.insert(key.to_string(), url_decode(value));
}

fn parse_i64_param(params: &HashMap<String, String>, name: &str) -> i64 {
    params
        .get(name)
        .and_then(|value| value.parse::<i64>().ok())
        .unwrap_or_default()
}

fn normalize_query_date(value: Option<&String>) -> String {
    value
        .map(|date| date.replace('T', " ").trim_end_matches('Z').to_string())
        .unwrap_or_default()
}

fn url_decode(value: &str) -> String {
    let bytes = value.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        index += decode_byte(bytes, index, &mut decoded);
    }
    String::from_utf8_lossy(&decoded).to_string()
}

fn decode_byte(bytes: &[u8], index: usize, decoded: &mut Vec<u8>) -> usize {
    if bytes[index] == b'+' {
        decoded.push(b' ');
        return 1;
    }
    if bytes[index] == b'%' && index + 2 < bytes.len() {
        return decode_percent(bytes, index, decoded);
    }
    decoded.push(bytes[index]);
    1
}

fn decode_percent(bytes: &[u8], index: usize, decoded: &mut Vec<u8>) -> usize {
    let hex = String::from_utf8_lossy(&bytes[index + 1..index + 3]);
    match u8::from_str_radix(&hex, 16) {
        Ok(value) => {
            decoded.push(value);
            3
        }
        Err(_) => {
            decoded.push(bytes[index]);
            1
        }
    }
}

fn health_body() -> serde_json::Value {
    json!({
        "status": "ok",
        "service": "jobbingtrack-monitoring-agent",
        "runtime": "rust"
    })
}

fn not_found_body() -> serde_json::Value {
    json!({
        "error": "Endpoint not found"
    })
}

fn storage_error_body(error: &postgres::Error) -> serde_json::Value {
    json!({
        "success": false,
        "error": error.to_string()
    })
}

fn write_json(stream: &mut TcpStream, status: u16, body: &str) -> std::io::Result<()> {
    let reason = match status {
        HTTP_OK => "OK",
        HTTP_NOT_FOUND => "Not Found",
        HTTP_INTERNAL_ERROR => "Internal Server Error",
        _ => "OK",
    };
    match write!(
        stream,
        "HTTP/1.1 {status} {reason}\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    ) {
        Ok(_) => Ok(()),
        Err(error) if is_benign_client_disconnect(&error) => Ok(()),
        Err(error) => Err(error),
    }
}
