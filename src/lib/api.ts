import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'

export interface Entry {
  name: string
  path: string
  is_dir: boolean
  modified: string
}

export interface SearchHit {
  path: string
  title: string
  content: string
  score: number
  highlights: string[]
}

export interface LinkHit {
  from_path: string
  from_title: string
  line_number: number
  context: string
}

export interface Heading {
  level: number
  text: string
  line: number
}

// Vault operations
export async function setVault(path: string): Promise<void> {
  return invoke('set_vault', { path })
}

export async function getVault(): Promise<string | null> {
  return invoke('get_vault')
}

export async function listEntries(): Promise<Entry[]> {
  return invoke('list_entries')
}

// File operations
export async function createNote(relativePath: string): Promise<void> {
  return invoke('create_note', { rel: relativePath })
}

export async function createFolder(relativePath: string): Promise<void> {
  return invoke('create_folder', { rel: relativePath })
}

export async function readNote(relativePath: string): Promise<string> {
  return invoke('read_note', { rel: relativePath })
}

export async function writeNote(relativePath: string, content: string): Promise<void> {
  return invoke('write_note', { rel: relativePath, content })
}

export async function renameEntry(from: string, to: string): Promise<void> {
  return invoke('rename_entry', { from, to })
}

export async function deleteEntry(relativePath: string): Promise<void> {
  return invoke('delete_entry', { rel: relativePath })
}

export async function revealInOS(relativePath: string): Promise<void> {
  return invoke('reveal_in_os', { rel: relativePath })
}

// Search operations
export async function search(query: string, limit: number = 50): Promise<SearchHit[]> {
  return invoke('search', { query, limit })
}

export async function getBacklinks(relativePath: string): Promise<LinkHit[]> {
  return invoke('get_backlinks', { rel: relativePath })
}

export async function getOutline(relativePath: string): Promise<Heading[]> {
  return invoke('get_outline', { rel: relativePath })
}

// Dialog helpers
export async function selectFolder(): Promise<string | null> {
  const result = await open({
    directory: true,
    multiple: false,
  })
  return typeof result === 'string' ? result : null
}

export async function selectFile(filters?: Array<{name: string, extensions: string[]}>): Promise<string | null> {
  const result = await open({
    multiple: false,
    filters: filters || [
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  return typeof result === 'string' ? result : null
}
