use gw_web3_indexer::{
    config::read_indexer_config, runner::Runner, ws_client::start_listen_error_tx_receipt,
};

use anyhow::Result;

fn main() -> Result<()> {
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));
    let indexer_config = read_indexer_config("./indexer-config.toml")?;
    start_listen_error_tx_receipt(&indexer_config)?;

    let mut runner = Runner::new(indexer_config)?;

    smol::block_on(runner.run())?;
    Ok(())
}
