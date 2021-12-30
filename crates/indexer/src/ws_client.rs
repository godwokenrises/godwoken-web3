use std::time::Duration;

use anyhow::Result;
use gw_jsonrpc_types::godwoken::ErrorTxReceipt;
use gw_mem_pool::traits::MemPoolErrorTxHandler;
use serde::de::DeserializeOwned;
use serde_json::from_value;
use sqlx::{
    postgres::{PgConnectOptions, PgPoolOptions},
    ConnectOptions,
};
use websocket::{ClientBuilder, OwnedMessage};

use crate::{
    config::IndexerConfig,
    ws_output::{Output, Success},
    ErrorReceiptIndexer,
};

pub fn start_listen_error_tx_receipt(config: &IndexerConfig) -> Result<()> {
    let client = ClientBuilder::new(&config.ws_rpc_url)
        .unwrap()
        .add_protocol("rust-websocket")
        .connect_insecure()
        .unwrap();

    log::info!("Successfully connected");

    let (mut receiver, mut sender) = client.split().unwrap();

    // Subscribe new_error_tx_receipt
    let msg = "{\"jsonrpc\": \"2.0\", \"id\": 1, \"method\": \"subscribe\", \"params\": [\"new_error_tx_receipt\"]}";
    let message = OwnedMessage::Text(msg.to_string());
    match sender.send_message(&message) {
        Ok(()) => {
            log::info!("Message send ok");
        }
        Err(e) => {
            log::info!("Ws send message failed: {:?}", e);
        }
    }

    let pg_pool = smol::block_on(async {
        let mut opts: PgConnectOptions = config.pg_url.parse()?;
        opts.log_statements(log::LevelFilter::Debug)
            .log_slow_statements(log::LevelFilter::Warn, Duration::from_secs(5));
        PgPoolOptions::new()
            .max_connections(5)
            .connect_with(opts)
            .await
    })?;

    let mut error_tx_handler =
        Box::new(ErrorReceiptIndexer::new(pg_pool)) as Box<dyn MemPoolErrorTxHandler + Send>;

    let _receive_loop = smol::spawn(async move {
        // Receive loop
        for message in receiver.incoming_messages() {
            let message = match message {
                Ok(m) => m,
                Err(e) => {
                    log::info!("Websocket message error: {:?}", e);
                    return;
                }
            };
            match message {
                OwnedMessage::Text(msg) => {
                    let output: Output = serde_json::from_str(&msg).expect("parse error");
                    let error_tx_receipt: Option<ErrorTxReceipt> = match to_result(output) {
                        Ok(s) => Some(s),
                        Err(e) => {
                            log::info!("ErrorTxReceipt type mismatch: {:?}", e);
                            None
                        }
                    };

                    if let Some(receipt) = error_tx_receipt {
                        let receipt2 = convert_error_tx_receipt(receipt);
                        error_tx_handler.handle_error_receipt(receipt2).detach();
                    }
                }
                // Say what we received
                _ => log::info!("Receive Loop: {:?}", message),
            }
        }
    })
    .detach();
    Ok(())
}

fn to_result<T: DeserializeOwned>(output: Output) -> anyhow::Result<T> {
    match output {
        Output::Success(success) => {
            let s = match success {
                Success::HttpSuccess(s) => from_value::<T>(s.result),
                Success::WsSuccess(s) => from_value::<T>(s.params.result),
            };
            Ok(s?)
        }
        Output::Failure(failure) => Err(anyhow::anyhow!("JSONRPC error: {}", failure.error)),
    }
}

fn convert_error_tx_receipt(
    receipt: gw_jsonrpc_types::godwoken::ErrorTxReceipt,
) -> gw_types::offchain::ErrorTxReceipt {
    gw_types::offchain::ErrorTxReceipt {
        tx_hash: {
            let mut buf = [0u8; 32];
            buf.copy_from_slice(receipt.tx_hash.as_bytes());
            buf.into()
        },
        block_number: receipt.block_number.into(),
        return_data: receipt.return_data.as_bytes().to_vec(),
        last_log: receipt.last_log.map(Into::into),
    }
}
