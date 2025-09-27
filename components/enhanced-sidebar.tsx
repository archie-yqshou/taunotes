"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Search,
  Plus,
  FileText,
  FolderOpen,
  FolderClosed,
  Menu,
  X,
  Trash2,
  ChevronDown,
  ChevronRight,
  Settings,
  Clock,
} from "lucide-react"
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
  refreshTrigger,
}: EnhancedSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [entries, setEntries] = useState<Entry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([])
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)
  const [insertionLine, setInsertionLine] = useState<{ position: "before" | "after"; path: string } | null>(null)
  const [recentNotes, setRecentNotes] = useState<Entry[]>([])
  const [expandedPaths, setExpandedPaths] = useState<string[]>([])

  const getParentPath = (p: string): string => {
    const sep = p.includes("\\") ? "\\" : "/"
    const idx = p.lastIndexOf(sep)
    return idx === -1 ? "" : p.substring(0, idx)
  }

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
    entries.forEach((entry) => {
      const node: FileTreeNode = {
        entry,
        children: [],
        isExpanded: expandedPaths.includes(entry.path),
      }
      nodeMap.set(entry.path, node)
    })

    // Build tree structure - only for root level items initially
    entries.forEach((entry) => {
      const node = nodeMap.get(entry.path)!
      if (!entry.path.includes("/") && !entry.path.includes("\\")) {
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
      nodes.forEach((node) => sortNodes(node.children))
    }

    sortNodes(tree)
    setFileTree(tree)

    // Re-expand previously expanded folders by lazy-loading their children
    if (expandedPaths.length > 0) {
      const depth = (p: string) => (p.match(/[\\/]/g) || []).length
      const sorted = [...expandedPaths].sort((a, b) => depth(a) - depth(b))
      sorted.forEach((p) => {
        // Only load children for nodes that exist
        if (entries.find((e) => e.path === p && e.is_dir)) {
          loadChildrenForFolder(p)
        }
      })
    }
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
  const replaceChildrenForPath = (
    nodes: FileTreeNode[],
    targetPath: string,
    newChildren: FileTreeNode[],
  ): FileTreeNode[] => {
    return nodes.map((node) => {
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
      const childNodes: FileTreeNode[] = children.map((entry) => ({
        entry,
        children: [],
        isExpanded: expandedPaths.includes(entry.path),
      }))
      setFileTree((prev) => replaceChildrenForPath(prev, folderPath, childNodes))
    } catch (error) {
      console.error("Failed to load folder children:", error)
    }
  }

  const updateRecentNotes = () => {
    const markdownFiles = entries.filter((entry) => !entry.is_dir && entry.name.endsWith(".md"))
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

    setFileTree((prev) => prev.map((node) => updateNodeExpansion(node, path)))

    // Track expanded paths to preserve after reloads
    setExpandedPaths((prev) => {
      const set = new Set(prev)
      if (isCurrentlyExpanded) {
        set.delete(path)
      } else {
        set.add(path)
      }
      return Array.from(set)
    })

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
      children: node.children.map((child) => updateNodeExpansion(child, targetPath)),
    }
  }

  const handleDragStart = (e: React.DragEvent, filePath: string) => {
    e.stopPropagation()
    // Prevent double triggers by checking if drag is already in progress
    if (draggedItem) {
      console.log("[v0] Drag already in progress, ignoring")
      return
    }
    console.log("[v0] Drag start:", filePath)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", filePath)
    setDraggedItem(filePath)

    // Add visual feedback
    const dragImage = document.createElement("div")
    dragImage.textContent = filePath.split(/[\\/]/).pop() || filePath
    dragImage.style.cssText =
      "position: absolute; top: -1000px; background: var(--sidebar-accent); padding: 8px; border-radius: 4px; font-size: 12px;"
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 0, 0)
    setTimeout(() => document.body.removeChild(dragImage), 0)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation()
    console.log("[v0] Drag end")
    setDraggedItem(null)
    setDragOverTarget(null)
    setInsertionLine(null)
  }

  const handleDragOver = (e: React.DragEvent, targetPath?: string, position?: "before" | "after") => {
    if (!draggedItem) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = "move"

    if (position && targetPath) {
      setInsertionLine({ position, path: targetPath })
      setDragOverTarget(null)
    } else if (targetPath) {
      setDragOverTarget(targetPath)
      setInsertionLine(null)
    } else {
      setDragOverTarget("__ROOT__")
      setInsertionLine(null)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation()
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverTarget(null)
      setInsertionLine(null)
    }
  }

  const handleDrop = async (e: React.DragEvent, targetPath?: string, position?: "before" | "after") => {
    e.preventDefault()
    e.stopPropagation()
    console.log("[v0] Drop event triggered for:", targetPath || "root", position ? `(${position})` : "")

    const droppedPath = e.dataTransfer.getData("text/plain")

    if (!droppedPath || droppedPath === targetPath) {
      console.log("[v0] Invalid drop - same path or no dragged item")
      setDraggedItem(null)
      setDragOverTarget(null)
      setInsertionLine(null)
      return
    }

    try {
      const fileName = droppedPath.split(/[\\/]/).pop()!
      let newPath: string

      if (position && targetPath) {
        // For now, just move to same directory as target
        const targetParent = getParentPath(targetPath)
        const separator = targetPath.includes("\\") ? "\\" : "/"
        newPath = targetParent ? targetParent + separator + fileName : fileName
        console.log("[v0] Reordering to same directory as:", targetPath)
      } else if (!targetPath || targetPath === "__ROOT__") {
        newPath = fileName
      } else {
        const targetEntry = entries.find((e) => e.path === targetPath)
        if (!targetEntry?.is_dir) return

        const separator = targetPath.includes("\\") ? "\\" : "/"
        newPath = targetPath + separator + fileName
      }

      console.log("[v0] Moving file from", droppedPath, "to", newPath)
      await renameEntry(droppedPath, newPath)
      await loadEntries()

      if (selectedNote === droppedPath) {
        onSelectNote(newPath)
        onNoteRenamed?.(droppedPath, newPath)
      }
    } catch (error) {
      console.error("Failed to move file:", error)
      alert(`Failed to move file: ${error}`)
    } finally {
      setDraggedItem(null)
      setDragOverTarget(null)
      setInsertionLine(null)
    }
  }

  const TreeNode: React.FC<{ node: FileTreeNode; depth: number; siblings?: FileTreeNode[] }> = ({
    node,
    depth,
    siblings = [],
  }) => {
    const isSelected = selectedNote === node.entry.path
    const isMarkdownFile = !node.entry.is_dir && node.entry.name.endsWith(".md")
    const isDraggedOver = dragOverTarget === node.entry.path
    const isBeingDragged = draggedItem === node.entry.path
    const showInsertionBefore = insertionLine?.position === "before" && insertionLine.path === node.entry.path
    const showInsertionAfter = insertionLine?.position === "after" && insertionLine.path === node.entry.path

    return (
      <div key={node.entry.path} style={{ marginLeft: `${depth * 12}px` }}>
        {showInsertionBefore && <div className="h-0.5 bg-blue-400 rounded-full mx-2 mb-1" />}

        <div
          draggable={!isBeingDragged} // Prevent dragging if already being dragged
          onDragStart={(e) => handleDragStart(e, node.entry.path)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => {
            if (node.entry.is_dir) {
              handleDragOver(e, node.entry.path)
            } else {
              const rect = e.currentTarget.getBoundingClientRect()
              const midpoint = rect.top + rect.height / 2
              const position = e.clientY < midpoint ? "before" : "after"
              handleDragOver(e, node.entry.path, position)
            }
          }}
          onDragLeave={handleDragLeave}
          onDrop={(e) => {
            if (node.entry.is_dir) {
              handleDrop(e, node.entry.path)
            } else {
              const rect = e.currentTarget.getBoundingClientRect()
              const midpoint = rect.top + rect.height / 2
              const position = e.clientY < midpoint ? "before" : "after"
              handleDrop(e, node.entry.path, position)
            }
          }}
          onClick={(e) => {
            e.stopPropagation()
            if (node.entry.is_dir) {
              toggleFolder(node.entry.path)
            } else if (isMarkdownFile) {
              onSelectNote(node.entry.path)
            }
          }}
          className={cn(
            "group relative flex items-center justify-between p-2 rounded-md transition-all duration-200 select-none cursor-pointer",
            isSelected && "bg-sidebar-accent text-sidebar-accent-foreground",
            !isSelected && "hover:bg-sidebar-accent/50 text-sidebar-foreground",
            isBeingDragged && "opacity-50 scale-95",
            isDraggedOver && node.entry.is_dir && "bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-400 ring-inset",
          )}
        >
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {node.entry.is_dir ? (
              <>
                {node.isExpanded ? (
                  <ChevronDown className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                )}
                {node.isExpanded ? (
                  <FolderOpen className="h-4 w-4 flex-shrink-0 text-blue-500" />
                ) : (
                  <FolderClosed className="h-4 w-4 flex-shrink-0 text-blue-500" />
                )}
              </>
            ) : (
              <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground ml-4" />
            )}
            <div className="flex-1 min-w-0">
              <span className="truncate text-sm block">
                {isMarkdownFile ? node.entry.name.replace(".md", "") : node.entry.name}
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

        {showInsertionAfter && <div className="h-0.5 bg-blue-400 rounded-full mx-2 mt-1" />}

        {node.entry.is_dir && node.isExpanded && (
          <div>
            {node.children.length > 0 ? (
              node.children.map((child) => (
                <TreeNode key={child.entry.path} node={child} depth={depth + 1} siblings={node.children} />
              ))
            ) : (
              <div style={{ marginLeft: `${(depth + 1) * 12}px` }} className="p-2 text-xs text-muted-foreground italic">
                Empty folder
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Filter entries based on search
  const filteredEntries = entries.filter((entry) => entry.name.toLowerCase().includes(searchQuery.toLowerCase()))

  useEffect(() => {
    loadEntries()
  }, [vaultPath, refreshTrigger])

  useEffect(() => {
    updateRecentNotes()
  }, [entries, selectedNote])

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
    <aside
      className="fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border z-50 flex flex-col"
      onDragOver={(e) => handleDragOver(e)} // Root drop zone drag over
      onDragLeave={handleDragLeave} // Add drag leave for root
      onDrop={(e) => handleDrop(e)} // Root drop zone drop handler
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
          <Button onClick={createNewFolder} variant="outline" className="w-full bg-transparent">
            <FolderClosed className="h-4 w-4 mr-2" />
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
                      draggable
                      onDragStart={(e) => handleDragStart(e, note.path)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onSelectNote(note.path)}
                      className={cn(
                        "group flex items-center justify-between p-2 rounded-md cursor-pointer transition-all duration-200",
                        selectedNote === note.path
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "hover:bg-sidebar-accent/50 text-sidebar-foreground",
                        draggedItem === note.path && "opacity-50 scale-95",
                      )}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="h-4 w-4 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="truncate text-sm block">{note.name.replace(".md", "")}</span>
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

            <div className="mb-6">
              <div className="flex items-center gap-2 px-2 py-1 text-sm font-medium text-muted-foreground">
                <FolderClosed className="h-4 w-4" />
                Files
              </div>
              <div className="ml-2">
                {searchQuery ? (
                  <div className="space-y-1">
                    {filteredEntries.map((entry) => (
                      <div
                        key={entry.path}
                        draggable
                        onDragStart={(e) => handleDragStart(e, entry.path)}
                        onDragEnd={handleDragEnd}
                        onClick={() => {
                          if (!entry.is_dir && entry.name.endsWith(".md")) {
                            onSelectNote(entry.path)
                          }
                        }}
                        className={cn(
                          "group flex items-center justify-between p-2 rounded-md cursor-pointer transition-all duration-200",
                          selectedNote === entry.path
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "hover:bg-sidebar-accent/50 text-sidebar-foreground",
                          draggedItem === entry.path && "opacity-50 scale-95",
                        )}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {entry.is_dir ? (
                            <FolderClosed className="h-4 w-4 flex-shrink-0 text-blue-500" />
                          ) : (
                            <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate text-sm">
                            {entry.is_dir ? entry.name : entry.name.replace(".md", "")}
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
                  <div>
                    {fileTree.map((node) => (
                      <TreeNode key={node.entry.path} node={node} depth={0} siblings={fileTree} />
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

      {dragOverTarget === "__ROOT__" && (
        <div className="absolute inset-0 bg-blue-100/20 dark:bg-blue-900/20 border-2 border-dashed border-blue-400 rounded-lg pointer-events-none" />
      )}
    </aside>
  )
}
