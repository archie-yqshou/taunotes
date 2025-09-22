use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Default)]
pub struct AppState {
    pub vault_path: Option<PathBuf>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Entry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub modified: String,
}

#[tauri::command]
pub async fn set_vault(app_handle: tauri::AppHandle, path: String) -> Result<(), String> {
    let state = app_handle.state::<std::sync::Mutex<AppState>>();
    let mut state_guard = state.lock().map_err(|e| e.to_string())?;
    
    let vault_path = PathBuf::from(&path);
    if !vault_path.exists() {
        return Err(format!("Path '{}' does not exist", path));
    }
    
    state_guard.vault_path = Some(vault_path);
    Ok(())
}

#[tauri::command]
pub async fn get_vault(app_handle: tauri::AppHandle) -> Result<Option<String>, String> {
    let state = app_handle.state::<std::sync::Mutex<AppState>>();
    let state_guard = state.lock().map_err(|e| e.to_string())?;
    
    Ok(state_guard.vault_path.as_ref().map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn list_entries(app_handle: tauri::AppHandle, path: Option<String>) -> Result<Vec<Entry>, String> {
    let state = app_handle.state::<std::sync::Mutex<AppState>>();
    let state_guard = state.lock().map_err(|e| e.to_string())?;
    
    let base_path = match &state_guard.vault_path {
        Some(vault_path) => vault_path.clone(),
        None => return Err("No vault set".to_string()),
    };
    
    let target_path = if let Some(rel_path) = path {
        base_path.join(rel_path)
    } else {
        base_path.clone()
    };
    
    if !target_path.exists() {
        return Err(format!("Path '{}' does not exist", target_path.display()));
    }
    
    let mut entries = Vec::new();
    
    let dir_entries = fs::read_dir(&target_path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;
    
    for entry in dir_entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        let metadata = entry.metadata().map_err(|e| format!("Failed to read metadata: {}", e))?;
        
        let relative_path = path
            .strip_prefix(&base_path)
            .map_err(|e| format!("Failed to create relative path: {}", e))?
            .to_string_lossy()
            .to_string();
        
        let name = path
            .file_name()
            .ok_or("Failed to get file name")?
            .to_string_lossy()
            .to_string();
        
        let modified = metadata
            .modified()
            .map_err(|e| format!("Failed to get modified time: {}", e))?
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| format!("Failed to convert time: {}", e))?
            .as_secs()
            .to_string();
        
        entries.push(Entry {
            name,
            path: relative_path,
            is_dir: metadata.is_dir(),
            modified,
        });
    }
    
    // Sort entries: directories first, then files, alphabetically
    entries.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });
    
    Ok(entries)
}

#[tauri::command]
pub async fn create_note(app_handle: tauri::AppHandle, rel: String) -> Result<(), String> {
    let state = app_handle.state::<std::sync::Mutex<AppState>>();
    let state_guard = state.lock().map_err(|e| e.to_string())?;
    
    let base_path = match &state_guard.vault_path {
        Some(vault_path) => vault_path,
        None => return Err("No vault set".to_string()),
    };
    
    let file_path = base_path.join(&rel);
    
    // Create parent directories if they don't exist
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directories: {}", e))?;
    }
    
    // Create the file if it doesn't exist
    if !file_path.exists() {
        fs::write(&file_path, "")
            .map_err(|e| format!("Failed to create note: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
pub async fn create_folder(app_handle: tauri::AppHandle, rel: String) -> Result<(), String> {
    let state = app_handle.state::<std::sync::Mutex<AppState>>();
    let state_guard = state.lock().map_err(|e| e.to_string())?;
    
    let base_path = match &state_guard.vault_path {
        Some(vault_path) => vault_path,
        None => return Err("No vault set".to_string()),
    };
    
    let dir_path = base_path.join(&rel);
    
    fs::create_dir_all(&dir_path)
        .map_err(|e| format!("Failed to create folder: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn read_note(app_handle: tauri::AppHandle, rel: String) -> Result<String, String> {
    let state = app_handle.state::<std::sync::Mutex<AppState>>();
    let state_guard = state.lock().map_err(|e| e.to_string())?;
    
    let base_path = match &state_guard.vault_path {
        Some(vault_path) => vault_path,
        None => return Err("No vault set".to_string()),
    };
    
    let file_path = base_path.join(&rel);
    
    if !file_path.exists() {
        return Err(format!("File '{}' does not exist", rel));
    }
    
    fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read note: {}", e))
}

#[tauri::command]
pub async fn write_note(app_handle: tauri::AppHandle, rel: String, content: String) -> Result<(), String> {
    let state = app_handle.state::<std::sync::Mutex<AppState>>();
    let state_guard = state.lock().map_err(|e| e.to_string())?;
    
    let base_path = match &state_guard.vault_path {
        Some(vault_path) => vault_path,
        None => return Err("No vault set".to_string()),
    };
    
    let file_path = base_path.join(&rel);
    
    // Create parent directories if they don't exist
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directories: {}", e))?;
    }
    
    fs::write(&file_path, content)
        .map_err(|e| format!("Failed to write note: {}", e))
}

#[tauri::command]
pub async fn rename_entry(app_handle: tauri::AppHandle, from: String, to: String) -> Result<(), String> {
    let state = app_handle.state::<std::sync::Mutex<AppState>>();
    let state_guard = state.lock().map_err(|e| e.to_string())?;
    
    let base_path = match &state_guard.vault_path {
        Some(vault_path) => vault_path,
        None => return Err("No vault set".to_string()),
    };
    
    let from_path = base_path.join(&from);
    let to_path = base_path.join(&to);
    
    if !from_path.exists() {
        return Err(format!("Source path '{}' does not exist", from));
    }
    
    if to_path.exists() {
        return Err(format!("Destination path '{}' already exists", to));
    }
    
    // Create parent directories for destination if they don't exist
    if let Some(parent) = to_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directories: {}", e))?;
    }
    
    fs::rename(&from_path, &to_path)
        .map_err(|e| format!("Failed to rename entry: {}", e))
}

#[tauri::command]
pub async fn delete_entry(app_handle: tauri::AppHandle, rel: String) -> Result<(), String> {
    let state = app_handle.state::<std::sync::Mutex<AppState>>();
    let state_guard = state.lock().map_err(|e| e.to_string())?;
    
    let base_path = match &state_guard.vault_path {
        Some(vault_path) => vault_path,
        None => return Err("No vault set".to_string()),
    };
    
    let target_path = base_path.join(&rel);
    
    if !target_path.exists() {
        return Err(format!("Path '{}' does not exist", rel));
    }
    
    if target_path.is_dir() {
        fs::remove_dir_all(&target_path)
            .map_err(|e| format!("Failed to delete directory: {}", e))
    } else {
        fs::remove_file(&target_path)
            .map_err(|e| format!("Failed to delete file: {}", e))
    }
}

#[tauri::command]
pub async fn reveal_in_os(app_handle: tauri::AppHandle, rel: String) -> Result<(), String> {
    let state = app_handle.state::<std::sync::Mutex<AppState>>();
    let state_guard = state.lock().map_err(|e| e.to_string())?;
    
    let base_path = match &state_guard.vault_path {
        Some(vault_path) => vault_path,
        None => return Err("No vault set".to_string()),
    };
    
    let target_path = base_path.join(&rel);
    
    if !target_path.exists() {
        return Err(format!("Path '{}' does not exist", rel));
    }
    
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .args(["/select,", &target_path.to_string_lossy()])
            .spawn()
            .map_err(|e| format!("Failed to reveal in OS: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", &target_path.to_string_lossy()])
            .spawn()
            .map_err(|e| format!("Failed to reveal in OS: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(target_path.parent().unwrap_or(&target_path))
            .spawn()
            .map_err(|e| format!("Failed to reveal in OS: {}", e))?;
    }
    
    Ok(())
}
