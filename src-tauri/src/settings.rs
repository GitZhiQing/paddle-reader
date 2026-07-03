use crate::error::{AppError, AppResult};
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

/// The store file name holding app configuration (apiUrl, token, ...).
const STORE_FILE: &str = "settings.json";

/// Full settings model read from / written to the store.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default)]
pub struct Settings {
    #[serde(rename = "apiUrl", default)]
    pub api_url: String,
    #[serde(rename = "token", default)]
    pub token: String,
    #[serde(rename = "model", default = "default_model")]
    pub model: String,
}

fn default_model() -> String {
    "PaddleOCR-VL-1.6".to_string()
}


impl Settings {
    /// Load settings from the store; returns defaults (empty creds) if absent.
    pub fn load(app: &AppHandle) -> AppResult<Self> {
        let store = app.store(STORE_FILE)?;
        let value = store.get("settings");
        match value {
            Some(v) => Ok(serde_json::from_value(v).unwrap_or_default()),
            None => Ok(Settings::default()),
        }
    }

    /// Persist the given settings under the `settings` key.
    pub fn save(app: &AppHandle, settings: &Settings) -> AppResult<()> {
        let store = app.store(STORE_FILE)?;
        let value = serde_json::to_value(settings)?;
        store.set("settings", value);
        store.save()?;
        Ok(())
    }

    /// Validate that the credentials needed to call the OCR API are present.
    pub fn require_credentials(&self) -> AppResult<()> {
        if self.api_url.trim().is_empty() {
            return Err(AppError::Config("未配置 API URL".into()));
        }
        if self.token.trim().is_empty() {
            return Err(AppError::Config("未配置 Token".into()));
        }
        Ok(())
    }
}
