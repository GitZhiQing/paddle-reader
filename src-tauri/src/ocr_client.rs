//! PaddleOCR *async jobs* API client.
//!
//! Verified contract (live test 2026-07-03). Three steps:
//!  1. Submit: `POST {api_url}` as multipart/form-data -> `data.jobId`.
//!  2. Poll:   `GET  {api_url}/{jobId}` until `data.state == "done"` (or "failed").
//!  3. Fetch:  `GET  data.resultUrl.jsonUrl` -> JSONL, one line per page.
//!
//! Auth header is `Authorization: bearer <token>`. Each JSONL line is
//! `{ result: { layoutParsingResults: [ { markdown: { text, images }, ... } ] } }`.
//! `markdown.images` values are HTTP URLs (fetch the bytes), not base64.

use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use std::time::Duration;

/// Polling interval between status checks.
const POLL_INTERVAL: Duration = Duration::from_millis(2000);
/// Upper bound on polling before we give up (jobs can take minutes for big PDFs).
const POLL_TIMEOUT: Duration = Duration::from_secs(600);

/// `optionalPayload` defaults — disabled preprocessing for speed.
fn default_optional_payload() -> serde_json::Value {
    serde_json::json!({
        "useDocOrientationClassify": false,
        "useDocUnwarping": false,
        "useChartRecognition": false,
    })
}

/// One page of the parsed result.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct LayoutParsingResult {
    #[serde(default)]
    pub markdown: Markdown,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct Markdown {
    #[serde(default)]
    pub text: String,
    #[serde(default)]
    pub images: serde_json::Map<String, serde_json::Value>,
}

/// One line of the JSONL result stream.
#[derive(Debug, Clone, Deserialize)]
pub struct JsonlLine {
    #[serde(default)]
    pub result: Option<JsonlResult>,
    #[serde(default)]
    pub error_code: Option<i64>,
    #[serde(default, rename = "errorMsg")]
    pub error_msg: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct JsonlResult {
    #[serde(default, rename = "layoutParsingResults")]
    pub layout_parsing_results: Vec<LayoutParsingResult>,
}

// ---- submit ----

#[derive(Debug, Deserialize)]
struct SubmitResponse {
    code: i64,
    #[serde(default)]
    msg: String,
    data: Option<SubmitData>,
}
#[derive(Debug, Deserialize)]
struct SubmitData {
    #[serde(rename = "jobId")]
    job_id: String,
}

/// Submit a file for parsing. Returns the job id.
pub async fn submit_job(
    api_url: &str,
    token: &str,
    model: &str,
    file_bytes: Vec<u8>,
    file_name: &str,
    mime: &str,
) -> AppResult<String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(120))
        .build()?;

    let form = reqwest::multipart::Form::new()
        .text("model", model.to_string())
        .text(
            "optionalPayload",
            default_optional_payload().to_string(),
        )
        .part(
            "file",
            reqwest::multipart::Part::bytes(file_bytes)
                .file_name(file_name.to_string())
                .mime_str(mime)
                .map_err(|e| AppError::Other(format!("mime 错误: {e}")))?,
        );

    let resp = client
        .post(api_url)
        .header("Authorization", format!("bearer {token}"))
        .multipart(form)
        .send()
        .await?;

    let status = resp.status();
    let text = resp.text().await?;
    let parsed: SubmitResponse = serde_json::from_str(&text).map_err(|_| {
        AppError::Ocr(format!("提交任务失败 (HTTP {}): {}", status.as_u16(), text))
    })?;

    if parsed.code != 0 {
        return Err(AppError::Ocr(format!(
            "提交任务失败 [code {}]: {}",
            parsed.code,
            parsed.msg
        )));
    }
    parsed
        .data
        .and_then(|d| {
            if d.job_id.is_empty() {
                None
            } else {
                Some(d.job_id)
            }
        })
        .ok_or_else(|| AppError::Ocr("响应缺少 jobId".into()))
}

// ---- poll ----

#[derive(Debug, Deserialize)]
struct PollResponse {
    code: i64,
    #[serde(default)]
    msg: String,
    data: Option<PollData>,
}
#[derive(Debug, Deserialize)]
struct PollData {
    #[serde(default, rename = "state")]
    state: String,
    #[serde(default, rename = "errorMsg")]
    error_msg: Option<String>,
    #[serde(default, rename = "resultUrl")]
    result_url: Option<ResultUrl>,
}
#[derive(Debug, Deserialize)]
struct ResultUrl {
    #[serde(rename = "jsonUrl", default)]
    json_url: String,
}

/// Poll until the job is done or failed. Returns the JSONL result URL on success.
pub async fn poll_until_done(api_url: &str, token: &str, job_id: &str) -> AppResult<String> {
    let client = reqwest::Client::new();
    let url = format!("{}/{}", api_url.trim_end_matches('/'), job_id);
    let deadline = std::time::Instant::now() + POLL_TIMEOUT;

    loop {
        if std::time::Instant::now() > deadline {
            return Err(AppError::Ocr("解析超时".into()));
        }
        let resp = client
            .get(&url)
            .header("Authorization", format!("bearer {token}"))
            .send()
            .await?;
        let status = resp.status();
        let text = resp.text().await?;
        let parsed: PollResponse = serde_json::from_str(&text).map_err(|_| {
            AppError::Ocr(format!("轮询失败 (HTTP {}): {}", status.as_u16(), text))
        })?;
        if parsed.code != 0 {
            return Err(AppError::Ocr(format!("轮询失败 [code {}]: {}", parsed.code, parsed.msg)));
        }
        match parsed.data {
            Some(d) => match d.state.as_str() {
                "done" => {
                    let json_url = d
                        .result_url
                        .and_then(|r| {
                            if r.json_url.is_empty() {
                                None
                            } else {
                                Some(r.json_url)
                            }
                        })
                        .ok_or_else(|| AppError::Ocr("任务完成但缺少结果 URL".into()))?;
                    return Ok(json_url);
                }
                "failed" => {
                    return Err(AppError::Ocr(format!(
                        "解析失败: {}",
                        d.error_msg.unwrap_or_else(|| "未知原因".into())
                    )));
                }
                _ => {
                    // pending / running — keep polling.
                    tokio::time::sleep(POLL_INTERVAL).await;
                }
            },
            None => {
                return Err(AppError::Ocr("轮询响应缺少 data".into()));
            }
        }
    }
}

// ---- fetch result ----

/// Fetch the JSONL result stream and parse each line.
pub async fn fetch_result(json_url: &str) -> AppResult<Vec<JsonlLine>> {
    let resp = reqwest::Client::new().get(json_url).send().await?;
    let status = resp.status();
    let text = resp.text().await?;
    if !status.is_success() {
        return Err(AppError::Ocr(format!(
            "获取结果失败 (HTTP {}): {}",
            status.as_u16(),
            text
        )));
    }
    let mut lines = Vec::new();
    for raw in text.split('\n') {
        let line = raw.trim();
        if line.is_empty() {
            continue;
        }
        match serde_json::from_str::<JsonlLine>(line) {
            Ok(l) => lines.push(l),
            Err(e) => {
                return Err(AppError::Ocr(format!("结果行解析失败: {e}")));
            }
        }
    }
    Ok(lines)
}
