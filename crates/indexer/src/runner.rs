use gw_web3_rpc_client::{convertion::to_l2_block, godwoken_rpc_client::GodwokenRpcClient};
use rust_decimal::{prelude::ToPrimitive, Decimal};

use crate::{config::IndexerConfig, pool::POOL, Web3Indexer};
use anyhow::{anyhow, Result};

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
            config.tron_account_lock_hash,
            config.godwoken_rpc_url.as_str(),
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

    async fn get_db_tip_number(&self) -> Result<Option<u64>> {
        let row: Option<(Decimal,)> =
            sqlx::query_as("select number from blocks order by number desc limit 1;")
                .fetch_optional(&*POOL)
                .await?;
        let num = row.and_then(|(n,)| n.to_u64());
        Ok(num)
    }

    pub async fn insert(&mut self) -> Result<bool> {
        let local_tip = self.tip().await?;
        let current_block_number = match local_tip {
            None => 0,
            Some(t) => t + 1,
        };
        let current_block = self
            .godwoken_rpc_client
            .get_block_by_number(current_block_number)
            .map_err(|e| anyhow!("block #{} error! {}", current_block_number, e))?;

        if let Some(b) = current_block {
            let l2_block = to_l2_block(b);
            self.indexer.store_l2_block(l2_block).await?;
            log::info!("Sync block {}", current_block_number);
            self.bump_tip().await?;
            return Ok(true);
        }

        Ok(false)
    }

    pub async fn run(&mut self) -> Result<()> {
        loop {
            let result = self.insert().await?;

            if !result {
                let sleep_time = std::time::Duration::from_secs(3);
                std::thread::sleep(sleep_time);
            }
        }
    }
}
