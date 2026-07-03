mod commands;
mod error;
mod images;
mod ocr_client;
mod settings;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            // Ensure the app-data assets directory exists for parsed-result images.
            let app_data = app.path().app_data_dir()?;
            let assets_dir = app_data.join("assets");
            std::fs::create_dir_all(&assets_dir)?;

            #[cfg(debug_assertions)]
            {
                eprintln!("[paddle-reader] app_data = {}", app_data.display());
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::parse_document,
            commands::test_connection,
            commands::get_settings,
            commands::save_settings,
            commands::write_temp_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
