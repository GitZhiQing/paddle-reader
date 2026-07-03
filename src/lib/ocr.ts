import { invoke } from "@tauri-apps/api/core";
import type { ParseResult } from "./types";

/** Determine PaddleOCR fileType from a file name: 0 = pdf, 1 = image. */
export function fileTypeFor(name: string): number {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return 0;
  return 1;
}

/** Whether the file type is accepted by the uploader. */
export function isAcceptedFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return ["pdf", "png", "jpg", "jpeg", "webp", "bmp", "gif"].includes(ext);
}

/**
 * Parse a single document file via the Rust backend. The path must be absolute (a Tauri
 * file-drop gives an absolute path).
 */
export async function parseDocument(
  filePath: string,
  fileType: number,
  attachmentId: string,
): Promise<ParseResult> {
  return invoke<ParseResult>("parse_document", {
    filePath,
    fileType,
    attachmentId,
  });
}
