use anyhow::{anyhow, Result};
use gw_common::H256;
use gw_types::packed::LogItem;
use gw_types::prelude::*;
use gw_web3_rpc_client::godwoken_rpc_client::GodwokenRpcClient;
use std::{convert::TryInto, usize};

// 128KB
pub const GW_L2TX_ARGS_MAX_SIZE: u32 = 128 * 1024;
// 4KB
pub const GW_USER_LOG_DATA_MAX_SIZE: u32 = 4 * 1024;

pub const GW_LOG_SUDT_TRANSFER: u8 = 0x0;
pub const GW_LOG_SUDT_PAY_FEE: u8 = 0x1;
pub const GW_LOG_POLYJUICE_SYSTEM: u8 = 0x2;
pub const GW_LOG_POLYJUICE_USER: u8 = 0x3;
#[derive(Default, Debug)]
pub struct PolyjuiceArgs {
    pub is_create: bool,
    pub gas_limit: u64,
    pub gas_price: u128,
    pub value: u128,
    pub input: Option<Vec<u8>>,
}

impl PolyjuiceArgs {
    // https://github.com/nervosnetwork/godwoken-polyjuice/blob/v0.6.0-rc1/polyjuice-tests/src/helper.rs#L322
    pub fn decode(args: &[u8]) -> anyhow::Result<Self> {
        if args.len() < 52 {
            return Err(anyhow!("polyjuice args too short: 0x{}", hex(args)?));
        }
        let is_create = args[7] == 3u8;
        let gas_limit = u64::from_le_bytes(args[8..16].try_into()?);
        let gas_price = u128::from_le_bytes(args[16..32].try_into()?);
        let value = u128::from_le_bytes(args[32..48].try_into()?);
        let input_size = u32::from_le_bytes(args[48..52].try_into()?);
        if input_size > GW_L2TX_ARGS_MAX_SIZE {
            return Err(anyhow!(
                "Polyjuice args input size too long: {}",
                input_size
            ));
        }
        if args.len() < 52 + input_size as usize {
            return Err(anyhow!(
                "polyjuice args input data too short: 0x{}",
                hex(args)?
            ));
        }
        let input: Vec<u8> = args[52..(52 + input_size as usize)].to_vec();
        Ok(PolyjuiceArgs {
            is_create,
            gas_limit,
            gas_price,
            value,
            input: Some(input),
        })
    }
}

pub fn account_script_hash_to_eth_address(
    account_script_hash: H256,
    godwoken_rpc_client: &GodwokenRpcClient,
) -> Result<[u8; 20]> {
    let script_hash: ckb_types::H256 = {
        let mut s = [0u8; 32];
        s.copy_from_slice(account_script_hash.as_slice());
        s.into()
    };
    let account_script = godwoken_rpc_client.get_script(script_hash)?;
    let eth_address = if let Some(script) = account_script {
        let args = script.args.as_bytes();
        if args.len() < 52 {
            log::error!(
                "account script hash {} not found corresponding eth address, script args too short",
                hex(account_script_hash.as_slice())?
            );
            [0u8; 20]
        } else {
            let mut s = [0u8; 20];
            s.copy_from_slice(&args[32..]);
            s
        }
    } else {
        log::error!(
            "account script hash {} not found corresponding eth address, script not found",
            hex(account_script_hash.as_slice())?
        );
        [0u8; 20]
    };
    Ok(eth_address)
}

#[derive(Debug, Clone)]
pub enum GwLog {
    SudtTransfer {
        sudt_id: u32,
        from_address: [u8; 20],
        to_address: [u8; 20],
        amount: u128,
    },
    SudtPayFee {
        sudt_id: u32,
        from_address: [u8; 20],
        block_producer_address: [u8; 20],
        amount: u128,
    },
    PolyjuiceSystem {
        gas_used: u64,
        cumulative_gas_used: u64,
        created_address: [u8; 20],
        status_code: u32,
    },
    PolyjuiceUser {
        address: [u8; 20],
        data: Vec<u8>,
        topics: Vec<H256>,
    },
}

fn parse_sudt_log_data(data: &[u8]) -> ([u8; 20], [u8; 20], u128) {
    assert_eq!(data[0], 20);
    let mut from_address = [0u8; 20];
    from_address.copy_from_slice(&data[1..21]);

    let mut to_address = [0u8; 20];
    to_address.copy_from_slice(&data[21..41]);

    let mut u128_bytes = [0u8; 16];
    u128_bytes.copy_from_slice(&data[41..57]);
    let amount = u128::from_le_bytes(u128_bytes);
    (from_address, to_address, amount)
}

pub fn parse_log(item: &LogItem) -> Result<GwLog> {
    let service_flag: u8 = item.service_flag().into();
    let raw_data = item.data().raw_data();
    let data = raw_data.as_ref();
    match service_flag {
        GW_LOG_SUDT_TRANSFER => {
            let sudt_id: u32 = item.account_id().unpack();
            if data.len() != (1 + 20 + 20 + 16) {
                return Err(anyhow!("Invalid data length: {}", data.len()));
            }
            let (from_address, to_address, amount) = parse_sudt_log_data(data);
            Ok(GwLog::SudtTransfer {
                sudt_id,
                from_address,
                to_address,
                amount,
            })
        }
        GW_LOG_SUDT_PAY_FEE => {
            let sudt_id: u32 = item.account_id().unpack();
            if data.len() != (1 + 20 + 20 + 16) {
                return Err(anyhow!("Invalid data length: {}", data.len()));
            }
            let (from_address, block_producer_address, amount) = parse_sudt_log_data(data);
            Ok(GwLog::SudtPayFee {
                sudt_id,
                from_address,
                block_producer_address,
                amount,
            })
        }
        GW_LOG_POLYJUICE_SYSTEM => {
            if data.len() != (8 + 8 + 20 + 4) {
                return Err(anyhow!(
                    "invalid system log raw data length: {}",
                    data.len()
                ));
            }

            let mut u64_bytes = [0u8; 8];
            u64_bytes.copy_from_slice(&data[0..8]);
            let gas_used = u64::from_le_bytes(u64_bytes);
            u64_bytes.copy_from_slice(&data[8..16]);
            let cumulative_gas_used = u64::from_le_bytes(u64_bytes);

            let created_address = {
                let mut buf = [0u8; 20];
                buf.copy_from_slice(&data[16..36]);
                buf
            };
            let mut u32_bytes = [0u8; 4];
            u32_bytes.copy_from_slice(&data[36..40]);
            let status_code = u32::from_le_bytes(u32_bytes);
            Ok(GwLog::PolyjuiceSystem {
                gas_used,
                cumulative_gas_used,
                created_address,
                status_code,
            })
        }
        GW_LOG_POLYJUICE_USER => {
            if data.len() < 24 {
                return Err(anyhow!("invalid user log data length: {}", data.len()));
            }
            let mut offset: usize = 0;
            let mut address = [0u8; 20];
            address.copy_from_slice(&data[offset..offset + 20]);
            offset += 20;
            let mut data_size_bytes = [0u8; 4];
            data_size_bytes.copy_from_slice(&data[offset..offset + 4]);
            offset += 4;
            let data_size: u32 = u32::from_le_bytes(data_size_bytes);
            if data_size > GW_USER_LOG_DATA_MAX_SIZE {
                return Err(anyhow!("user log data size too large: {}", data_size));
            }
            if data.len() < offset + data_size as usize {
                return Err(anyhow!("invalid user log data size: {}", data_size));
            }
            let mut log_data = vec![0u8; data_size as usize];
            log_data.copy_from_slice(&data[offset..offset + (data_size as usize)]);
            offset += data_size as usize;
            log::debug!("data_size: {}", data_size);

            let mut topics_count_bytes = [0u8; 4];
            topics_count_bytes.copy_from_slice(&data[offset..offset + 4]);
            offset += 4;
            let topics_count: u32 = u32::from_le_bytes(topics_count_bytes);
            let mut topics = Vec::new();
            log::debug!("topics_count: {}", topics_count);
            for _ in 0..topics_count {
                if data.len() < offset + 32 {
                    return Err(anyhow!("invalid user log data"));
                }
                let mut topic = [0u8; 32];
                topic.copy_from_slice(&data[offset..offset + 32]);
                offset += 32;
                topics.push(topic.into());
            }
            if offset != data.len() {
                return Err(anyhow!(
                    "Too many bytes for polyjuice user log data: offset={}, data.len()={}",
                    offset,
                    data.len()
                ));
            }
            Ok(GwLog::PolyjuiceUser {
                address,
                data: log_data,
                topics,
            })
        }
        _ => Err(anyhow!("invalid log service flag: {}", service_flag)),
    }
}

pub fn hex(raw: &[u8]) -> Result<String> {
    Ok(format!("0x{}", faster_hex::hex_string(raw)?))
}
