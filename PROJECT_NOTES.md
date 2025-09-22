# Tau Project Notes

## Overview

**Tau** is a desktop note-taking application built with Tauri (Rust backend) and React/TypeScript (frontend). It aims to provide an Obsidian/Notion-like experience with local-first data storage, AI copilot features, and extensibility.

## Architecture Decisions

### Technology Stack

**Frontend:**
- **React 18** with TypeScript for type safety
- **Tailwind CSS** for styling with CSS custom properties for theming
- **CodeMirror 6** for markdown editing with syntax highlighting
- **Vite** for fast development and building

**Backend:**
- **Tauri 2.0** for desktop app framework
- **Rust** for performance and safety
- **serde** for JSON serialization
- **std::fs** for file system operations

**Storage:**
- **Local filesystem** for markdown files (vault-based approach)
- **localStorage** for app settings and preferences
- **Future:** SQLite for search index and vector storage

### Design Philosophy

1. **Local-first**: All data stored locally, no cloud dependency
2. **Vault-based**: Similar to Obsidian, user selects a folder as their vault
3. **Incremental development**: Each milestone should be fully functional
4. **Theme flexibility**: Pure themes by default, extensible via custom CSS
5. **AI integration**: Chat-based interface similar to Cursor IDE

## Technical Details

### File Structure

```
tau/
├── src/                      # React frontend
│   ├── components/           # React components
│   ├── lib/                 # Utilities and API layer
│   └── styles/              # Global styles and themes
├── src-tauri/               # Rust backend
│   └── src/                 # Rust source code
├── CHECKLIST.md             # Progress tracking
└── PROJECT_NOTES.md         # This file
```

### Theming System

**Built-in Themes:**
- `pure-white`: #FFFFFF background, #000000 text
- `pure-black`: #000000 background, #FFFFFF text

**Custom Themes:**
- Users can upload CSS files with custom variables
- Themes override CSS custom properties
- Validation ensures minimum contrast and required variables

**CSS Variables:**
```css
:root {
  --background: #ffffff;
  --foreground: #000000;
  --card: #ffffff;
  --card-foreground: #000000;
  --primary: #000000;
  --border: #e5e5e5;
  /* ... more variables */
}
```

### File Operations

**Vault Management:**
- Vault path stored in Tauri app state and localStorage
- Recursive directory scanning for file tree
- File watcher for live updates (future)

**Note Operations:**
- Create notes with `.md` extension
- Auto-save after 2 seconds of inactivity
- Manual save with Ctrl+S
- CRUD operations via Tauri commands

### Component Architecture

**AppShell:**
- Main application container
- Handles vault selection and app state
- Manages layout and component communication

**VaultPicker:**
- First-run experience
- Folder selection via Tauri dialog
- Vault creation workflow

**Sidebar:**
- File tree with expand/collapse
- Context menu for file operations
- New note/folder buttons

**Editor:**
- CodeMirror 6 integration
- Markdown syntax highlighting
- Math support (simplified in MVP)
- Auto-save and manual save

**Toolbar:**
- Theme switcher with dropdown
- Preview toggle
- Vault status indicator

## Data Models

### Entry (File/Folder)
```rust
struct Entry {
    name: String,        // Display name
    path: String,        // Relative to vault root
    is_dir: bool,        // File or directory
    modified: String,    // Last modified timestamp
}
```

### App Settings
```typescript
interface AppSettings {
    vaultPath: string | null
    theme: 'pure-white' | 'pure-black' | string
    customThemes: CustomTheme[]
    sidebarWidth: number
    rightPanelWidth: number
    showRightPanel: boolean
    lastOpenedNote: string | null
}
```

## Future Architecture

### Search System (Milestone 2)
- **Tantivy** for full-text search with BM25 scoring
- **Weighted fields**: title(8), headings(4), tags(3), body(1)
- **Live indexing** with file system watchers
- **Instant search** with query debouncing

### Embeddings (Milestone 4)
- **ONNX Runtime** for local embedding models
- **Models**: MiniLM, e5-small, or bge-small (float16)
- **Vector Storage**: SQLite with vector extension or Tantivy vectors
- **Hybrid Scoring**: `0.6*cosine + 0.25*bm25 + 0.1*recency + 0.05*centrality`

### Context System (Milestone 5)
- **ContextPack**: Token-budgeted collection of relevant content
- **Signals**: Links, semantic similarity, keywords, recency, user pins
- **Budget Management**: Configurable token limits per file/snippet

### AI Integration (Milestone 6)
- **Provider Abstraction**: OpenAI, Anthropic, local models
- **RAG Pipeline**: Context retrieval → prompt assembly → streaming response
- **Citations**: Link responses back to source notes

## Open Questions & TODOs

### Performance
- [ ] How to handle large vaults (10,000+ files)?
- [ ] Should we implement virtual scrolling for file tree?
- [ ] What's the optimal auto-save delay?

### UX Decisions
- [ ] Should wikilinks create files automatically?
- [ ] How to handle conflicting file names?
- [ ] What keyboard shortcuts to implement?

### AI Features
- [ ] Which embedding model provides best local performance?
- [ ] How to balance context relevance vs. diversity?
- [ ] Should AI responses be saved/cached?

### Plugin System
- [ ] JavaScript or WASM for plugin runtime?
- [ ] What APIs to expose to plugins?
- [ ] How to handle plugin security/sandboxing?

## Development Workflow

### Testing Strategy
1. **Manual Testing**: Each milestone has functional requirements
2. **Unit Tests**: Critical logic in Rust backend
3. **Integration Tests**: Full workflow testing
4. **Performance Tests**: Large vault handling

### Release Strategy
1. **Alpha**: MVP with basic features
2. **Beta**: Add search and graph features  
3. **RC**: Full feature set with AI
4. **v1.0**: Stable release with plugins

### Code Quality
- **TypeScript strict mode** for type safety
- **Rust clippy** for code quality
- **Prettier/ESLint** for code formatting
- **Git hooks** for pre-commit checks

## Lessons Learned

### MVP Development
1. **Tauri 2.0** has excellent performance but limited documentation
2. **CodeMirror 6** is powerful but complex to configure
3. **CSS custom properties** work well for theming
4. **Auto-save** significantly improves UX
5. **Dialog permissions** are critical - must be in capabilities/default.json
6. **UX clarity** is important for vault creation flow

### Technical Challenges
1. **File system operations** need proper error handling
2. **Theme switching** requires careful CSS variable management
3. **Component state management** can get complex without Redux/Zustand
4. **Cross-platform paths** need consistent handling (/ vs \\)

## Performance Benchmarks

### MVP Performance (Local Testing)
- **Startup time**: ~500ms
- **Vault loading**: ~100ms (500 files)
- **Note switching**: ~50ms
- **Auto-save**: ~10ms
- **Theme switching**: ~20ms

*Note: Benchmarks are on Windows 11, i7-12700K, NVMe SSD*

## Security Considerations

### File System Access
- Tauri's capability system restricts file access
- Vault path validation prevents directory traversal
- File operations are sandboxed to vault directory

### Theme Uploads
- CSS validation prevents script injection
- Custom themes are isolated to CSS variables
- No JavaScript execution in theme files

### Future AI Integration
- Local embeddings avoid data leakage
- API keys stored securely in system keychain
- User consent required for cloud AI services

---

**Last Updated:** 2025-09-18 (MVP Complete)  
**Next Review:** After Milestone 2 completion  
**Status:** ✅ MVP fully functional, all core features working
