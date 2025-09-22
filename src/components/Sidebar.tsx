import React, { useState, useEffect, useRef } from 'react'
import { 
  File, 
  Folder, 
  FolderOpen, 
  Plus, 
  MoreHorizontal,
  Trash2,
  Edit,
  ExternalLink,
  FileText
} from 'lucide-react'
import { listEntries, createNote, createFolder, deleteEntry, renameEntry, revealInOS, type Entry } from '../lib/api'
import { cn } from '../lib/utils'

interface SidebarProps {
  vaultPath: string
  currentNote: string | null
  onNoteSelected: (notePath: string) => void
  onResize?: (width: number) => void
}

interface ContextMenuState {
  isOpen: boolean
  x: number
  y: number
  entry: Entry | null
}

export function Sidebar({ vaultPath, currentNote, onNoteSelected, onResize }: SidebarProps) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    entry: null
  })
  const [isRenaming, setIsRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  
  const sidebarRef = useRef<HTMLDivElement>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  // Load entries when vault changes
  useEffect(() => {
    loadEntries()
  }, [vaultPath])

  // Handle clicks outside context menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu({ isOpen: false, x: 0, y: 0, entry: null })
      }
    }

    if (contextMenu.isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [contextMenu.isOpen])

  const loadEntries = async () => {
    try {
      setIsLoading(true)
      const result = await listEntries()
      setEntries(result)
    } catch (error) {
      console.error('Failed to load entries:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewNote = async () => {
    try {
      const noteName = `Untitled-${Date.now()}.md`
      await createNote(noteName)
      await loadEntries()
      onNoteSelected(noteName)
    } catch (error) {
      console.error('Failed to create note:', error)
    }
  }

  const handleNewFolder = async () => {
    try {
      const folderName = `New Folder ${Date.now()}`
      await createFolder(folderName)
      await loadEntries()
    } catch (error) {
      console.error('Failed to create folder:', error)
    }
  }

  const handleEntryClick = (entry: Entry) => {
    if (entry.is_dir) {
      const newExpanded = new Set(expandedFolders)
      if (newExpanded.has(entry.path)) {
        newExpanded.delete(entry.path)
      } else {
        newExpanded.add(entry.path)
      }
      setExpandedFolders(newExpanded)
    } else {
      onNoteSelected(entry.path)
    }
  }

  const handleContextMenu = (event: React.MouseEvent, entry: Entry) => {
    event.preventDefault()
    event.stopPropagation()
    
    setContextMenu({
      isOpen: true,
      x: event.clientX,
      y: event.clientY,
      entry
    })
  }

  const handleRename = (entry: Entry) => {
    setIsRenaming(entry.path)
    setRenameValue(entry.name)
    setContextMenu({ isOpen: false, x: 0, y: 0, entry: null })
  }

  const handleRenameSubmit = async () => {
    if (!isRenaming || !renameValue.trim()) return

    try {
      const oldPath = isRenaming
      const pathParts = oldPath.split('/')
      pathParts[pathParts.length - 1] = renameValue.trim()
      const newPath = pathParts.join('/')

      await renameEntry(oldPath, newPath)
      await loadEntries()

      // Update current note if it was renamed
      if (currentNote === oldPath) {
        onNoteSelected(newPath)
      }
    } catch (error) {
      console.error('Failed to rename entry:', error)
    } finally {
      setIsRenaming(null)
      setRenameValue('')
    }
  }

  const handleDelete = async (entry: Entry) => {
    if (!confirm(`Are you sure you want to delete "${entry.name}"?`)) return

    try {
      await deleteEntry(entry.path)
      await loadEntries()

      // Clear current note if it was deleted
      if (currentNote === entry.path) {
        onNoteSelected('')
      }
    } catch (error) {
      console.error('Failed to delete entry:', error)
    }
    setContextMenu({ isOpen: false, x: 0, y: 0, entry: null })
  }

  const handleRevealInOS = async (entry: Entry) => {
    try {
      await revealInOS(entry.path)
    } catch (error) {
      console.error('Failed to reveal in OS:', error)
    }
    setContextMenu({ isOpen: false, x: 0, y: 0, entry: null })
  }

  const renderEntry = (entry: Entry, depth: number = 0) => {
    const isExpanded = expandedFolders.has(entry.path)
    const isSelected = currentNote === entry.path
    const isCurrentlyRenaming = isRenaming === entry.path

    return (
      <div key={entry.path}>
        <div
          className={cn(
            "flex items-center px-2 py-1 text-sm cursor-pointer hover:bg-accent group",
            isSelected && "bg-accent text-accent-foreground",
            isCurrentlyRenaming && "bg-accent"
          )}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => !isCurrentlyRenaming && handleEntryClick(entry)}
          onContextMenu={(e) => !isCurrentlyRenaming && handleContextMenu(e, entry)}
        >
          <div className="flex items-center flex-1 min-w-0">
            {entry.is_dir ? (
              isExpanded ? (
                <FolderOpen className="w-4 h-4 text-muted-foreground mr-2 flex-shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-muted-foreground mr-2 flex-shrink-0" />
              )
            ) : (
              <File className="w-4 h-4 text-muted-foreground mr-2 flex-shrink-0" />
            )}
            
            {isCurrentlyRenaming ? (
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit()
                  if (e.key === 'Escape') {
                    setIsRenaming(null)
                    setRenameValue('')
                  }
                }}
                className="flex-1 bg-background border border-border rounded px-1 text-foreground"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="truncate text-card-foreground">{entry.name}</span>
            )}
          </div>
          
          {!isCurrentlyRenaming && (
            <button
              className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation()
                handleContextMenu(e, entry)
              }}
            >
              <MoreHorizontal className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Render children for expanded folders */}
        {entry.is_dir && isExpanded && (
          <div>
            {entries
              .filter(e => {
                const parentPath = e.path.split('/').slice(0, -1).join('/')
                return parentPath === entry.path
              })
              .map(childEntry => renderEntry(childEntry, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  // Get top-level entries (no parent folder)
  const topLevelEntries = entries.filter(entry => !entry.path.includes('/'))

  return (
    <div ref={sidebarRef} className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-card-foreground">Notes</h2>
          <div className="flex space-x-1">
            <button
              onClick={handleNewNote}
              className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-accent-foreground"
              title="New Note"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={handleNewFolder}
              className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-accent-foreground"
              title="New Folder"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-4 text-center">
            <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">Loading...</p>
          </div>
        ) : topLevelEntries.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground">No notes yet</p>
            <button
              onClick={handleNewNote}
              className="mt-2 text-sm text-primary hover:text-primary/80"
            >
              Create your first note
            </button>
          </div>
        ) : (
          <div className="py-2">
            {topLevelEntries.map(entry => renderEntry(entry))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.isOpen && contextMenu.entry && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-popover border border-border rounded-md shadow-lg py-1 min-w-[160px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            onClick={() => handleRename(contextMenu.entry!)}
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center space-x-2"
          >
            <Edit className="w-4 h-4" />
            <span>Rename</span>
          </button>
          <button
            onClick={() => handleRevealInOS(contextMenu.entry!)}
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center space-x-2"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Reveal in Explorer</span>
          </button>
          <hr className="my-1 border-border" />
          <button
            onClick={() => handleDelete(contextMenu.entry!)}
            className="w-full px-3 py-2 text-left text-sm hover:bg-destructive hover:text-destructive-foreground flex items-center space-x-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  )
}

