use std::env;

use crate::constants::DEFAULT_PORT;

pub struct Config {
    pub port: u16,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            port: env::var("PORT")
                .ok()
                .and_then(|value| value.parse::<u16>().ok())
                .unwrap_or(DEFAULT_PORT),
        }
    }
}
