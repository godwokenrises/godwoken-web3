//! jsonrpc response
use serde::{Deserialize, Serialize};

use jsonrpc_core::{Error, Id, Value, Version};

#[derive(Debug, PartialEq, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Success {
    HttpSuccess(HttpSuccess),
    WsSuccess(WsSuccess),
}

/// Successful response
#[derive(Debug, PartialEq, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct HttpSuccess {
    /// Protocol version
    #[serde(skip_serializing_if = "Option::is_none")]
    pub jsonrpc: Option<Version>,
    /// Result
    pub result: Value,
    /// Correlation id
    pub id: Id,
}

#[derive(Debug, PartialEq, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct WsSuccess {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub jsonrpc: Option<Version>,
    pub params: WsParams,
    pub method: String,
}

#[derive(Debug, PartialEq, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct WsParams {
    pub result: Value,
    pub subscription: String,
}

/// Unsuccessful response
#[derive(Debug, PartialEq, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Failure {
    /// Protocol Version
    #[serde(skip_serializing_if = "Option::is_none")]
    pub jsonrpc: Option<Version>,
    /// Error
    pub error: Error,
    /// Correlation id
    pub id: Id,
}

/// Represents output - failure or success
#[derive(Debug, PartialEq, Clone, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
#[serde(untagged)]
pub enum Output {
    /// Success
    Success(Success),
    /// Failure
    Failure(Failure),
}
