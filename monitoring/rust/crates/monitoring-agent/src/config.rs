use crate::constants::{
    DEFAULT_DOCKER_SOCKET_PATH, DEFAULT_PORT, DEFAULT_POSTGRES_DB, DEFAULT_POSTGRES_HOST,
    DEFAULT_POSTGRES_PASSWORD, DEFAULT_POSTGRES_PORT, DEFAULT_POSTGRES_USER, DEFAULT_PROCFS_PATH,
    DEFAULT_SYSFS_PATH,
};
use std::env;
use std::path::PathBuf;

#[derive(Clone)]
pub struct Config {
    pub port: u16,
    pub procfs_path: PathBuf,
    pub sysfs_path: PathBuf,
    pub docker_socket_path: PathBuf,
    pub database_url: String,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            port: env_u16("PORT", DEFAULT_PORT),
            procfs_path: env_path("PROCFS_PATH", DEFAULT_PROCFS_PATH),
            sysfs_path: env_path("SYSFS_PATH", DEFAULT_SYSFS_PATH),
            docker_socket_path: env_path("DOCKER_SOCKET_PATH", DEFAULT_DOCKER_SOCKET_PATH),
            database_url: database_url_from_env(),
        }
    }
}

fn database_url_from_env() -> String {
    env::var("DATABASE_URL")
        .map(|value| normalize_postgres_url(&value))
        .unwrap_or_else(|_| fallback_database_url())
}

fn fallback_database_url() -> String {
    let host = env::var("POSTGRES_HOST").unwrap_or_else(|_| DEFAULT_POSTGRES_HOST.to_string());
    let port = env::var("POSTGRES_PORT").unwrap_or_else(|_| DEFAULT_POSTGRES_PORT.to_string());
    let db = env::var("POSTGRES_DB").unwrap_or_else(|_| DEFAULT_POSTGRES_DB.to_string());
    let user = env::var("POSTGRES_USER").unwrap_or_else(|_| DEFAULT_POSTGRES_USER.to_string());
    let password =
        env::var("POSTGRES_PASSWORD").unwrap_or_else(|_| DEFAULT_POSTGRES_PASSWORD.to_string());
    format!("postgresql://{user}:{password}@{host}:{port}/{db}")
}

fn normalize_postgres_url(raw: &str) -> String {
    raw.split_once('?')
        .map(|(url, _)| url.to_string())
        .unwrap_or_else(|| raw.to_string())
}

fn env_path(name: &str, default_value: &str) -> PathBuf {
    env::var(name)
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from(default_value))
}

fn env_u16(name: &str, default_value: u16) -> u16 {
    env::var(name)
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(default_value)
}
