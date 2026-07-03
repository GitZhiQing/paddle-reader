//! Persist parsed-result images to app data and rewrite markdown paths.
//!
//! The API returns `markdown.images` as a map of { relativePath -> base64 OR url }.
//! We write each image to `<app_data>/assets/<attachment_id>/<name>` and rewrite the
//! markdown text so it references the on-disk path; the frontend then loads it via
//! Tauri's `convertFileSrc(path, 'asset')` asset protocol.

use crate::error::AppResult;
use std::path::{Path, PathBuf};

/// Sanitize an image key into a safe file name (strip any path components).
fn safe_name(key: &str) -> String {
    let p = Path::new(key);
    p.file_name()
        .and_then(|n| n.to_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| format!("image_{}", key.len()))
}

/// Persist all images of a single page and rewrite the markdown text.
///
/// `images` maps relative-path -> value, where value is either a base64 string or an
/// http(s) URL. Returns the markdown text with each relative path replaced by the
/// on-disk absolute path of the saved image.
pub async fn persist_and_rewrite(
    assets_root: &Path,
    attachment_id: &str,
    markdown_text: &str,
    images: &serde_json::Map<String, serde_json::Value>,
) -> AppResult<String> {
    use base64::Engine;

    let dir: PathBuf = assets_root.join(attachment_id);
    tokio::fs::create_dir_all(&dir).await?;

    let mut rewritten = markdown_text.to_string();
    let client = reqwest::Client::new();

    for (rel_path, value) in images.iter() {
        let name = safe_name(rel_path);
        let dest = dir.join(&name);

        match value {
            serde_json::Value::String(s) => {
                if s.starts_with("http://") || s.starts_with("https://") {
                    // URL form: download the bytes.
                    let bytes = client.get(s).send().await?.bytes().await?;
                    tokio::fs::write(&dest, &bytes).await?;
                } else {
                    // base64 form.
                    let bytes = base64::engine::general_purpose::STANDARD.decode(s.as_bytes())?;
                    tokio::fs::write(&dest, &bytes).await?;
                }
                if let Some(p) = dest.to_str() {
                    rewritten = rewritten.replace(rel_path, p);
                }
            }
            _ => continue,
        }
    }

    Ok(rewritten)
}
