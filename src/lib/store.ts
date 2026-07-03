import { invoke } from "@tauri-apps/api/core";
import type { Settings } from "./types";

/**
 * Settings are read/written through Rust commands (which use the store plugin), so the
 * token is never directly exposed to the renderer except when the Settings form loads it.
 */

export async function getSettings(): Promise<Settings> {
  return invoke<Settings>("get_settings");
}

export async function saveSettings(
  apiUrl: string,
  token: string,
): Promise<void> {
  await invoke("save_settings", { apiUrl, token });
}

export async function testConnection(
  apiUrl: string,
  token: string,
): Promise<string> {
  return invoke<string>("test_connection", { apiUrl, token });
}

export async function hasCredentials(): Promise<boolean> {
  try {
    const s = await getSettings();
    return s.apiUrl.trim() !== "" && s.token.trim() !== "";
  } catch {
    return false;
  }
}
