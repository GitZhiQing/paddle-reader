use thiserror::Error;

/// All fallible operations in the Rust backend map to this error.
/// Tauri serializes the `Display` string to the frontend as the `Err(String)`.
#[derive(Debug, Error)]
pub enum AppError {
    #[error("IO 错误: {0}")]
    Io(#[from] std::io::Error),

    #[error("网络请求失败: {0}")]
    Request(#[from] reqwest::Error),

    #[error("JSON 解析失败: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Base64 解码失败: {0}")]
    Base64(#[from] base64::DecodeError),

    #[error("Tauri 错误: {0}")]
    Tauri(#[from] tauri::Error),

    #[error("Store 错误: {0}")]
    Store(#[from] tauri_plugin_store::Error),

    #[error("配置缺失: {0}")]
    Config(String),

    #[error("OCR 服务返回错误: {0}")]
    Ocr(String),

    #[error("{0}")]
    Other(String),
}

impl From<AppError> for String {
    fn from(e: AppError) -> String {
        e.to_string()
    }
}

pub type AppResult<T> = Result<T, AppError>;
