# Tau Development Checklist

## Milestone 1: MVP ✅ COMPLETED

### Core Infrastructure ✅
- [x] Set up Tauri + React + TypeScript + Tailwind project structure
- [x] Configure PostCSS and Tailwind CSS
- [x] Create basic project layout and dependencies
- [x] Install CodeMirror 6, KaTeX, and UI libraries

### Rust Backend ✅
- [x] Create fs.rs module with vault operations
- [x] Implement Tauri commands: set_vault, get_vault, list_entries
- [x] Implement file operations: create_note, create_folder, read_note, write_note
- [x] Implement utility commands: rename_entry, delete_entry, reveal_in_os
- [x] Add tauri-plugin-dialog dependency for folder selection
- [x] Set up app state management with Mutex<AppState>

### Frontend Components ✅
- [x] **VaultPicker**: Folder selection/creation with beautiful UI
- [x] **AppShell**: Main app layout and vault state management
- [x] **Sidebar**: File tree with New Note/Folder buttons, context menu
- [x] **Toolbar**: Theme switcher, preview toggle, vault status
- [x] **Editor**: CodeMirror 6 with Markdown support and auto-save
- [x] **MarkdownPreview**: Custom React-based markdown renderer

### Theme System ✅
- [x] Pure White theme (default)
- [x] Pure Black theme
- [x] Custom theme upload functionality
- [x] Theme persistence in localStorage
- [x] Dynamic CSS variable system

### Core Features ✅
- [x] Vault selection on first run
- [x] File tree with collapsible folders
- [x] New Note and New Folder creation
- [x] Markdown editing with syntax highlighting
- [x] Live preview toggle
- [x] Auto-save functionality (2-second delay)
- [x] Manual save with Ctrl+S
- [x] Context menu (rename, delete, reveal in OS)
- [x] Theme switching with upload support

## Milestone 2: Search + Structure (Pending)

### Search Infrastructure 🔄
- [ ] Add Tantivy dependency to Rust backend
- [ ] Create index.rs module for search indexing
- [ ] Implement file watcher for incremental updates
- [ ] Create search UI component
- [ ] Add instant search with BM25 scoring

### Document Structure 🔄
- [ ] Implement wikilink parsing and extraction
- [ ] Create links.rs module for backlink analysis
- [ ] Add outline.rs for heading extraction
- [ ] Build Backlinks panel component
- [ ] Build Outline panel component

## Milestone 3: Graph View (Pending)

### Graph Visualization 🔄
- [ ] Add D3.js dependency
- [ ] Create Graph.tsx component
- [ ] Implement force-directed layout
- [ ] Add hover preview functionality
- [ ] Add click-to-open navigation

## Milestone 4: Embeddings + Hybrid Retrieval (Pending)

### AI Infrastructure 🔄
- [ ] Add ONNX runtime dependencies
- [ ] Implement embed.rs module
- [ ] Set up vector storage (SQLite + vector extension)
- [ ] Create hybrid scoring algorithm
- [ ] Add semantic similarity search

## Milestone 5: Context Manager + Panel (Pending)

### Context System 🔄
- [ ] Create context.rs module
- [ ] Implement ContextPack with token budgeting
- [ ] Add user pin/unpin functionality
- [ ] Build ContextPanel component
- [ ] Add open tab tracking

## Milestone 6: AI Chat (RAG) (Pending)

### Chat System 🔄
- [ ] Implement ai.rs module
- [ ] Add provider adapters (OpenAI, Anthropic, etc.)
- [ ] Create Chat.tsx component
- [ ] Implement RAG with citations
- [ ] Add streaming response support

## Milestone 7: Autocomplete (link-first) (Pending)

### Smart Autocomplete 🔄
- [ ] Implement link suggestion engine
- [ ] Create autocomplete UI component
- [ ] Add heading and summary insertion
- [ ] Implement ranking algorithm

## Milestone 8: Plugins + Extensions (Pending)

### Plugin System 🔄
- [ ] Create plugins.rs with JS/TS sandboxing
- [ ] Design plugin API
- [ ] Add plugin discovery and loading
- [ ] Create plugin management UI

---

## Testing & Quality Assurance

### MVP Testing ✅
- [x] Vault selection and creation
- [x] Note creation and editing  
- [x] Preview functionality
- [x] Theme switching
- [x] File operations (rename, delete)
- [x] Auto-save and manual save
- [x] Dialog permissions fixed
- [x] Improved UX for vault creation flow
- [x] Example vault created for testing

### Performance Testing 🔄
- [ ] Large vault handling (1000+ files)
- [ ] Search performance benchmarks
- [ ] Memory usage optimization
- [ ] Startup time optimization

### Cross-Platform Testing 🔄
- [ ] Windows functionality
- [ ] macOS compatibility
- [ ] Linux support

---

## Deployment & Distribution

### Packaging 🔄
- [ ] Create Windows installer
- [ ] Create macOS .dmg
- [ ] Create Linux AppImage/deb
- [ ] Set up auto-update system
- [ ] Create GitHub releases workflow

---

## Documentation

### User Documentation 🔄
- [ ] Getting started guide
- [ ] Feature documentation
- [ ] Keyboard shortcuts
- [ ] Theme creation guide
- [ ] Plugin development docs

### Developer Documentation 🔄
- [ ] Architecture overview
- [ ] API reference
- [ ] Contributing guidelines
- [ ] Build instructions

---

**Legend:**
- ✅ Completed
- 🔄 In Progress  
- ⏸️ Paused
- ❌ Blocked
- 📋 Planned

**Current Status:** 🎉 **MVP FULLY FUNCTIONAL** 🎉
- All core features working
- Dialog permissions fixed
- Vault creation UX improved
- Example vault provided for testing
- Ready to proceed to Milestone 2 (Search + Structure)
