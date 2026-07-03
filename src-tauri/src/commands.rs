//! Tauri commands exposed to the frontend.

use crate::error::{AppError, AppResult};
use crate::images::persist_and_rewrite;
use crate::ocr_client::{fetch_result, poll_until_done, submit_job, JsonlLine};
use crate::settings::Settings;
use serde::Serialize;
use std::path::Path;
use tauri::{AppHandle, Manager};

/// Default model — pinned by the app (shown read-only in Settings).
const MODEL: &str = "PaddleOCR-VL-1.6";

/// Result returned to the frontend for one parsed document.
#[derive(Debug, Serialize)]
pub struct ParseResult {
    /// Joined markdown across all pages (image paths rewritten to on-disk paths).
    pub markdown: String,
    pub page_count: usize,
}

/// `parse_document(filePath, fileType, attachmentId)` — read a file, submit it to the
/// PaddleOCR async API, poll for completion, persist returned images, and return joined
/// markdown.
#[tauri::command]
pub async fn parse_document(
    app: AppHandle,
    file_path: String,
    file_type: u8,
    attachment_id: String,
) -> Result<ParseResult, String> {
    parse_document_inner(&app, &file_path, file_type, &attachment_id)
        .await
        .map_err(Into::into)
}

async fn parse_document_inner(
    app: &AppHandle,
    file_path: &str,
    file_type: u8,
    attachment_id: &str,
) -> AppResult<ParseResult> {
    let settings = Settings::load(app)?;
    settings.require_credentials()?;

    let path = Path::new(file_path);
    let file_name = path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("document")
        .to_string();
    let bytes = tokio::fs::read(file_path).await?;

    // Map fileType + extension to a mime the multipart part advertises.
    let mime = mime_for(file_type, &file_name);

    let job_id = submit_job(
        &settings.api_url,
        &settings.token,
        MODEL,
        bytes,
        &file_name,
        &mime,
    )
    .await?;

    let json_url = poll_until_done(&settings.api_url, &settings.token, &job_id).await?;
    let lines = fetch_result(&json_url).await?;

    // app_data/assets is the asset-protocol scope root.
    let app_data = app.path().app_data_dir()?;
    let assets_root = app_data.join("assets");

    let (markdown, page_count) = join_results(&lines, &assets_root, attachment_id).await?;

    Ok(ParseResult {
        markdown,
        page_count,
    })
}

/// Flatten the JSONL lines into per-page markdown, persist & rewrite images, join pages
/// with a horizontal-rule page break.
async fn join_results(
    lines: &[JsonlLine],
    assets_root: &Path,
    attachment_id: &str,
) -> AppResult<(String, usize)> {
    let mut parts: Vec<String> = Vec::new();
    for line in lines {
        if line.error_code.unwrap_or(0) != 0 {
            return Err(AppError::Ocr(format!(
                "页面解析失败 [{}]: {}",
                line.error_code.unwrap_or(0),
                line.error_msg.as_deref().unwrap_or("?")
            )));
        }
        let Some(result) = &line.result else {
            continue;
        };
        for page in &result.layout_parsing_results {
            let text = persist_and_rewrite(
                assets_root,
                attachment_id,
                &page.markdown.text,
                &page.markdown.images,
            )
            .await?;
            parts.push(text);
        }
    }
    let page_count = parts.len();
    let joined = parts.join("\n\n---\n\n");
    Ok((joined, page_count))
}

/// Choose a mime type from fileType (0=pdf, 1=image) and extension.
fn mime_for(file_type: u8, file_name: &str) -> String {
    if file_type == 0 {
        return "application/pdf".to_string();
    }
    let ext = Path::new(file_name)
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_ascii_lowercase())
        .unwrap_or_default();
    match ext.as_str() {
        "png" => "image/png".to_string(),
        "jpg" | "jpeg" => "image/jpeg".to_string(),
        "webp" => "image/webp".to_string(),
        "bmp" => "image/bmp".to_string(),
        "gif" => "image/gif".to_string(),
        _ => "image/png".to_string(),
    }
}

/// `test_connection(apiUrl, token)` — verify credentials by submitting a minimal job to
/// the API. Returns a human-readable message. Uses a tiny synthetic PNG so it doesn't
/// require a user file, but does consume a tiny amount of daily page quota.
#[tauri::command]
pub async fn test_connection(
    app: AppHandle,
    api_url: String,
    token: String,
) -> Result<String, String> {
    match test_connection_inner(&app, &api_url, &token).await {
        Ok(msg) => Ok(msg),
        Err(e) => Err(e.to_string()),
    }
}

async fn test_connection_inner(_app: &AppHandle, api_url: &str, token: &str) -> AppResult<String> {
    if api_url.trim().is_empty() {
        return Err(AppError::Config("API URL 不能为空".into()));
    }
    if token.trim().is_empty() {
        return Err(AppError::Config("Token 不能为空".into()));
    }

    // Submit a 1x1 PNG (77 bytes) — a successful submission (jobId returned) proves auth +
    // endpoint + model are all valid. We do NOT poll to completion, to avoid spending page
    // quota; submission alone validates the connection.
    let probe_png: &[u8] = &[
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48,
        0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00,
        0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x44, 0x41, 0x54, 0x78,
        0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
    ];

    match submit_job(
        api_url,
        token,
        MODEL,
        probe_png.to_vec(),
        "connection_test.png",
        "image/png",
    )
    .await
    {
        Ok(job_id) => Ok(format!("连接成功（已提交测试任务 {job_id}）")),
        Err(e) => Err(AppError::Ocr(format!("连接失败：{e}"))),
    }
}

/// `get_settings()` — return current settings (model is always pinned).
#[tauri::command]
pub fn get_settings(app: AppHandle) -> Result<Settings, String> {
    let mut s = Settings::load(&app).map_err(|e| e.to_string())?;
    s.model = MODEL.to_string();
    Ok(s)
}

/// `save_settings(apiUrl, token)` — persist credentials.
#[tauri::command]
pub fn save_settings(app: AppHandle, api_url: String, token: String) -> Result<(), String> {
    let settings = Settings {
        api_url,
        token,
        model: MODEL.to_string(),
    };
    Settings::save(&app, &settings).map_err(|e| e.to_string())
}

/// Write base64-encoded data to `<app_data>/temp/<name>`, creating parent dirs as needed.
/// Returns the absolute file path so the frontend can feed it into `parse_document`.
#[tauri::command]
pub fn write_temp_file(app: AppHandle, name: String, data: String) -> Result<String, String> {
    use base64::Engine;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(data.as_bytes())
        .map_err(|e| format!("base64 解码失败: {e}"))?;
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let dir = app_data.join("temp");
    std::fs::create_dir_all(&dir).map_err(|e| format!("创建临时目录失败: {e}"))?;
    let path = dir.join(&name);
    std::fs::write(&path, &bytes).map_err(|e| format!("写入文件失败: {e}"))?;
    Ok(path.to_string_lossy().to_string())
}
