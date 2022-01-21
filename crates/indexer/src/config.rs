use std::{fmt, fmt::Display, fs, path::Path};

use anyhow::Result;
use ckb_types::H256;
use serde::{Deserialize, Serialize};

#[derive(Clone, Default, Debug, PartialEq, Serialize, Deserialize)]
pub struct IndexerConfig {
    pub l2_sudt_type_script_hash: H256,
    pub polyjuice_type_script_hash: H256,
    pub rollup_type_hash: H256,
    pub eth_account_lock_hash: H256,
    pub tron_account_lock_hash: Option<H256>,
    pub godwoken_rpc_url: String,
    pub ws_rpc_url: String,
    pub pg_url: String,
    pub sentry_dsn: Option<String>,
    pub sentry_environment: Option<String>,
}

impl Display for IndexerConfig {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "IndexerConfig {{ ")?;
        write!(
            f,
            "l2_sudt_type_script_hash: 0x{}, ",
            self.l2_sudt_type_script_hash
        )?;
        write!(
            f,
            "polyjuice_type_script_hash: 0x{}, ",
            self.polyjuice_type_script_hash
        )?;
        write!(f, "rollup_type_hash: 0x{}, ", self.rollup_type_hash)?;
        write!(
            f,
            "eth_account_lock_hash: 0x{}, ",
            self.eth_account_lock_hash
        )?;
        if let Some(t) = &self.tron_account_lock_hash {
            write!(f, "tron_account_lock_hash: 0x{}, ", t)?;
        } else {
            write!(f, "tron_account_lock_hash: null, ")?;
        }
        write!(f, "godwoken_rpc_url: {}, ", self.godwoken_rpc_url)?;
        write!(f, "ws_rpc_url: {}, ", self.ws_rpc_url)?;
        write!(f, "pg_url: {}", self.pg_url)?;
        if let Some(t) = &self.sentry_dsn {
            write!(f, "sentry_dsn: {}, ", t)?;
        } else {
            write!(f, "sentry_dsn: null, ")?;
        }
        if let Some(t) = &self.sentry_environment {
            write!(f, "sentry_environment: {}, ", t)?;
        } else {
            write!(f, "sentry_environment: null, ")?;
        }
        write!(f, " }}")
    }
}

// Read indexer-config.toml
pub fn read_indexer_config<P: AsRef<Path>>(path: P) -> Result<IndexerConfig> {
    let content = fs::read(&path)?;
    let config = toml::from_slice(&content)?;
    Ok(config)
}
