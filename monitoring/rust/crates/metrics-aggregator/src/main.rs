use std::env;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};

const DEFAULT_PORT: u16 = 3014;

fn main() -> std::io::Result<()> {
    let port = env::var("PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(DEFAULT_PORT);

    let listener = TcpListener::bind(("0.0.0.0", port))?;
    eprintln!("metrics-aggregator Rust listening on {port}");

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
    let mut buffer = [0_u8; 4096];
    let bytes_read = stream.read(&mut buffer)?;
    let request = String::from_utf8_lossy(&buffer[..bytes_read]);

    if request.starts_with("GET /api/v1/health ") || request.starts_with("GET /health ") {
        return write_json(
            stream,
            200,
            r#"{"status":"ok","service":"jobbingtrack-metrics-aggregator-rs","runtime":"rust"}"#,
        );
    }

    if request.starts_with("GET /api/v1/metrics ")
        || request.starts_with("GET /api/v1/persistence/")
    {
        return write_json(
            stream,
            501,
            r#"{"success":false,"service":"jobbingtrack-metrics-aggregator-rs","runtime":"rust","error":"aggregator API migration not enabled yet"}"#,
        );
    }

    write_json(stream, 404, r#"{"error":"Endpoint not found"}"#)
}

fn write_json(stream: &mut TcpStream, status: u16, body: &str) -> std::io::Result<()> {
    let reason = match status {
        200 => "OK",
        404 => "Not Found",
        501 => "Not Implemented",
        _ => "OK",
    };
    write!(
        stream,
        "HTTP/1.1 {status} {reason}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    )
}
