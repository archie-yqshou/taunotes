export interface Entry {
  name: string
  path: string
  is_dir: boolean
  modified: string
}

// Check if we're in a Tauri environment
const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__

// Mock data for web environment
let mockVault: string | null = "/mock-vault"
const mockEntries: Entry[] = [
  {
    name: "Welcome.md",
    path: "Welcome.md",
    is_dir: false,
    modified: new Date().toISOString(),
  },
  {
    name: "Getting Started.md",
    path: "Getting Started.md",
    is_dir: false,
    modified: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  },
  {
    name: "Projects",
    path: "Projects",
    is_dir: true,
    modified: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
  },
  {
    name: "Daily Notes",
    path: "Daily Notes",
    is_dir: true,
    modified: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
  },
]

const mockNoteContents: Record<string, string> = {
  "Welcome.md": `# Welcome to Tau Notes

Welcome to your new note-taking app! This is a clean, distraction-free environment for your thoughts and ideas.

## Features

- **Live Preview**: See your markdown rendered in real-time as you type
- **Clean Interface**: Minimal design inspired by Obsidian
- **File Organization**: Organize your notes in folders
- **Recent Notes**: Quick access to your recently modified notes

## Getting Started

1. Create a new note using the "New Note" button
2. Start typing in the editor
3. Your changes are automatically saved
4. Switch between Live and Preview modes

Happy writing! ✨`,
  "Getting Started.md": `# Getting Started Guide

## Creating Notes

Click the "New Note" button in the sidebar to create a new note. You can also create folders to organize your notes.

## Markdown Support

Tau supports standard markdown formatting:

- **Bold text**
- *Italic text*
- \`inline code\`
- Lists and more!

## Tips

- Use the search bar to quickly find notes
- Recent notes appear at the top of the sidebar
- Drag and drop files to reorganize them

Enjoy your note-taking journey!`,
}

// Tauri imports (only available in Tauri environment)
let invoke: any, open: any

if (isTauri) {
  try {
    const tauriCore = require("@tauri-apps/api/core")
    const tauriDialog = require("@tauri-apps/plugin-dialog")
    invoke = tauriCore.invoke
    open = tauriDialog.open
  } catch (e) {
    console.warn("Tauri APIs not available, using mock implementation")
  }
}

// Vault operations
export async function setVault(path: string): Promise<void> {
  if (isTauri && invoke) {
    return invoke("set_vault", { path })
  }
  // Mock implementation
  mockVault = path
  return Promise.resolve()
}

export async function getVault(): Promise<string | null> {
  if (isTauri && invoke) {
    return invoke("get_vault")
  }
  // Mock implementation
  return Promise.resolve(mockVault)
}

export async function listEntries(path?: string): Promise<Entry[]> {
  if (isTauri && invoke) {
    return path ? invoke("list_entries", { path }) : invoke("list_entries")
  }

  // Mock implementation
  if (!path) {
    return Promise.resolve(mockEntries)
  }

  // Return mock children for folders
  if (path === "Projects") {
    return Promise.resolve([
      {
        name: "Project Alpha.md",
        path: "Projects/Project Alpha.md",
        is_dir: false,
        modified: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        name: "Project Beta.md",
        path: "Projects/Project Beta.md",
        is_dir: false,
        modified: new Date(Date.now() - 172800000).toISOString(),
      },
    ])
  }

  if (path === "Daily Notes") {
    return Promise.resolve([
      {
        name: "2024-01-15.md",
        path: "Daily Notes/2024-01-15.md",
        is_dir: false,
        modified: new Date().toISOString(),
      },
      {
        name: "2024-01-14.md",
        path: "Daily Notes/2024-01-14.md",
        is_dir: false,
        modified: new Date(Date.now() - 86400000).toISOString(),
      },
    ])
  }

  return Promise.resolve([])
}

// File operations
export async function createNote(relativePath: string): Promise<void> {
  if (isTauri && invoke) {
    return invoke("create_note", { rel: relativePath })
  }

  // Mock implementation
  const newEntry: Entry = {
    name: relativePath.split("/").pop() || relativePath,
    path: relativePath,
    is_dir: false,
    modified: new Date().toISOString(),
  }
  mockEntries.push(newEntry)
  mockNoteContents[relativePath] = "# New Note\n\nStart writing here..."
  return Promise.resolve()
}

export async function createFolder(relativePath: string): Promise<void> {
  if (isTauri && invoke) {
    return invoke("create_folder", { rel: relativePath })
  }

  // Mock implementation
  const newEntry: Entry = {
    name: relativePath.split("/").pop() || relativePath,
    path: relativePath,
    is_dir: true,
    modified: new Date().toISOString(),
  }
  mockEntries.push(newEntry)
  return Promise.resolve()
}

export async function readNote(relativePath: string): Promise<string> {
  if (isTauri && invoke) {
    return invoke("read_note", { rel: relativePath })
  }

  // Mock implementation
  return Promise.resolve(mockNoteContents[relativePath] || "# Note Not Found\n\nThis note could not be loaded.")
}

export async function writeNote(relativePath: string, content: string): Promise<void> {
  if (isTauri && invoke) {
    return invoke("write_note", { rel: relativePath, content })
  }

  // Mock implementation
  mockNoteContents[relativePath] = content

  // Update modified time
  const entry = mockEntries.find((e) => e.path === relativePath)
  if (entry) {
    entry.modified = new Date().toISOString()
  }

  return Promise.resolve()
}

export async function renameEntry(from: string, to: string): Promise<void> {
  if (isTauri && invoke) {
    return invoke("rename_entry", { from, to })
  }

  // Mock implementation
  const entryIndex = mockEntries.findIndex((e) => e.path === from)
  if (entryIndex !== -1) {
    const entry = mockEntries[entryIndex]
    entry.path = to
    entry.name = to.split("/").pop() || to
    entry.modified = new Date().toISOString()

    // Update content mapping
    if (mockNoteContents[from]) {
      mockNoteContents[to] = mockNoteContents[from]
      delete mockNoteContents[from]
    }
  }

  return Promise.resolve()
}

export async function deleteEntry(relativePath: string): Promise<void> {
  if (isTauri && invoke) {
    return invoke("delete_entry", { rel: relativePath })
  }

  // Mock implementation
  const entryIndex = mockEntries.findIndex((e) => e.path === relativePath)
  if (entryIndex !== -1) {
    mockEntries.splice(entryIndex, 1)
    delete mockNoteContents[relativePath]
  }

  return Promise.resolve()
}

export async function revealInOS(relativePath: string): Promise<void> {
  if (isTauri && invoke) {
    return invoke("reveal_in_os", { rel: relativePath })
  }

  // Mock implementation - just log for web
  console.log("Would reveal in OS:", relativePath)
  return Promise.resolve()
}

// Dialog helpers
export async function selectFolder(): Promise<string | null> {
  if (isTauri && open) {
    const result = await open({
      directory: true,
      multiple: false,
    })
    return typeof result === "string" ? result : null
  }

  // Mock implementation - return a mock path
  return Promise.resolve("/mock-selected-folder")
}

export async function selectFile(filters?: Array<{ name: string; extensions: string[] }>): Promise<string | null> {
  if (isTauri && open) {
    const result = await open({
      multiple: false,
      filters: filters || [{ name: "All Files", extensions: ["*"] }],
    })
    return typeof result === "string" ? result : null
  }

  // Mock implementation - return a mock file path
  return Promise.resolve("/mock-selected-file.md")
}
