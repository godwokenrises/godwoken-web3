use anyhow::Result;
use gw_common::H256;
use gw_types::offchain::ErrorTxReceipt;
use rust_decimal::Decimal;

use crate::{
    helper::{hex, parse_log, GwLog},
    pool::POOL,
};

pub const MAX_RETURN_DATA: usize = 32;
pub const MAX_ERROR_TX_RECEIPT_BLOCKS: u64 = 3;

pub struct ErrorReceiptIndexer {
    latest_block: u64,
}

impl Default for ErrorReceiptIndexer {
    fn default() -> Self {
        Self::new()
    }
}

impl ErrorReceiptIndexer {
    pub fn new() -> Self {
        ErrorReceiptIndexer { latest_block: 0 }
    }

    async fn insert_error_tx_receipt(receipt: ErrorTxReceipt) -> Result<()> {
        let exit_code = receipt.exit_code;
        let record = ErrorReceiptRecord::from(receipt);
        log::debug!("error tx receipt record {:?}", record);

        let mut status_code = record.status_code;
        if status_code == 0 {
            status_code = exit_code as u32;
        }
        sqlx::query("INSERT INTO error_transactions (hash, block_number, cumulative_gas_used, gas_used, status_code, status_reason) VALUES ($1, $2, $3, $4, $5, $6)")
            .bind(hex(record.tx_hash.as_slice())?)
            .bind(Decimal::from(record.block_number))
            .bind(Decimal::from(record.cumulative_gas_used))
            .bind(Decimal::from(record.gas_used))
            .bind(Decimal::from(status_code))
            .bind(record.status_reason)
            .execute(&*POOL)
            .await?;

        Ok(())
    }

    async fn clear_expired_block_error_receipt(block_number: u64) -> Result<()> {
        let result = sqlx::query("DELETE FROM error_transactions WHERE block_number <= $1")
            .bind(Decimal::from(block_number))
            .execute(&*POOL)
            .await?;

        log::info!("delete error tx receipt {}", result.rows_affected());

        Ok(())
    }
}

impl ErrorReceiptIndexer {
    pub async fn handle_error_receipt(&mut self, receipt: ErrorTxReceipt) {
        if self.latest_block < receipt.block_number {
            self.latest_block = receipt.block_number;

            let expired_block = self
                .latest_block
                .saturating_sub(MAX_ERROR_TX_RECEIPT_BLOCKS);
            smol::spawn(async move {
                if let Err(err) = Self::clear_expired_block_error_receipt(expired_block).await {
                    log::error!("clear expired block error receipt {}", err);
                }
            })
            .detach();
        }

        if let Err(err) = Self::insert_error_tx_receipt(receipt).await {
            log::error!("insert error tx receipt {}", err);
        }
    }
}

#[derive(Debug)]
struct ErrorReceiptRecord {
    tx_hash: H256,
    block_number: u64,
    cumulative_gas_used: u64,
    gas_used: u64,
    status_code: u32,
    status_reason: Vec<u8>,
}

impl From<ErrorTxReceipt> for ErrorReceiptRecord {
    fn from(receipt: ErrorTxReceipt) -> Self {
        let status_reason_len = std::cmp::min(receipt.return_data.len(), MAX_RETURN_DATA);
        let basic_record = ErrorReceiptRecord {
            tx_hash: receipt.tx_hash,
            block_number: receipt.block_number,
            cumulative_gas_used: 0,
            gas_used: 0,
            status_code: 0,
            status_reason: receipt.return_data[..status_reason_len].to_vec(),
        };

        let gw_log = match receipt
            .last_log
            .map(|log| parse_log(&log, &basic_record.tx_hash))
            .transpose()
        {
            Ok(Some(log)) => log,
            Err(err) => {
                log::error!("[error receipt]: parse log error {}", err);
                return basic_record;
            }
            _ => return basic_record,
        };

        match gw_log {
            GwLog::PolyjuiceSystem {
                gas_used,
                cumulative_gas_used,
                created_address: _,
                status_code,
            } => {
                let is_string = |t: &ethabi::token::Token| -> bool {
                    matches!(t, ethabi::token::Token::String(_))
                };

                // First 4 bytes are func signature
                // receipt.return_data may empty
                let decode_data = receipt.return_data.get(4..).unwrap_or(&[]);
                let status_reason = match ethabi::decode(&[ethabi::ParamType::String], decode_data)
                {
                    Ok(tokens) if tokens.iter().all(is_string) => {
                        let mut reason = tokens
                            .into_iter()
                            .flat_map(ethabi::token::Token::into_string)
                            .collect::<Vec<String>>()
                            .join("");

                        reason.truncate(MAX_RETURN_DATA);
                        reason.as_bytes().to_vec()
                    }
                    _ => {
                        log::warn!("unsupported polyjuice reason {:?}", receipt.return_data);
                        basic_record.status_reason
                    }
                };

                ErrorReceiptRecord {
                    gas_used,
                    cumulative_gas_used,
                    status_code,
                    status_reason,
                    ..basic_record
                }
            }
            _ => basic_record,
        }
    }
}
