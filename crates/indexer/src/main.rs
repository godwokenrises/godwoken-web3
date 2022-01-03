use std::time::Duration;

use gw_web3_indexer::{
    config::read_indexer_config, runner::Runner, ws_client::start_listen_error_tx_receipt,
};

use anyhow::Result;
use sqlx::{
    postgres::{PgConnectOptions, PgPoolOptions},
    ConnectOptions,
};

fn main() -> Result<()> {
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));
    let indexer_config = read_indexer_config("./indexer-config.toml")?;

    let pg_pool = smol::block_on(async {
        let mut opts: PgConnectOptions = indexer_config.pg_url.parse()?;
        opts.log_statements(log::LevelFilter::Debug)
            .log_slow_statements(log::LevelFilter::Warn, Duration::from_secs(5));
        PgPoolOptions::new()
            .max_connections(5)
            .connect_with(opts)
            .await
    })?;

    let listener_task = start_listen_error_tx_receipt(&indexer_config, pg_pool.clone());

    let mut runner = Runner::new(indexer_config, pg_pool)?;

    smol::block_on(runner.run())?;
    smol::block_on(listener_task);
    Ok(())
}
