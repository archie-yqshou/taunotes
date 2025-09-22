"use client"

import React, { useState, useEffect } from "react"
import { Search, Plus, FileText, Folder, Menu, X, Trash2, ChevronDown, ChevronRight, Settings, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { listEntries, createNote, createFolder, deleteEntry, renameEntry, type Entry } from "@/lib/tauri-api"
import { cn } from "@/lib/utils"

interface EnhancedSidebarProps {
  collapsed: boolean
  onToggle: () => void
  selectedNote: string | null
  onSelectNote: (noteId: string | null) => void
  vaultPath: string
  onNoteRenamed?: (oldPath: string, newPath: string) => void
  onShowSettings?: () => void
  refreshTrigger?: number // Add this to force refresh when files are renamed
}

interface FileTreeNode {
  entry: Entry
  children: FileTreeNode[]
  isExpanded: boolean
}

export function EnhancedSidebar({ 
  collapsed, 
  onToggle, 
  selectedNote, 
  onSelectNote, 
  vaultPath,
  onNoteRenamed,
  onShowSettings,
  refreshTrigger
}: EnhancedSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [entries, setEntries] = useState<Entry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([])
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null)
  const [recentNotes, setRecentNotes] = useState<Entry[]>([])

  // Load entries from vault
  useEffect(() => {
    loadEntries()
  }, [vaultPath, refreshTrigger]) // Add refreshTrigger dependency

  // Update recent notes when entries change
  useEffect(() => {
    updateRecentNotes()
  }, [entries, selectedNote])

  const loadEntries = async () => {
    try {
      setIsLoading(true)
      const vaultEntries = await listEntries()
      setEntries(vaultEntries)
      buildFileTree(vaultEntries)
    } catch (error) {
      console.error("Failed to load entries:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const buildFileTree = (entries: Entry[]) => {
    const tree: FileTreeNode[] = []
    const nodeMap = new Map<string, FileTreeNode>()

    // Create nodes for all entries
    entries.forEach(entry => {
      const node: FileTreeNode = {
        entry,
        children: [],
        isExpanded: false
      }
      nodeMap.set(entry.path, node)
    })

    // Build tree structure - only for root level items when no search
    entries.forEach(entry => {
      const node = nodeMap.get(entry.path)!
      // Only show root level items in tree (no nested paths)
      if (!entry.path.includes('/') && !entry.path.includes('\\')) {
        tree.push(node)
      }
    })

    // Sort: folders first, then files
    const sortNodes = (nodes: FileTreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.entry.is_dir && !b.entry.is_dir) return -1
        if (!a.entry.is_dir && b.entry.is_dir) return 1
        return a.entry.name.localeCompare(b.entry.name)
      })
      nodes.forEach(node => sortNodes(node.children))
    }

    sortNodes(tree)
    setFileTree(tree)
  }

  const updateRecentNotes = () => {
    const markdownFiles = entries.filter(entry => !entry.is_dir && entry.name.endsWith('.md'))
    // Sort by modified date (most recent first)
    const sorted = markdownFiles.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())
    setRecentNotes(sorted.slice(0, 5))
  }

  const createNewNote = async () => {
    try {
      const fileName = `Untitled-${Date.now()}.md`
      await createNote(fileName)
      await loadEntries()
      onSelectNote(fileName)
    } catch (error) {
      console.error("Failed to create note:", error)
      alert("Failed to create note")
    }
  }

  const createNewFolder = async () => {
    const folderName = prompt("Enter folder name:")
    if (!folderName?.trim()) return
    
    try {
      await createFolder(folderName)
      await loadEntries()
    } catch (error) {
      console.error("Failed to create folder:", error)
      alert("Failed to create folder")
    }
  }

  const deleteItem = async (path: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this item?")) return
    
    try {
      await deleteEntry(path)
      await loadEntries()
      if (selectedNote === path) {
        onSelectNote(null)
      }
    } catch (error) {
      console.error("Failed to delete item:", error)
      alert("Failed to delete item")
    }
  }

  const toggleFolder = (path: string) => {
    setFileTree(prev => 
      prev.map(node => updateNodeExpansion(node, path))
    )
  }

  const updateNodeExpansion = (node: FileTreeNode, targetPath: string): FileTreeNode => {
    if (node.entry.path === targetPath) {
      return { ...node, isExpanded: !node.isExpanded }
    }
    return {
      ...node,
      children: node.children.map(child => updateNodeExpansion(child, targetPath))
    }
  }

  const handleDragStart = (e: React.DragEvent, filePath: string) => {
    setDraggedItem(filePath)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, folderPath: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverFolder(folderPath)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drag over if we're actually leaving the element
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverFolder(null)
    }
  }

  const handleDrop = async (e: React.DragEvent, targetFolderPath: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!draggedItem) return
    
    try {
      const fileName = draggedItem.split(/[\\/]/).pop()!
      const newPath = targetFolderPath + (targetFolderPath.endsWith('/') || targetFolderPath.endsWith('\\') ? '' : '/') + fileName
      
      console.log("Moving file from", draggedItem, "to", newPath)
      await renameEntry(draggedItem, newPath)
      await loadEntries()
      
      if (selectedNote === draggedItem) {
        onSelectNote(newPath)
        onNoteRenamed?.(draggedItem, newPath)
      }
    } catch (error) {
      console.error("Failed to move file:", error)
      alert(`Failed to move file: ${error}`)
    } finally {
      setDraggedItem(null)
      setDragOverFolder(null)
    }
  }

  const renderFileTreeNode = (node: FileTreeNode, depth = 0) => {
    const isSelected = selectedNote === node.entry.path
    const hasChildren = node.children.length > 0
    const isMarkdownFile = !node.entry.is_dir && node.entry.name.endsWith('.md')

    return (
      <div key={node.entry.path} style={{ marginLeft: `${depth * 12}px` }}>
        <div
          className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
            isSelected
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
          }`}
          onClick={() => {
            if (node.entry.is_dir) {
              toggleFolder(node.entry.path)
            } else if (isMarkdownFile) {
              onSelectNote(node.entry.path)
            }
          }}
          draggable={isMarkdownFile}
          onDragStart={(e) => {
            if (isMarkdownFile) {
              console.log("Starting drag for:", node.entry.path)
              handleDragStart(e, node.entry.path)
            }
          }}
          onDragOver={node.entry.is_dir ? (e) => {
            console.log("Drag over folder:", node.entry.path)
            handleDragOver(e, node.entry.path)
          } : undefined}
          onDragLeave={node.entry.is_dir ? handleDragLeave : undefined}
          onDrop={node.entry.is_dir ? (e) => {
            console.log("Drop on folder:", node.entry.path)
            handleDrop(e, node.entry.path)
          } : undefined}
          className={cn(
            "group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors",
            isSelected
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "hover:bg-sidebar-accent/50 text-sidebar-foreground",
            draggedItem === node.entry.path && "bg-blue-100 dark:bg-blue-900/30",
            dragOverFolder === node.entry.path && node.entry.is_dir && "bg-blue-200 dark:bg-blue-800/50 border-2 border-dashed border-blue-400"
          )}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {node.entry.is_dir ? (
              <>
                {hasChildren && (
                  node.isExpanded ? 
                    <ChevronDown className="h-4 w-4 flex-shrink-0" /> : 
                    <ChevronRight className="h-4 w-4 flex-shrink-0" />
                )}
                <Folder className="h-4 w-4 flex-shrink-0 text-blue-500" />
              </>
            ) : (
              <FileText className="h-4 w-4 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <span className="truncate text-sm block">
                {isMarkdownFile ? node.entry.name.replace('.md', '') : node.entry.name}
              </span>
              {!node.entry.is_dir && (
                <span className="text-xs text-muted-foreground">
                  {new Date(node.entry.modified).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-sidebar-accent"
              onClick={(e) => deleteItem(node.entry.path, e)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {node.entry.is_dir && node.isExpanded && (
          <div>
            {node.children.map(child => renderFileTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  // Filter entries based on search
  const filteredEntries = entries.filter((entry) =>
    entry.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (collapsed) {
    return (
      <aside className="fixed left-0 top-0 h-full w-12 bg-sidebar border-r border-sidebar-border z-50 flex flex-col items-center py-4">
        <Button variant="ghost" size="icon" onClick={onToggle} className="mb-4 hover:bg-sidebar-accent">
          <Menu className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={createNewNote} className="mb-2 hover:bg-sidebar-accent">
          <Plus className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onShowSettings} className="hover:bg-sidebar-accent">
          <Settings className="h-4 w-4" />
        </Button>
      </aside>
    )
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border z-50 flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-sidebar-foreground">Tau Notes</h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onShowSettings} className="hover:bg-sidebar-accent">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onToggle} className="hover:bg-sidebar-accent">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-sidebar-accent border-sidebar-border focus:ring-sidebar-ring"
          />
        </div>

        <div className="space-y-2">
          <Button
            onClick={createNewNote}
            className="w-full bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Note
          </Button>
          <Button
            onClick={createNewFolder}
            variant="outline"
            className="w-full"
          >
            <Folder className="h-4 w-4 mr-2" />
            New Folder
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        ) : (
          <>
            {/* Recent Notes */}
            {recentNotes.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 px-2 py-1 text-sm font-medium text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Recent Notes
                </div>
                <div className="space-y-1 ml-2">
                  {recentNotes.map((note) => (
                    <div
                      key={`recent-${note.path}`}
                      onClick={() => onSelectNote(note.path)}
                      draggable
                      onDragStart={(e) => {
                        console.log("Starting drag for recent note:", note.path)
                        handleDragStart(e, note.path)
                      }}
                      style={{
                        backgroundColor: draggedItem === note.path ? 'rgba(59, 130, 246, 0.1)' : undefined
                      }}
                      className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                        selectedNote === note.path
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="h-4 w-4 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="truncate text-sm block">{note.name.replace('.md', '')}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(note.modified).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-sidebar-accent"
                          onClick={(e) => deleteItem(note.path, e)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* File Tree */}
            <div className="mb-6">
              <div className="flex items-center gap-2 px-2 py-1 text-sm font-medium text-muted-foreground">
                <Folder className="h-4 w-4" />
                Files
              </div>
              <div className="ml-2">
                {searchQuery ? (
                  // Show filtered flat list when searching
                  <div className="space-y-1">
                    {filteredEntries.map((entry) => (
                      <div
                        key={entry.path}
                        onClick={() => {
                          if (!entry.is_dir && entry.name.endsWith('.md')) {
                            onSelectNote(entry.path)
                          }
                        }}
                        className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                          selectedNote === entry.path
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {entry.is_dir ? (
                            <Folder className="h-4 w-4 flex-shrink-0 text-blue-500" />
                          ) : (
                            <FileText className="h-4 w-4 flex-shrink-0" />
                          )}
                          <span className="truncate text-sm">
                            {entry.is_dir ? entry.name : entry.name.replace('.md', '')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:bg-sidebar-accent"
                            onClick={(e) => deleteItem(entry.path, e)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Show tree structure when not searching
                  <div>
                    {fileTree.map(node => renderFileTreeNode(node))}
                  </div>
                )}
              </div>
            </div>

            {!isLoading && entries.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Folder className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-2">No files yet</p>
                <p className="text-xs text-muted-foreground">Create your first note to get started!</p>
              </div>
            )}
          </>
        )}
      </ScrollArea>
    </aside>
  )
}
