"use client"

import React, { useState, useEffect } from "react"
import { DndContext, DragEndEvent, closestCenter, useSensor, useSensors, PointerSensor, useDraggable, useDroppable } from '@dnd-kit/core'
import { Search, Plus, FileText, FolderOpen, FolderClosed, Menu, X, Trash2, ChevronDown, ChevronRight, Settings, Clock } from "lucide-react"
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
  const [isDragging, setIsDragging] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } })
  )

  // Load entries from vault
  useEffect(() => {
    loadEntries()
  }, [vaultPath, refreshTrigger]) // Add refreshTrigger dependency

  // Update recent notes when entries change
  useEffect(() => {
    updateRecentNotes()
  }, [entries, selectedNote])

  // Add global drag event listeners for debugging
  useEffect(() => {
    const handleGlobalDragOver = (e: DragEvent) => {
      console.log("🌍 GLOBAL drag over - target:", e.target, "isDragging:", isDragging)
    }
    
    const handleGlobalDrop = (e: DragEvent) => {
      console.log("🌍 GLOBAL drop - target:", e.target)
    }

    document.addEventListener('dragover', handleGlobalDragOver)
    document.addEventListener('drop', handleGlobalDrop)
    
    return () => {
      document.removeEventListener('dragover', handleGlobalDragOver)
      document.removeEventListener('drop', handleGlobalDrop)
    }
  }, [isDragging])

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

    // Build tree structure - only for root level items initially
    entries.forEach(entry => {
      const node = nodeMap.get(entry.path)!
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

  // Find a node by path
  const findNodeByPath = (nodes: FileTreeNode[], targetPath: string): FileTreeNode | null => {
    for (const node of nodes) {
      if (node.entry.path === targetPath) return node
      const found = findNodeByPath(node.children, targetPath)
      if (found) return found
    }
    return null
  }

  // Replace children for a given node path
  const replaceChildrenForPath = (nodes: FileTreeNode[], targetPath: string, newChildren: FileTreeNode[]): FileTreeNode[] => {
    return nodes.map(node => {
      if (node.entry.path === targetPath) {
        return { ...node, children: newChildren, isExpanded: true }
      }
      if (node.children.length > 0) {
        return { ...node, children: replaceChildrenForPath(node.children, targetPath, newChildren) }
      }
      return node
    })
  }

  // Lazy-load folder contents when expanding
  const loadChildrenForFolder = async (folderPath: string) => {
    try {
      const children = await listEntries(folderPath)
      const childNodes: FileTreeNode[] = children.map(entry => ({ entry, children: [], isExpanded: false }))
      // Sort children: folders first, then files
      childNodes.sort((a, b) => {
        if (a.entry.is_dir && !b.entry.is_dir) return -1
        if (!a.entry.is_dir && b.entry.is_dir) return 1
        return a.entry.name.localeCompare(b.entry.name)
      })
      setFileTree(prev => replaceChildrenForPath(prev, folderPath, childNodes))
    } catch (error) {
      console.error('Failed to load folder children:', error)
    }
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
    // Determine current state before toggling
    const currentNode = findNodeByPath(fileTree, path)
    const isCurrentlyExpanded = currentNode?.isExpanded
    const hasChildrenLoaded = (currentNode?.children?.length || 0) > 0

    setFileTree(prev => prev.map(node => updateNodeExpansion(node, path)))

    // If we are expanding and children are not loaded, lazy-load them
    if (!isCurrentlyExpanded && !hasChildrenLoaded) {
      loadChildrenForFolder(path)
    }
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
    console.log("🚀 Drag start:", filePath)

    // Set data transfer FIRST - include multiple types for WebView2 compatibility
    e.dataTransfer.effectAllowed = 'move'
    try { e.dataTransfer.setData('text/plain', filePath) } catch {}
    try { e.dataTransfer.setData('text', filePath) } catch {}
    try { e.dataTransfer.setData('application/x-file-path', filePath) } catch {}
    try { e.dataTransfer.setData('text/uri-list', filePath) } catch {}

    // Provide a drag image to prevent early cancellation in some engines
    const dragImg = document.createElement('div')
    dragImg.textContent = filePath.split(/[\\/]/).pop() || filePath
    dragImg.style.position = 'absolute'
    dragImg.style.top = '-1000px'
    dragImg.style.left = '-1000px'
    dragImg.style.background = 'rgba(0,0,0,0.75)'
    dragImg.style.color = '#fff'
    dragImg.style.padding = '2px 6px'
    dragImg.style.fontSize = '12px'
    dragImg.style.borderRadius = '4px'
    dragImg.style.pointerEvents = 'none'
    document.body.appendChild(dragImg)
    try { e.dataTransfer.setDragImage(dragImg, 0, 0) } catch {}
    setTimeout(() => {
      if (dragImg.parentNode) dragImg.parentNode.removeChild(dragImg)
    }, 0)

    // Set state for UI feedback
    setDraggedItem(filePath)
    setIsDragging(true)
    document.body.classList.add('dragging')

    console.log("📦 Drag data set:", filePath)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    console.log("Drag end")
    setDraggedItem(null)
    setDragOverFolder(null)
    setIsDragging(false)
    document.body.classList.remove('dragging')
  }

  const handleDragOver = (e: React.DragEvent, folderPath: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    console.log("🔄 DRAG OVER EVENT:", folderPath, "isDragging:", isDragging, "draggedItem:", draggedItem)
    
    // Check if we have drag data - this is more reliable than state
    const dragData = e.dataTransfer.types.includes('text/plain')
    console.log("   - Drag data present:", dragData)
    console.log("   - DataTransfer types:", e.dataTransfer.types)
    
    // Always allow drop while we are in an active app drag
    if (isDragging || draggedItem || dragData) {
      e.dataTransfer.dropEffect = 'move'
      setDragOverFolder(folderPath)
      console.log("✅ Allowing drop on:", folderPath)
    } else {
      e.dataTransfer.dropEffect = 'none'
      console.log("❌ No drag data, rejecting drop")
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    console.log("📤 DRAG LEAVE - target:", e.currentTarget, "related:", e.relatedTarget)
    // Only clear drag over if we're actually leaving the element
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverFolder(null)
      console.log("   ✅ Cleared drag over folder")
    } else {
      console.log("   ❌ Not clearing - still within element")
    }
  }

  const handleDrop = async (e: React.DragEvent, targetFolderPath: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    console.log("🎯 Drop event triggered on:", targetFolderPath)
    
    const droppedPath = e.dataTransfer.getData('text/plain')
    console.log("📥 Dropped file path:", droppedPath)
    
    if (!droppedPath) {
      console.log("❌ No dragged item found in drop data")
      return
    }
    
    // Don't allow dropping on the same path
    if (droppedPath === targetFolderPath) {
      console.log("❌ Cannot drop on same path")
      return
    }
    
    try {
      const fileName = droppedPath.split(/[\\/]/).pop()!
      // Ensure proper path separator
      const separator = targetFolderPath.includes('\\') ? '\\' : '/'
      const newPath = targetFolderPath + separator + fileName
      
      console.log("🔄 Moving file from", droppedPath, "to", newPath)
      await renameEntry(droppedPath, newPath)
      await loadEntries()
      
      if (selectedNote === droppedPath) {
        onSelectNote(newPath)
        onNoteRenamed?.(droppedPath, newPath)
      }
      
      console.log("✅ File moved successfully!")
    } catch (error) {
      console.error("❌ Failed to move file:", error)
      alert(`Failed to move file: ${error}`)
    } finally {
      setDraggedItem(null)
      setDragOverFolder(null)
      setIsDragging(false)
      document.body.classList.remove('dragging')
    }
  }

  const TreeNode: React.FC<{ node: FileTreeNode, depth: number }> = ({ node, depth }) => {
    const isSelected = selectedNote === node.entry.path
    const isMarkdownFile = !node.entry.is_dir && node.entry.name.endsWith('.md')
    // Folder as droppable
    const { setNodeRef: setDropRef, isOver } = useDroppable({ id: node.entry.path })
    // File as draggable
    const { attributes, listeners, setNodeRef: setDragRef, isDragging: isFileDragging } = useDraggable({ id: node.entry.path })

    const containerProps: React.HTMLAttributes<HTMLDivElement> & { ref?: any } = {}
    if (node.entry.is_dir) {
      containerProps.ref = setDropRef
    } else if (isMarkdownFile) {
      containerProps.ref = setDragRef
      Object.assign(containerProps, attributes, listeners)
    }

    return (
      <div key={node.entry.path} style={{ marginLeft: `${depth * 12}px` }}>
        <div
          {...containerProps}
          onClick={(e) => {
            if (isDragging) {
              e.preventDefault()
              return
            }
            if (node.entry.is_dir) {
              toggleFolder(node.entry.path)
            } else if (isMarkdownFile) {
              onSelectNote(node.entry.path)
            }
          }}
          className={cn(
            "group flex items-center justify-between p-2 rounded-md transition-colors select-none",
            (isMarkdownFile ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"),
            isSelected
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "hover:bg-sidebar-accent/50 text-sidebar-foreground",
            isOver && node.entry.is_dir && "bg-blue-200 dark:bg-blue-800/50 border-2 border-dashed border-blue-400"
          )}
        >
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {node.entry.is_dir ? (
              <>
                {node.isExpanded ? 
                  <ChevronDown className="h-3 w-3 flex-shrink-0 text-muted-foreground" /> : 
                  <ChevronRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                }
                {node.isExpanded ? 
                  <FolderOpen className="h-4 w-4 flex-shrink-0 text-blue-500" data-folder="true" /> :
                  <FolderClosed className="h-4 w-4 flex-shrink-0 text-blue-500" data-folder="true" />
                }
            </>
            ) : (
              <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground ml-4" />
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
            {node.children.length > 0 ? (
              node.children.map(child => (
                <TreeNode key={child.entry.path} node={child} depth={depth + 1} />
              ))
            ) : (
              <div 
                style={{ marginLeft: `${(depth + 1) * 12}px` }}
                className="p-2 text-xs text-muted-foreground italic"
              >
                Empty folder
              </div>
            )}
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e) => {
        const id = (e.active?.id as string) || null
        setActiveId(id)
        setIsDragging(true)
      }}
      onDragEnd={async (e: DragEndEvent) => {
        setIsDragging(false)
        const sourcePath = e.active?.id as string
        const overId = e.over?.id as string | undefined
        setActiveId(null)
        if (!sourcePath || !overId) return
        // Only allow dropping onto folders
        const targetNode = fileTree && findNodeByPath(fileTree, overId)
        if (!targetNode || !targetNode.entry.is_dir) return
        try {
          const fileName = sourcePath.split(/[\\/]/).pop()!
          const sep = overId.includes('\\') ? '\\' : '/'
          const newPath = overId + sep + fileName
          await renameEntry(sourcePath, newPath)
          await loadEntries()
          if (selectedNote === sourcePath) {
            onSelectNote(newPath)
            onNoteRenamed?.(sourcePath, newPath)
          }
        } catch (error) {
          console.error('Failed to move via dnd-kit:', error)
          alert(`Failed to move file: ${error}`)
        }
      }}
      onDragCancel={() => {
        setIsDragging(false)
        setActiveId(null)
      }}
    >
    <aside 
      className={cn(
        "fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border z-50 flex flex-col",
        isDragging && "drag-active"
      )}
      style={{
        // Add custom CSS for drag states
        '--drag-cursor': isDragging ? 'grabbing' : 'default'
      } as React.CSSProperties}
      onDragOverCapture={(e) => {
        // Make the entire sidebar a permissive drop zone during in-app drags
        if (isDragging) {
          e.preventDefault()
          try { (e as unknown as DragEvent).dataTransfer!.dropEffect = 'move' } catch {}
        }
      }}
    >
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
               <FolderClosed className="h-4 w-4 mr-2" />
               New Folder
             </Button>
        </div>
      </div>

      <ScrollArea 
        className="flex-1 p-2"
        onDragOverCapture={(e) => {
          if (isDragging) {
            e.preventDefault()
            try { (e as unknown as DragEvent).dataTransfer!.dropEffect = 'move' } catch {}
          }
        }}
      >
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
                      id={`recent-${note.path}`}
                      key={`recent-${note.path}`}
                      onClick={() => onSelectNote(note.path)}
                      className={cn(
                        "group flex items-center justify-between p-2 rounded-md cursor-grab active:cursor-grabbing transition-colors",
                        selectedNote === note.path
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "hover:bg-sidebar-accent/50 text-sidebar-foreground",
                        draggedItem === note.path && "bg-blue-100 dark:bg-blue-900/30 opacity-50"
                      )}
                      {...{
                        role: 'button',
                        onPointerDown: (ev: React.PointerEvent) => {
                          // mark this as the active drag source for dnd-kit
                          ;(ev.target as HTMLElement).dataset.dndId = note.path
                        },
                        onDragStart: (ev: React.DragEvent) => ev.preventDefault()
                      }}
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
                 <FolderClosed className="h-4 w-4" />
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
                             <FolderClosed className="h-4 w-4 flex-shrink-0 text-blue-500" data-folder="true" />
                           ) : (
                             <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
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
                    {fileTree.map(node => (
                      <TreeNode key={node.entry.path} node={node} depth={0} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {!isLoading && entries.length === 0 && (
               <div className="flex flex-col items-center justify-center py-12 text-center">
                 <FolderClosed className="h-12 w-12 text-muted-foreground mb-4" />
                 <p className="text-sm text-muted-foreground mb-2">No files yet</p>
                 <p className="text-xs text-muted-foreground">Create your first note to get started!</p>
               </div>
            )}
          </>
        )}
      </ScrollArea>
    </aside>
    </DndContext>
  )
}
