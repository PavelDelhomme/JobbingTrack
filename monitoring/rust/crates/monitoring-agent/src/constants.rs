use std::time::Duration;

pub const DEFAULT_PORT: u16 = 8015;
pub const DEFAULT_PROCFS_PATH: &str = "/proc";
pub const DEFAULT_SYSFS_PATH: &str = "/sys";
pub const DEFAULT_DOCKER_SOCKET_PATH: &str = "/var/run/docker.sock";
pub const DOCKER_CONTAINERS_PATH: &str = "/containers/json";
pub const HTTP_BIND_ADDRESS: &str = "0.0.0.0";
pub const HTTP_REQUEST_BUFFER_SIZE: usize = 4096;
pub const HTTP_OK: u16 = 200;
pub const HTTP_NOT_FOUND: u16 = 404;
pub const HTTP_INTERNAL_ERROR: u16 = 500;
pub const JOBBINGTRACK_PREFIX: &str = "jobbingtrack-";
pub const BYTES_PER_MIB: f64 = 1024.0 * 1024.0;
pub const BYTES_PER_GIB: f64 = 1024.0 * 1024.0 * 1024.0;
pub const DISK_METRICS_PATH: &str = "/";
pub const CPU_WEIGHT: f64 = 0.35;
pub const MEMORY_WEIGHT: f64 = 0.30;
pub const RESPONSE_TIME_WEIGHT: f64 = 0.15;
pub const HEALTHY_AVAILABILITY_PERCENT: f64 = 100.0;
pub const SERVICE_DEGRADED_RESPONSE_MS: f64 = 1000.0;
pub const ZERO_FLOAT: f64 = 0.0;
pub const ONE_HUNDRED_PERCENT: f64 = 100.0;
pub const MICROSECONDS_PER_SECOND: f64 = 1_000_000.0;
pub const DOCKER_HTTP_MAX_RESPONSE_BYTES: usize = 1024 * 1024;
pub const DOCKER_HTTP_READ_CHUNK_BYTES: usize = 4096;
pub const HEALTH_REQUEST_MAX_BYTES: usize = 4096;
pub const HEALTH_REQUEST_TIMEOUT: Duration = Duration::from_secs(3);
pub const HEALTH_DEFAULT_PATH: &str = "/health";
pub const DEFAULT_POSTGRES_HOST: &str = "postgres";
pub const DEFAULT_POSTGRES_PORT: &str = "5432";
pub const DEFAULT_POSTGRES_DB: &str = "jobbingtrack";
pub const DEFAULT_POSTGRES_USER: &str = "jobbingtrack";
pub const DEFAULT_POSTGRES_PASSWORD: &str = "jobbingtrack123";
pub const POSTGRES_CONNECT_TIMEOUT_SEC: &str = "5";
pub const HISTORY_DEFAULT_LIMIT: i64 = 100;
pub const HISTORY_MAX_LIMIT: i64 = 5000;
pub const HISTORY_MAX_OFFSET: i64 = 100000;

pub struct HealthTarget {
    pub needle: &'static str,
    pub port: u16,
    pub path: &'static str,
}

pub const HEALTH_TARGETS: &[HealthTarget] = &[
    HealthTarget {
        needle: "api-gateway",
        port: 3000,
        path: "/api/v1/health",
    },
    HealthTarget {
        needle: "auth-service",
        port: 3001,
        path: "/api/v1/auth/health",
    },
    HealthTarget {
        needle: "application-service",
        port: 3002,
        path: "/api/v1/applications/health",
    },
    HealthTarget {
        needle: "company-service",
        port: 3003,
        path: "/api/v1/companies/health",
    },
    HealthTarget {
        needle: "contact-service",
        port: 3004,
        path: "/api/v1/contacts/health",
    },
    HealthTarget {
        needle: "interview-service",
        port: 3005,
        path: "/api/v1/interviews/health",
    },
    HealthTarget {
        needle: "call-service",
        port: 3008,
        path: "/api/v1/calls/health",
    },
    HealthTarget {
        needle: "event-service",
        port: 3011,
        path: "/api/v1/events/health",
    },
    HealthTarget {
        needle: "followup-service",
        port: 3012,
        path: "/api/v1/followups/health",
    },
    HealthTarget {
        needle: "profile-service",
        port: 3009,
        path: HEALTH_DEFAULT_PATH,
    },
    HealthTarget {
        needle: "notification-service",
        port: 3008,
        path: HEALTH_DEFAULT_PATH,
    },
    HealthTarget {
        needle: "dashboard-service",
        port: 3000,
        path: HEALTH_DEFAULT_PATH,
    },
    HealthTarget {
        needle: "workflow-service",
        port: 3013,
        path: HEALTH_DEFAULT_PATH,
    },
    HealthTarget {
        needle: "security-service",
        port: 3017,
        path: HEALTH_DEFAULT_PATH,
    },
    HealthTarget {
        needle: "deployment-service",
        port: 3016,
        path: HEALTH_DEFAULT_PATH,
    },
    HealthTarget {
        needle: "metrics-aggregator",
        port: 3014,
        path: "/api/v1/health",
    },
    HealthTarget {
        needle: "monitoring-c",
        port: 8015,
        path: HEALTH_DEFAULT_PATH,
    },
    HealthTarget {
        needle: "log-collector-c",
        port: 3019,
        path: HEALTH_DEFAULT_PATH,
    },
    HealthTarget {
        needle: "frontend",
        port: 3000,
        path: HEALTH_DEFAULT_PATH,
    },
];
