/** Shared domain types mirroring the SQLite schema. */

export interface Session {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
}

export interface Batch {
  id: string;
  session_id: string;
  position: number;
  created_at: number;
}

export type AttachmentStatus =
  | "pending"
  | "uploading"
  | "parsing"
  | "done"
  | "error";

export interface Attachment {
  id: string;
  batch_id: string;
  file_name: string;
  /** 0 = pdf, 1 = image (PaddleOCR fileType). */
  file_type: number;
  byte_size: number;
  file_path: string;
  status: AttachmentStatus;
  error_msg: string | null;
  page_count: number | null;
  /** Joined markdown across pages (image paths already rewritten to app-data paths). */
  markdown: string | null;
  created_at: number;
  updated_at: number;
}

/** Result returned by the `parse_document` Rust command. */
export interface ParseResult {
  markdown: string;
  page_count: number;
}

/** Settings stored via the store plugin. */
export interface Settings {
  apiUrl: string;
  token: string;
  /** Pinned model, shown read-only. */
  model: string;
}

export const DEFAULT_API_URL =
  "https://paddleocr.aistudio-app.com/api/v2/ocr/jobs";
export const PINNED_MODEL = "PaddleOCR-VL-1.6";
