mod collector;
mod config;
mod constants;
mod discovery;
mod http;
mod parser;
mod storage;
mod types;

use std::sync::Arc;

use collector::run_collector;
use config::Config;
use http::start_http_server;

fn main() -> std::io::Result<()> {
    let config = Arc::new(Config::from_env());
    start_http_server(Arc::clone(&config))?;
    run_collector(config)
}
