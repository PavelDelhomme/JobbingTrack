use crate::config::Config;
use crate::constants::{
    DOCKER_CONTAINERS_PATH, DOCKER_HTTP_MAX_RESPONSE_BYTES, DOCKER_HTTP_READ_CHUNK_BYTES,
    JOBBINGTRACK_PREFIX,
};
use crate::types::DockerContainer;
use serde::Deserialize;
use std::io::{Read, Write};
use std::os::unix::net::UnixStream;

#[derive(Deserialize)]
struct DockerContainerRow {
    #[serde(rename = "Id")]
    id: String,
    #[serde(rename = "Names")]
    names: Vec<String>,
}

pub fn list_containers(config: &Config) -> Vec<DockerContainer> {
    let body = match docker_get(config, DOCKER_CONTAINERS_PATH) {
        Ok(body) => body,
        Err(error) => {
            eprintln!("monitoring-agent docker list error: {error}");
            return Vec::new();
        }
    };

    serde_json::from_str::<Vec<DockerContainerRow>>(&body)
        .map(to_project_containers)
        .unwrap_or_default()
}

fn to_project_containers(rows: Vec<DockerContainerRow>) -> Vec<DockerContainer> {
    rows.into_iter()
        .filter_map(|row| {
            let name = row.names.first()?.trim_start_matches('/').to_string();
            name.contains(JOBBINGTRACK_PREFIX)
                .then_some(DockerContainer { id: row.id, name })
        })
        .collect()
}

fn docker_get(config: &Config, path: &str) -> std::io::Result<String> {
    let mut stream = UnixStream::connect(&config.docker_socket_path)?;
    let request = format!("GET {path} HTTP/1.1\r\nHost: docker\r\nConnection: close\r\n\r\n");
    stream.write_all(request.as_bytes())?;
    read_http_body(stream)
}

fn read_http_body(mut stream: UnixStream) -> std::io::Result<String> {
    let mut response = Vec::new();
    let mut chunk = [0_u8; DOCKER_HTTP_READ_CHUNK_BYTES];

    loop {
        let bytes_read = stream.read(&mut chunk)?;
        if bytes_read == 0 {
            break;
        }
        response.extend_from_slice(&chunk[..bytes_read]);
        if response.len() > DOCKER_HTTP_MAX_RESPONSE_BYTES {
            return Err(std::io::Error::other("Docker response too large"));
        }
    }

    split_http_body(response)
}

fn split_http_body(response: Vec<u8>) -> std::io::Result<String> {
    let marker = b"\r\n\r\n";
    let Some(index) = response
        .windows(marker.len())
        .position(|window| window == marker)
    else {
        return Err(std::io::Error::other("Docker response without body"));
    };
    let headers = String::from_utf8_lossy(&response[..index]).to_ascii_lowercase();
    let body = &response[index + marker.len()..];
    if headers.contains("transfer-encoding: chunked") {
        return decode_chunked_body(body);
    }
    Ok(String::from_utf8_lossy(body).to_string())
}

fn decode_chunked_body(body: &[u8]) -> std::io::Result<String> {
    let mut decoded = Vec::new();
    let mut offset = 0;

    loop {
        let Some(line_end) = find_crlf(body, offset) else {
            return Err(std::io::Error::other("Invalid chunk header"));
        };
        let size_text = String::from_utf8_lossy(&body[offset..line_end]);
        let size_hex = size_text.split(';').next().unwrap_or_default().trim();
        let size = usize::from_str_radix(size_hex, 16)
            .map_err(|_| std::io::Error::other("Invalid chunk size"))?;
        offset = line_end + 2;
        if size == 0 {
            break;
        }
        if offset + size > body.len() {
            return Err(std::io::Error::other("Truncated chunk body"));
        }
        decoded.extend_from_slice(&body[offset..offset + size]);
        offset += size + 2;
    }

    Ok(String::from_utf8_lossy(&decoded).to_string())
}

fn find_crlf(data: &[u8], start: usize) -> Option<usize> {
    data.get(start..)?
        .windows(2)
        .position(|window| window == b"\r\n")
        .map(|position| start + position)
}
