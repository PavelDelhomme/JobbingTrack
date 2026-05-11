mod config;
mod constants;
mod docker;
mod health;
mod http;
mod metrics;
mod procfs;
mod storage;
mod types;

use config::Config;
use http::serve;
use metrics::MetricsCollector;

fn main() -> std::io::Result<()> {
    let config = Config::from_env();
    let collector = MetricsCollector::new(config.clone());
    serve(config, collector)
}
