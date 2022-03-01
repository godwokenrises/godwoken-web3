use std::collections::HashSet;

use crate::{
    helper::{
        account_script_hash_to_eth_address, hex, parse_log, GwLog, PolyjuiceArgs,
        GW_LOG_POLYJUICE_SYSTEM,
    },
    pool::POOL,
    types::{
        Block as Web3Block, Log as Web3Log, Transaction as Web3Transaction,
        TransactionWithLogs as Web3TransactionWithLogs,
    },
};
use anyhow::{anyhow, Result};
use ckb_hash::blake2b_256;
use ckb_types::H256;
use gw_common::builtins::CKB_SUDT_ACCOUNT_ID;
use gw_types::{
    bytes::Bytes,
    packed::{L2Block, SUDTArgs, SUDTArgsUnion, Script},
    prelude::Unpack as GwUnpack,
    prelude::*,
};
use gw_web3_rpc_client::{convertion, godwoken_rpc_client::GodwokenRpcClient};
use rust_decimal::{prelude::ToPrimitive, Decimal};
use sqlx::types::chrono::{DateTime, NaiveDateTime, Utc};

const MILLIS_PER_SEC: u64 = 1_000;
pub struct Web3Indexer {
    l2_sudt_type_script_hash: H256,
    polyjuice_type_script_hash: H256,
    rollup_type_hash: H256,
    allowed_eoa_hashes: HashSet<H256>,
    godwoken_rpc_client: GodwokenRpcClient,
}

impl Web3Indexer {
    pub fn new(
        l2_sudt_type_script_hash: H256,
        polyjuice_type_script_hash: H256,
        rollup_type_hash: H256,
        eth_account_lock_hash: H256,
        tron_account_lock_hash: Option<H256>,
        gw_rpc_url: &str,
    ) -> Self {
        let mut allowed_eoa_hashes = HashSet::default();
        allowed_eoa_hashes.insert(eth_account_lock_hash);
        if let Some(code_hash) = tron_account_lock_hash {
            allowed_eoa_hashes.insert(code_hash);
        };
        let godwoken_rpc_client = GodwokenRpcClient::new(gw_rpc_url);

        Web3Indexer {
            l2_sudt_type_script_hash,
            polyjuice_type_script_hash,
            rollup_type_hash,
            allowed_eoa_hashes,
            godwoken_rpc_client,
        }
    }

    pub async fn store_l2_block(&self, l2_block: L2Block) -> Result<()> {
        let number: u64 = l2_block.raw().number().unpack();
        let local_tip_number = self.tip_number().await?.unwrap_or(0);
        if number > local_tip_number || self.query_number(number).await?.is_none() {
            self.insert_l2block(l2_block).await?;
            log::debug!("web3 indexer: sync new block #{}", number);
        }
        Ok(())
    }

    async fn query_number(&self, number: u64) -> Result<Option<u64>> {
        let row: Option<(Decimal,)> = sqlx::query_as(&format!(
            "SELECT number FROM blocks WHERE number={} LIMIT 1",
            number
        ))
        .fetch_optional(&*POOL)
        .await?;
        Ok(row.and_then(|(n,)| n.to_u64()))
    }

    async fn tip_number(&self) -> Result<Option<u64>> {
        let row: Option<(Decimal,)> =
            sqlx::query_as("SELECT number FROM blocks ORDER BY number DESC LIMIT 1")
                .fetch_optional(&*POOL)
                .await?;
        Ok(row.and_then(|(n,)| n.to_u64()))
    }

    async fn insert_l2block(&self, l2_block: L2Block) -> Result<()> {
        let web3_tx_with_logs_vec = self.filter_web3_transactions(l2_block.clone()).await?;
        let web3_block = self
            .build_web3_block(&l2_block, &web3_tx_with_logs_vec)
            .await?;

        let pool = &*POOL;
        let mut tx = pool.begin().await?;
        sqlx::query("INSERT INTO blocks (number, hash, parent_hash, logs_bloom, gas_limit, gas_used, timestamp, miner, size) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)")
            .bind(Decimal::from(web3_block.number))
            .bind(hex(web3_block.hash.as_slice())?)
            .bind(hex(web3_block.parent_hash.as_slice())?)
            .bind(hex(&web3_block.logs_bloom)?)
            .bind(Decimal::from(web3_block.gas_limit))
            .bind(Decimal::from(web3_block.gas_used))
            .bind(web3_block.timestamp)
            .bind(hex(&web3_block.miner)?)
            .bind(Decimal::from(web3_block.size))
            .execute(&mut tx).await?;
        for web3_tx_with_logs in web3_tx_with_logs_vec {
            let web3_tx = web3_tx_with_logs.tx;
            let web3_to_address_hex = match web3_tx.to_address {
                Some(addr) => Some(hex(&addr)?),
                None => None,
            };
            let web3_contract_address_hex = match web3_tx.contract_address {
                Some(addr) => Some(hex(&addr)?),
                None => None,
            };
            let  (transaction_id,): (i64,) =
            sqlx::query_as("INSERT INTO transactions
            (hash, eth_tx_hash, block_number, block_hash, transaction_index, from_address, to_address, value, nonce, gas_limit, gas_price, input, v, r, s, cumulative_gas_used, gas_used, logs_bloom, contract_address, status) 
            VALUES 
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) RETURNING ID")
            .bind(hex(web3_tx.gw_tx_hash.as_slice())?)
            .bind(hex(web3_tx.compute_eth_tx_hash().as_slice())?)
            .bind(Decimal::from(web3_tx.block_number))
            .bind(hex(web3_tx.block_hash.as_slice())?)
            .bind(web3_tx.transaction_index)
            .bind(hex(&web3_tx.from_address)?)
            .bind(web3_to_address_hex)
            .bind(Decimal::from(web3_tx.value))
            .bind(Decimal::from(web3_tx.nonce))
            .bind(Decimal::from(web3_tx.gas_limit))
            .bind(Decimal::from(web3_tx.gas_price))
            .bind(hex(&web3_tx.data)?)
            .bind(Decimal::from(web3_tx.v))
            .bind(hex(&web3_tx.r)?)
            .bind(hex(&web3_tx.s)?)
            .bind(Decimal::from(web3_tx.cumulative_gas_used))
            .bind(Decimal::from(web3_tx.gas_used))
            .bind(hex(&web3_tx.logs_bloom)?)
            .bind(web3_contract_address_hex)
            .bind(web3_tx.status)
            .fetch_one(&mut tx)
            .await?;

            let web3_logs = web3_tx_with_logs.logs;
            for log in web3_logs {
                let mut topics_hex = vec![];
                for topic in log.topics {
                    let topic_hex = hex(topic.as_slice())?;
                    topics_hex.push(topic_hex);
                }
                sqlx::query("INSERT INTO logs
                (transaction_id, transaction_hash, transaction_index, block_number, block_hash, address, data, log_index, topics)
                VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8, $9)")
                .bind(transaction_id)
                .bind(hex(log.transaction_hash.as_slice())?)
                .bind(log.transaction_index)
                .bind(Decimal::from(log.block_number))
                .bind(hex(log.block_hash.as_slice())?)
                .bind(hex(&log.address)?)
                .bind(hex(&log.data)?)
                .bind(log.log_index)
                .bind(topics_hex)
                .execute(&mut tx)
                .await?;
            }
        }
        tx.commit().await?;
        Ok(())
    }

    async fn filter_web3_transactions(
        &self,
        l2_block: L2Block,
    ) -> Result<Vec<Web3TransactionWithLogs>> {
        let block_number = l2_block.raw().number().unpack();
        let block_hash: gw_common::H256 = blake2b_256(l2_block.raw().as_slice()).into();
        let mut cumulative_gas_used = 0;
        let l2_transactions = l2_block.transactions();
        let mut web3_tx_with_logs_vec: Vec<Web3TransactionWithLogs> = vec![];
        let mut tx_index = 0u32;
        for l2_transaction in l2_transactions {
            let gw_tx_hash: gw_common::H256 = l2_transaction.hash().into();
            let from_id: u32 = l2_transaction.raw().from_id().unpack();
            let from_script_hash = get_script_hash(&self.godwoken_rpc_client, from_id).await?;
            let from_script = get_script(&self.godwoken_rpc_client, from_script_hash)
                .await?
                .ok_or_else(|| {
                    anyhow!("Can't get script by script_hash: {:?}", from_script_hash)
                })?;
            let from_script_code_hash: H256 = from_script.code_hash().unpack();
            // skip tx not in the allowed eoa account lock
            if !self.allowed_eoa_hashes.contains(&from_script_code_hash) {
                continue;
            }
            // from_address is the script's args in eth account lock
            let from_script_args = from_script.args().raw_data();
            if from_script_args.len() != 52 && from_script_args[0..32] == self.rollup_type_hash.0 {
                return Err(anyhow!(
                    "Wrong from_address's script args, from_script_args: {:?}",
                    from_script_args
                ));
            }
            let from_address = {
                let mut buf = [0u8; 20];
                buf.copy_from_slice(&from_script_args[32..52]);
                buf
            };

            // extract to_id corresponding script, check code_hash is either polyjuice contract code_hash or sudt contract code_hash
            let to_id = l2_transaction.raw().to_id().unpack();
            let to_script_hash = get_script_hash(&self.godwoken_rpc_client, to_id).await?;
            let to_script = get_script(&self.godwoken_rpc_client, to_script_hash)
                .await?
                .ok_or_else(|| anyhow!("Can't get script by script_hash: {:?}", to_script_hash))?;

            // assume the signature is compatible if length is 65, otherwise return zero
            let signature: [u8; 65] = if l2_transaction.signature().len() == 65 {
                let signature: Bytes = l2_transaction.signature().unpack();
                let mut buf = [0u8; 65];
                buf.copy_from_slice(&signature);
                buf
            } else {
                [0u8; 65]
            };

            let r = {
                let mut buf = [0u8; 32];
                buf.copy_from_slice(&signature[0..32]);
                buf
            };
            let s = {
                let mut buf = [0u8; 32];
                buf.copy_from_slice(&signature[32..64]);
                buf
            };
            let v: u64 = signature[64].into();

            if to_script.code_hash().as_slice() == self.polyjuice_type_script_hash.0 {
                let l2_tx_args = l2_transaction.raw().args();
                let polyjuice_args = PolyjuiceArgs::decode(l2_tx_args.raw_data().as_ref())?;
                // to_address is null if it's a contract deployment transaction
                let (to_address, polyjuice_chain_id) = if polyjuice_args.is_create {
                    (None, to_id)
                } else {
                    let address = account_script_hash_to_eth_address(to_script_hash);
                    let polyjuice_chain_id = {
                        let mut data = [0u8; 4];
                        data.copy_from_slice(&to_script.args().raw_data()[32..36]);
                        u32::from_le_bytes(data)
                    };
                    (Some(address), polyjuice_chain_id)
                };
                // calculate chain_id
                let chain_id: u64 = polyjuice_chain_id as u64;
                let nonce: u32 = l2_transaction.raw().nonce().unpack();
                let input = polyjuice_args.input.clone().unwrap_or_default();

                // read logs
                let tx_hash = ckb_types::H256::from_slice(gw_tx_hash.as_slice())?;
                let tx_receipt: gw_types::packed::TxReceipt = self
                    .godwoken_rpc_client
                    .get_transaction_receipt(&tx_hash)?
                    .ok_or_else(|| anyhow!("tx receipt not found"))?
                    .into();
                let log_item_vec = tx_receipt.logs();

                // read polyjuice system log
                let polyjuice_system_log = parse_log(
                    log_item_vec
                        .clone()
                        .into_iter()
                        .find(|item| u8::from(item.service_flag()) == GW_LOG_POLYJUICE_SYSTEM)
                        .as_ref()
                        .ok_or_else(|| anyhow!("no system logs"))?,
                )?;

                let (contract_address, tx_gas_used) = if let GwLog::PolyjuiceSystem {
                    gas_used,
                    cumulative_gas_used: _,
                    created_address,
                    status_code: _,
                } = polyjuice_system_log
                {
                    let tx_gas_used = gas_used.into();
                    cumulative_gas_used += tx_gas_used;
                    let contract_address =
                        if polyjuice_args.is_create && created_address != [0u8; 20] {
                            Some(created_address)
                        } else {
                            None
                        };
                    (contract_address, tx_gas_used)
                } else {
                    return Err(anyhow!(
                        "can't find polyjuice system log from logs: tx_hash: {}",
                        hex(gw_tx_hash.as_slice())?
                    ));
                };

                let web3_transaction = Web3Transaction::new(
                    gw_tx_hash,
                    Some(chain_id),
                    block_number,
                    block_hash,
                    tx_index,
                    from_address,
                    to_address,
                    polyjuice_args.value,
                    nonce,
                    polyjuice_args.gas_limit.into(),
                    polyjuice_args.gas_price,
                    input,
                    r,
                    s,
                    v,
                    cumulative_gas_used,
                    tx_gas_used,
                    Vec::new(),
                    contract_address,
                    true,
                );

                let web3_logs = {
                    let mut logs: Vec<Web3Log> = vec![];
                    let mut log_index = 0;
                    for log_item in log_item_vec {
                        let log = parse_log(&log_item)?;
                        match log {
                            GwLog::PolyjuiceSystem { .. } => {
                                // we already handled this
                            }
                            GwLog::PolyjuiceUser {
                                address,
                                data,
                                topics,
                            } => {
                                let web3_log = Web3Log::new(
                                    gw_tx_hash,
                                    tx_index,
                                    block_number,
                                    block_hash,
                                    address,
                                    data,
                                    log_index,
                                    topics,
                                );
                                logs.push(web3_log);
                                log_index += 1;
                            }
                            // TODO: Given the fact that Ethereum doesn't emit event for native ether transfer at system level, the SudtTransfer/SudtPayFee logs in polyjuice provide more info than we need here and could be ignored so far.
                            GwLog::SudtTransfer { .. } => {}
                            GwLog::SudtPayFee { .. } => {}
                        }
                    }
                    logs
                };

                let web3_tx_with_logs = Web3TransactionWithLogs {
                    tx: web3_transaction,
                    logs: web3_logs,
                };
                web3_tx_with_logs_vec.push(web3_tx_with_logs);
                tx_index += 1;
            } else if to_id == CKB_SUDT_ACCOUNT_ID
                && to_script.code_hash().as_slice() == self.l2_sudt_type_script_hash.0
            {
                // deal with SUDT transfer
                let sudt_args =
                    SUDTArgs::from_slice(l2_transaction.raw().args().raw_data().as_ref())?;
                match sudt_args.to_enum() {
                    SUDTArgsUnion::SUDTTransfer(sudt_transfer) => {
                        // Since we can transfer to any non-exists account, we can not check the script.code_hash.
                        let to_address_data: Bytes = sudt_transfer.to().unpack();
                        if to_address_data.len() != 20 {
                            continue;
                        }
                        let mut to_address = [0u8; 20];
                        to_address.copy_from_slice(to_address_data.as_ref());

                        let amount: u128 = sudt_transfer.amount().unpack();
                        let fee: u64 = sudt_transfer.fee().unpack();
                        let value = amount;

                        // Represent SUDTTransfer fee in web3 style, set gas_price as 1 temporary.
                        let gas_price = 1;
                        let gas_limit = fee.into();
                        cumulative_gas_used += gas_limit;

                        let nonce: u32 = l2_transaction.raw().nonce().unpack();

                        let web3_transaction = Web3Transaction::new(
                            gw_tx_hash,
                            None,
                            block_number,
                            block_hash,
                            tx_index,
                            from_address,
                            Some(to_address),
                            value,
                            nonce,
                            gas_limit,
                            gas_price,
                            Vec::new(),
                            r,
                            s,
                            v,
                            cumulative_gas_used,
                            gas_limit,
                            Vec::new(),
                            None,
                            true,
                        );

                        let web3_tx_with_logs = Web3TransactionWithLogs {
                            tx: web3_transaction,
                            logs: vec![],
                        };
                        web3_tx_with_logs_vec.push(web3_tx_with_logs);
                    }
                    SUDTArgsUnion::SUDTQuery(_sudt_query) => {}
                }
                tx_index += 1;
            }
        }
        Ok(web3_tx_with_logs_vec)
    }

    async fn build_web3_block(
        &self,
        l2_block: &L2Block,
        web3_tx_with_logs_vec: &[Web3TransactionWithLogs],
    ) -> Result<Web3Block> {
        let block_number = l2_block.raw().number().unpack();
        let block_hash: gw_common::H256 = l2_block.hash().into();
        let parent_hash: gw_common::H256 = l2_block.raw().parent_block_hash().unpack();
        let mut gas_limit = 0;
        let mut gas_used = 0;
        for web3_tx_with_logs in web3_tx_with_logs_vec {
            gas_limit += web3_tx_with_logs.tx.gas_limit;
            gas_used += web3_tx_with_logs.tx.gas_used;
        }
        let block_producer_id: u32 = l2_block.raw().block_producer_id().unpack();
        let block_producer_script_hash =
            get_script_hash(&self.godwoken_rpc_client, block_producer_id).await?;
        let miner_address = account_script_hash_to_eth_address(block_producer_script_hash);
        let epoch_time_as_millis: u64 = l2_block.raw().timestamp().unpack();
        let timestamp =
            NaiveDateTime::from_timestamp((epoch_time_as_millis / MILLIS_PER_SEC) as i64, 0);
        let size = l2_block.raw().as_slice().len();
        let web3_block = Web3Block {
            number: block_number,
            hash: block_hash,
            parent_hash,
            logs_bloom: Vec::new(),
            gas_limit,
            gas_used,
            miner: miner_address,
            size,
            timestamp: DateTime::<Utc>::from_utc(timestamp, Utc),
        };
        Ok(web3_block)
    }
}

async fn get_script_hash(
    godwoken_rpc_client: &GodwokenRpcClient,
    account_id: u32,
) -> Result<gw_common::H256> {
    let script_hash = godwoken_rpc_client.get_script_hash(account_id)?;

    let hash: gw_common::H256 = {
        let mut s = [0u8; 32];
        s.copy_from_slice(script_hash.as_bytes());
        s.into()
    };
    Ok(hash)
}

async fn get_script(
    godwoken_rpc_client: &GodwokenRpcClient,
    script_hash: gw_common::H256,
) -> Result<Option<Script>> {
    let hash = ckb_types::H256::from_slice(script_hash.as_slice())?;

    let script_opt = godwoken_rpc_client
        .get_script(hash)?
        .map(convertion::to_script);

    Ok(script_opt)
}
