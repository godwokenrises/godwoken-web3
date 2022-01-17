use gw_web3_indexer::{
    config::read_indexer_config, runner::Runner, ws_client::start_listen_error_tx_receipt,
};

use anyhow::Result;
use sentry_log::LogFilter;

fn main() -> Result<()> {
    init_log();
    let indexer_config = read_indexer_config("./indexer-config.toml")?;

    let _guard = match &indexer_config.sentry_dsn {
        Some(sentry_dsn) => sentry::init((
            sentry_dsn.as_str(),
            sentry::ClientOptions {
                release: sentry::release_name!(),
                ..Default::default()
            },
        )),
        None => sentry::init(()),
    };

    let listener_task = start_listen_error_tx_receipt(&indexer_config);

    let mut runner = Runner::new(indexer_config)?;

    smol::block_on(runner.run())?;
    smol::block_on(listener_task);
    Ok(())
}

fn init_log() {
    let logger = env_logger::builder()
        .parse_env(env_logger::Env::default().default_filter_or("info"))
        .build();
    let level = logger.filter();
    let logger = sentry_log::SentryLogger::with_dest(logger).filter(|md| match md.level() {
        log::Level::Error | log::Level::Warn => LogFilter::Event,
        _ => LogFilter::Ignore,
    });
    log::set_boxed_logger(Box::new(logger))
        .map(|()| log::set_max_level(level))
        .expect("set log");
}
