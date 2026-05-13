use std::time::Duration;

pub const DEFAULT_PORT: u16 = 3019;
pub const DEFAULT_LOG_DIR: &str = "/var/lib/docker/containers";
pub const DEFAULT_DISCOVERY_INTERVAL_SEC: u64 = 10;
pub const DEFAULT_POLL_INTERVAL_MS: u64 = 2000;
pub const JOBBINGTRACK_PREFIX: &str = "jobbingtrack-";
pub const HTTP_BIND_ADDRESS: &str = "0.0.0.0";
pub const HTTP_REQUEST_BUFFER_SIZE: usize = 4096;
pub const HTTP_OK: u16 = 200;
pub const HTTP_NOT_FOUND: u16 = 404;
pub const HTTP_INTERNAL_ERROR: u16 = 500;
pub const HTTP_NOT_IMPLEMENTED: u16 = 501;
pub const DEFAULT_POSTGRES_HOST: &str = "postgres";
pub const DEFAULT_POSTGRES_PORT: &str = "5432";
pub const DEFAULT_POSTGRES_DB: &str = "jobbingtrack";
pub const DEFAULT_POSTGRES_USER: &str = "jobbingtrack";
pub const DEFAULT_POSTGRES_PASSWORD: &str = "jobbingtrack123";
pub const DISCOVERY_ENV: &str = "LOG_COLLECTOR_DISCOVERY_INTERVAL_SEC";
pub const DOCKER_LOG_DIR_ENV: &str = "LOG_COLLECTOR_DOCKER_LOG_DIR";
pub const POLL_ENV: &str = "LOG_COLLECTOR_POLL_INTERVAL_MS";
pub const READ_EXISTING_ENV: &str = "LOG_COLLECTOR_READ_EXISTING";
pub const DISCOVERY_INTERVAL_FALLBACK: Duration =
    Duration::from_secs(DEFAULT_DISCOVERY_INTERVAL_SEC);
pub const POLL_INTERVAL_FALLBACK: Duration = Duration::from_millis(DEFAULT_POLL_INTERVAL_MS);
