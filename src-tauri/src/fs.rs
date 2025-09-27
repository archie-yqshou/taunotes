use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::collections::HashMap;
use tauri::Manager;
use regex::Regex;

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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Link {
    pub source_file: String,
    pub target_note: String,
    pub display_text: Option<String>,
    pub position: usize,
    pub length: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LinkSuggestion {
    pub note_name: String,
    pub note_path: String,
    pub similarity_score: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileOrder {
    pub order: Vec<String>,
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

fn get_order_file_path(dir_path: &PathBuf) -> PathBuf {
    dir_path.join(".tau_order.json")
}

fn read_file_order(dir_path: &PathBuf) -> HashMap<String, usize> {
    let order_file = get_order_file_path(dir_path);
    let mut order_map = HashMap::new();

    if let Ok(content) = fs::read_to_string(&order_file) {
        if let Ok(file_order) = serde_json::from_str::<FileOrder>(&content) {
            for (index, file_name) in file_order.order.iter().enumerate() {
                order_map.insert(file_name.clone(), index);
            }
        }
    }

    order_map
}

fn write_file_order(dir_path: &PathBuf, order: Vec<String>) -> Result<(), String> {
    let order_file = get_order_file_path(dir_path);
    let file_order = FileOrder { order };
    let content = serde_json::to_string_pretty(&file_order)
        .map_err(|e| format!("Failed to serialize order: {}", e))?;

    fs::write(&order_file, content)
        .map_err(|e| format!("Failed to write order file: {}", e))?;

    Ok(())
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
    
    // Read custom order if it exists
    let order_map = read_file_order(&target_path);

    // Sort entries: directories first, then files, using custom order if available
    entries.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => {
                // Both are same type (dir or file), check custom order
                let a_order = order_map.get(&a.name);
                let b_order = order_map.get(&b.name);

                match (a_order, b_order) {
                    (Some(a_idx), Some(b_idx)) => a_idx.cmp(b_idx),
                    (Some(_), None) => std::cmp::Ordering::Less,
                    (None, Some(_)) => std::cmp::Ordering::Greater,
                    (None, None) => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
                }
            }
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

#[tauri::command]
pub async fn reorder_entries(app_handle: tauri::AppHandle, dir_path: Option<String>, source: String, target: String, position: String) -> Result<(), String> {
    let state = app_handle.state::<std::sync::Mutex<AppState>>();
    let state_guard = state.lock().map_err(|e| e.to_string())?;

    let base_path = match &state_guard.vault_path {
        Some(vault_path) => vault_path,
        None => return Err("No vault set".to_string()),
    };

    let target_dir = if let Some(rel_path) = dir_path {
        base_path.join(rel_path)
    } else {
        base_path.clone()
    };

    if !target_dir.exists() {
        return Err(format!("Directory '{}' does not exist", target_dir.display()));
    }

    // Read current entries to get all file names
    let dir_entries = fs::read_dir(&target_dir)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    let mut file_names = Vec::new();
    for entry in dir_entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip .tau_order.json files
        if !name.ends_with(".tau_order.json") {
            file_names.push(name);
        }
    }

    // Sort by current order if it exists
    let current_order = read_file_order(&target_dir);
    file_names.sort_by(|a, b| {
        let a_order = current_order.get(a);
        let b_order = current_order.get(b);

        match (a_order, b_order) {
            (Some(a_idx), Some(b_idx)) => a_idx.cmp(b_idx),
            (Some(_), None) => std::cmp::Ordering::Less,
            (None, Some(_)) => std::cmp::Ordering::Greater,
            (None, None) => a.to_lowercase().cmp(&b.to_lowercase()),
        }
    });

    // Extract just the filename from source path
    let source_name = source.split(['/', '\\']).last().unwrap_or(&source).to_string();
    let target_name = target.split(['/', '\\']).last().unwrap_or(&target).to_string();

    // Find source and target indices
    let source_idx = file_names.iter().position(|name| name == &source_name);
    let target_idx = file_names.iter().position(|name| name == &target_name);

    match (source_idx, target_idx) {
        (Some(src_idx), Some(tgt_idx)) => {
            // Remove source from its current position
            let source_item = file_names.remove(src_idx);

            // Insert at new position
            let insert_idx = if position == "before" {
                if src_idx < tgt_idx { tgt_idx - 1 } else { tgt_idx }
            } else {
                if src_idx < tgt_idx { tgt_idx } else { tgt_idx + 1 }
            };

            file_names.insert(insert_idx, source_item);

            // Write the new order
            write_file_order(&target_dir, file_names)?;
        }
        _ => {
            return Err(format!("Could not find source '{}' or target '{}' in directory", source_name, target_name));
        }
    }

    Ok(())
}

// Link parsing functions
fn parse_links_from_content(content: &str, source_file: &str) -> Vec<Link> {
    let mut links = Vec::new();
    let link_regex = Regex::new(r"\[\[([^\[\]]+)\]\]").unwrap();
    
    for mat in link_regex.find_iter(content) {
        let _full_match = mat.as_str();
        let link_content = &content[mat.start() + 2..mat.end() - 2]; // Remove [[ and ]]
        
        let (target_note, display_text) = if let Some(pipe_pos) = link_content.find('|') {
            let note = &link_content[..pipe_pos];
            let display = &link_content[pipe_pos + 1..];
            (note.to_string(), Some(display.to_string()))
        } else {
            (link_content.to_string(), None)
        };
        
        links.push(Link {
            source_file: source_file.to_string(),
            target_note,
            display_text,
            position: mat.start(),
            length: mat.end() - mat.start(),
        });
    }
    
    links
}

#[tauri::command]
pub async fn get_links_from_file(app_handle: tauri::AppHandle, rel: String) -> Result<Vec<Link>, String> {
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
    
    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    let links = parse_links_from_content(&content, &rel);
    Ok(links)
}

#[tauri::command]
pub async fn get_all_links(app_handle: tauri::AppHandle) -> Result<Vec<Link>, String> {
    let state = app_handle.state::<std::sync::Mutex<AppState>>();
    let state_guard = state.lock().map_err(|e| e.to_string())?;
    
    let base_path = match &state_guard.vault_path {
        Some(vault_path) => vault_path,
        None => return Err("No vault set".to_string()),
    };
    
    let mut all_links = Vec::new();
    
    // Recursively walk through all markdown files
    fn walk_dir(dir: &std::path::Path, base_path: &std::path::Path, links: &mut Vec<Link>) -> Result<(), String> {
        let entries = fs::read_dir(dir)
            .map_err(|e| format!("Failed to read directory: {}", e))?;
            
        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let path = entry.path();
            
            if path.is_dir() {
                walk_dir(&path, base_path, links)?;
            } else if path.extension().and_then(|s| s.to_str()) == Some("md") {
                let relative_path = path
                    .strip_prefix(base_path)
                    .map_err(|e| format!("Failed to create relative path: {}", e))?
                    .to_string_lossy()
                    .to_string();
                
                let content = fs::read_to_string(&path)
                    .map_err(|e| format!("Failed to read file: {}", e))?;
                
                let file_links = parse_links_from_content(&content, &relative_path);
                links.extend(file_links);
            }
        }
        
        Ok(())
    }
    
    walk_dir(base_path, base_path, &mut all_links)?;
    Ok(all_links)
}

#[tauri::command]
pub async fn suggest_links(app_handle: tauri::AppHandle, query: String) -> Result<Vec<LinkSuggestion>, String> {
    let state = app_handle.state::<std::sync::Mutex<AppState>>();
    let state_guard = state.lock().map_err(|e| e.to_string())?;
    
    let base_path = match &state_guard.vault_path {
        Some(vault_path) => vault_path,
        None => return Err("No vault set".to_string()),
    };
    
    let mut suggestions = Vec::new();
    let _query_lower = query.to_lowercase();
    
    // Simple similarity function (can be enhanced later)
    fn calculate_similarity(query: &str, note_name: &str) -> f64 {
        let query_lower = query.to_lowercase();
        let note_lower = note_name.to_lowercase();
        
        if note_lower.contains(&query_lower) {
            return 1.0 - (query_lower.len() as f64 / note_lower.len() as f64) * 0.5;
        }
        
        // Simple character-based similarity
        let common_chars = query_lower.chars()
            .filter(|c| note_lower.contains(*c))
            .count();
        
        common_chars as f64 / query_lower.len().max(note_lower.len()) as f64
    }
    
    // Walk through all markdown files to find potential matches
    fn find_notes(dir: &std::path::Path, base_path: &std::path::Path, query: &str, suggestions: &mut Vec<LinkSuggestion>) -> Result<(), String> {
        let entries = fs::read_dir(dir)
            .map_err(|e| format!("Failed to read directory: {}", e))?;
            
        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let path = entry.path();
            
            if path.is_dir() {
                find_notes(&path, base_path, query, suggestions)?;
            } else if path.extension().and_then(|s| s.to_str()) == Some("md") {
                let relative_path = path
                    .strip_prefix(base_path)
                    .map_err(|e| format!("Failed to create relative path: {}", e))?
                    .to_string_lossy()
                    .to_string();
                
                let note_name = path.file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("")
                    .to_string();
                
                let similarity = calculate_similarity(&query, &note_name);
                
                if similarity > 0.1 { // Minimum similarity threshold
                    suggestions.push(LinkSuggestion {
                        note_name: note_name.clone(),
                        note_path: relative_path,
                        similarity_score: similarity,
                    });
                }
            }
        }
        
        Ok(())
    }
    
    find_notes(base_path, base_path, &query, &mut suggestions)?;
    
    // Sort by similarity score (highest first)
    suggestions.sort_by(|a, b| b.similarity_score.partial_cmp(&a.similarity_score).unwrap());
    
    // Return top 10 suggestions
    suggestions.truncate(10);
    Ok(suggestions)
}
