use thiserror::Error;

#[derive(Error, Debug)]
pub enum IndexerError {
    #[error("connection failed by: {0}, error: {1}")]
    ConnectionError(String, anyhow::Error),
}
