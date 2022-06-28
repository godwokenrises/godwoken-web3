use ckb_types::prelude::Entity;
use gw_web3_rpc_client::{
    convertion::to_l2_block, error::RpcClientError, godwoken_rpc_client::GodwokenRpcClient,
};
use rust_decimal::{prelude::ToPrimitive, Decimal};

use crate::{config::IndexerConfig, pool::POOL, Web3Indexer};
use anyhow::Result;

pub struct Runner {
    indexer: Web3Indexer,
    local_tip: Option<u64>,
    godwoken_rpc_client: GodwokenRpcClient,
}

impl Runner {
    pub fn new(config: IndexerConfig) -> Result<Runner> {
        let indexer = Web3Indexer::new(
            config.l2_sudt_type_script_hash,
            config.polyjuice_type_script_hash,
            config.rollup_type_hash,
            config.eth_account_lock_hash,
            config.godwoken_rpc_url.as_str(),
            config.chain_id,
        );
        let godwoken_rpc_client = GodwokenRpcClient::new(config.godwoken_rpc_url.as_str());
        let runner = Runner {
            indexer,
            local_tip: None,
            godwoken_rpc_client,
        };
        Ok(runner)
    }

    // None means no local blocks
    pub async fn tip(&self) -> Result<Option<u64>> {
        let tip = match self.local_tip {
            Some(t) => Some(t),
            None => self.get_db_tip_number().await?,
        };
        Ok(tip)
    }

    pub async fn bump_tip(&mut self) -> Result<()> {
        match self.local_tip {
            None => {
                self.local_tip = if let Some(n) = self.get_db_tip_number().await? {
                    Some(n)
                } else {
                    Some(0)
                }
            }
            Some(t) => {
                self.local_tip = Some(t + 1);
            }
        }

        Ok(())
    }

    pub fn revert_tip(&mut self) -> Result<()> {
        if let Some(t) = self.local_tip {
            if t == 0 {
                self.local_tip = None;
            } else {
                self.local_tip = Some(t - 1);
            }
        }

        Ok(())
    }

    async fn get_db_tip_number(&self) -> Result<Option<u64>> {
        let row: Option<(Decimal,)> =
            sqlx::query_as("select number from blocks order by number desc limit 1;")
                .fetch_optional(&*POOL)
                .await?;

        let num = row.and_then(|(n,)| n.to_u64());
        Ok(num)
    }

    async fn get_db_block_hash(&self, block_number: u64) -> Result<Option<ckb_types::H256>> {
        let row: Option<(Vec<u8>,)> =
            sqlx::query_as("select hash from blocks where number = $1 limit 1;")
                .bind(Decimal::from(block_number))
                .fetch_optional(&*POOL)
                .await?;

        if let Some((block_hash_vec,)) = row {
            let block_hash = ckb_types::H256::from_slice(block_hash_vec.as_ref())?;
            return Ok(Some(block_hash));
        }
        Ok(None)
    }

    async fn delete_block(&self, block_number: u64) -> Result<()> {
        let number = Decimal::from(block_number);
        let pool = &*POOL;
        let mut tx = pool.begin().await?;
        sqlx::query("delete from logs where block_number = $1;")
            .bind(number)
            .execute(&mut tx)
            .await?;
        sqlx::query("delete from transactions where block_number = $1;")
            .bind(number)
            .execute(&mut tx)
            .await?;
        sqlx::query("delete from blocks where number = $1;")
            .bind(number)
            .execute(&mut tx)
            .await?;
        tx.commit().await?;
        Ok(())
    }

    pub async fn insert(&mut self) -> Result<bool> {
        let start = std::time::Instant::now();

        let local_tip = self.tip().await?;
        let current_block_number = match local_tip {
            None => 0,
            Some(t) => t + 1,
        };

        let current_block = self
            .godwoken_rpc_client
            .get_block_by_number(current_block_number)?;

        if let Some(b) = current_block {
            let l2_block = to_l2_block(b);
            let l2_block_parent_hash = l2_block.raw().parent_block_hash();

            if current_block_number > 0 {
                let prev_block_number = current_block_number - 1;
                let db_prev_block_hash = self.get_db_block_hash(prev_block_number).await?;
                if let Some(prev_block_hash) = db_prev_block_hash {
                    // if match, insert a new block
                    // if not match, delete prev block
                    if l2_block_parent_hash.as_slice() == prev_block_hash.as_bytes() {
                        let (txs_len, logs_len) = self.indexer.store_l2_block(l2_block).await?;

                        let duration = start.elapsed();
                        log::info!(
                            "Sync block {}, {} txs, {} logs, duration: {:?}",
                            current_block_number,
                            txs_len,
                            logs_len,
                            duration,
                        );
                        self.bump_tip().await?;
                    } else {
                        self.delete_block(prev_block_number).await?;
                        log::info!("Rollback block {}", prev_block_number);
                        self.revert_tip()?;
                    }
                }
            } else {
                let (txs_len, logs_len) = self.indexer.store_l2_block(l2_block).await?;

                let duration = start.elapsed();
                log::info!(
                    "Sync block {}, {} txs, {} logs, duration: {:?}",
                    current_block_number,
                    txs_len,
                    logs_len,
                    duration,
                );
                self.bump_tip().await?;
            }

            return Ok(true);
        }

        Ok(false)
    }

    pub async fn run(&mut self) -> Result<()> {
        loop {
            match self.insert().await {
                Ok(result) => {
                    if !result {
                        let sleep_time = std::time::Duration::from_secs(1);
                        smol::Timer::after(sleep_time).await;
                    }
                }
                Err(err) => {
                    let err_ref = err.downcast_ref::<RpcClientError>();
                    if let Some(RpcClientError::ConnectionError(_, _)) = err_ref {
                        log::error!("{}", err);
                        // wait for 1s
                        let sleep_time = std::time::Duration::from_secs(1);
                        smol::Timer::after(sleep_time).await;
                        continue;
                    };
                    return Err(err);
                }
            };
        }
    }
}
