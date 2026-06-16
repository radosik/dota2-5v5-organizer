use serde::{Serialize, Serializer};

/// Application-wide error type returned from Tauri commands.
/// Serializes to a plain string so the frontend receives a readable message.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Ошибка базы данных: {0}")]
    Db(String),

    // Network/Invalid/Other carry already-localised, user-ready messages.
    #[error("{0}")]
    Network(String),

    #[error("Не найдено")]
    NotFound,

    #[error("{0}")]
    Invalid(String),

    #[error("{0}")]
    Other(String),
}

pub type AppResult<T> = Result<T, AppError>;

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self {
        AppError::Db(e.to_string())
    }
}

impl From<reqwest::Error> for AppError {
    fn from(e: reqwest::Error) -> Self {
        AppError::Network(e.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(e: serde_json::Error) -> Self {
        AppError::Other(e.to_string())
    }
}
