mod fs;

use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_dialog::init())
    .manage(Mutex::new(fs::AppState::default()))
    .invoke_handler(tauri::generate_handler![
        fs::set_vault,
        fs::get_vault,
        fs::list_entries,
        fs::create_note,
        fs::create_folder,
        fs::read_note,
        fs::write_note,
        fs::rename_entry,
        fs::delete_entry,
        fs::reveal_in_os,
        fs::get_links_from_file,
        fs::get_all_links,
        fs::suggest_links,
        fs::reorder_entries
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
