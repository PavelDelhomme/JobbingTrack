mod config;
mod constants;
mod http;

use config::Config;
use http::serve;

fn main() -> std::io::Result<()> {
    serve(Config::from_env())
}
