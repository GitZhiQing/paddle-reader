import { convertFileSrc } from "@tauri-apps/api/core";

/**
 * Turn an on-disk absolute image path (as rewritten into markdown by the Rust backend)
 * into a URL the webview can load via the `asset` protocol.
 *
 * On Windows the Rust backend writes paths with backslashes; normalise to forward
 * slashes so the asset-protocol scope matcher (which uses `/`) resolves correctly.
 */
export function assetUrl(filePath: string): string {
  return convertFileSrc(filePath.replace(/\\/g, "/"), "asset");
}
