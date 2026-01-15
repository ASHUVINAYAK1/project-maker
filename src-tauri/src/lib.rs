mod db;

use db::{execute_sql, query_sql, DbState};
use tiberius::{Config, AuthMethod};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut config = Config::new();
    config.host("sql-db-a.database.windows.net");
    config.port(1433);
    config.database("free-sql-db-3095376");
    config.authentication(AuthMethod::sql_server("CloudSA271ce787@sql-db-a", "Ashutosh@123"));
    config.encryption(tiberius::EncryptionLevel::Required);
    config.trust_cert(); // Azure usually needs this or a proper bundle

    tauri::Builder::default()
        .manage(DbState { config })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet, execute_sql, query_sql])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
