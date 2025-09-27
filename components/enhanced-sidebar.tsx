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
import { listEntries, createNote, createFolder, deleteEntry, renameEntry, reorderEntries, type Entry } from "@/lib/tauri-api"
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
  const [insertionLine, setInsertionLine] = useState<{ position: "before" | "after"; path: string; depth?: number } | null>(null)
  const [animatedSpacing, setAnimatedSpacing] = useState<{ position: "before" | "after"; path: string; depth?: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null)
  const [dragStartTime, setDragStartTime] = useState<number | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
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

      // Refresh expanded folders to update their contents
      if (expandedPaths.length > 0) {
        const depth = (p: string) => (p.match(/[\\/]/g) || []).length
        const sorted = [...expandedPaths].sort((a, b) => depth(a) - depth(b))
        sorted.forEach((p) => {
          if (vaultEntries.find((e) => e.path === p && e.is_dir)) {
            loadChildrenForFolder(p)
          }
        })
      }
    } catch (error) {
      console.error("Failed to load entries:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const buildFileTree = (entries: Entry[]) => {
    const tree: FileTreeNode[] = []
    const nodeMap = new Map<string, FileTreeNode>()

    // Filter out .tau_order.json files and create nodes for all other entries
    const filteredEntries = entries.filter(entry => !entry.name.endsWith('.tau_order.json'))

    filteredEntries.forEach((entry) => {
      const node: FileTreeNode = {
        entry,
        children: [],
        isExpanded: expandedPaths.includes(entry.path),
      }
      nodeMap.set(entry.path, node)
    })

    // Build tree structure - only for root level items initially
    filteredEntries.forEach((entry) => {
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
    const markdownFiles = entries.filter((entry) => !entry.is_dir && entry.name.endsWith(".md") && !entry.name.endsWith('.tau_order.json'))
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

  const handleMouseDown = (e: React.MouseEvent, filePath: string) => {
    // Only start drag on left mouse button
    if (e.button !== 0) return
    
    
    // Record the start position and time for potential drag
    setDragStartPos({ x: e.clientX, y: e.clientY })
    setDragStartTime(Date.now())
    
    // For files, prevent text selection
    const entry = entries.find(ent => ent.path === filePath)
    if (!entry?.is_dir) {
      e.preventDefault()
    }
  }

  const handleMouseMove = (e: React.MouseEvent, filePath: string) => {
    // Always update mouse position when dragging
    if (isDragging) {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    
    if (!dragStartPos || !dragStartTime || isDragging) return
    
    const deltaX = Math.abs(e.clientX - dragStartPos.x)
    const deltaY = Math.abs(e.clientY - dragStartPos.y)
    const timeElapsed = Date.now() - dragStartTime
    
    // For folders, require more movement to start drag (harder to accidentally drag)
    const entry = entries.find(ent => ent.path === filePath)
    const threshold = entry?.is_dir ? 15 : 5
    const minTime = entry?.is_dir ? 200 : 50 // Delay for folders to allow clicking
    
    // Start drag if mouse moved more than threshold pixels AND enough time has passed
    if ((deltaX > threshold || deltaY > threshold) && timeElapsed > minTime) {
      setIsDragging(true)
      setDraggedItem(filePath)
      setMousePos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseEnter = (targetPath: string, depth: number = 0, event?: React.MouseEvent, context: string = "unknown") => {

    if (!isDragging || !draggedItem) return

    // Try to find the target in entries first, then in file tree
    let targetEntry = entries.find(e => e.path === targetPath)
    if (!targetEntry) {
      targetEntry = findNodeByPath(fileTree, targetPath)?.entry
    }

    if (targetEntry && targetPath !== draggedItem && event && context === "tree") {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
      const mouseY = event.clientY
      const elementHeight = rect.height
      const relativeY = mouseY - rect.top

      if (targetEntry.is_dir) {
        // For folders, create three zones: top 25% (before), middle 50% (into), bottom 25% (after)
        const topZone = elementHeight * 0.25
        const bottomZone = elementHeight * 0.75

        if (relativeY < topZone) {
          // Top zone - check if this is a folder exit or regular before placement
          const draggedDir = getParentPath(draggedItem)
          if (draggedDir === targetPath) {
            // This is a folder exit to before position
            setDragOverTarget(null)
            const parentDepth = Math.max(0, getParentPath(targetPath).split(/[\\/]/).filter(p => p).length)
            const spacingInfo = { position: "before" as const, path: targetPath, depth: parentDepth }
            setInsertionLine(spacingInfo)
            setAnimatedSpacing(spacingInfo)
          } else {
            // Regular before placement
            setDragOverTarget(null)
            const spacingInfo = { position: "before" as const, path: targetPath, depth }
            setInsertionLine(spacingInfo)
            setAnimatedSpacing(spacingInfo)
          }
        } else if (relativeY > bottomZone) {
          // Bottom zone - check if this is a folder exit or regular after placement
          const draggedDir = getParentPath(draggedItem)
          if (draggedDir === targetPath) {
            // This is a folder exit to after position
            setDragOverTarget(null)
            const parentDepth = Math.max(0, getParentPath(targetPath).split(/[\\/]/).filter(p => p).length)
            const spacingInfo = { position: "after" as const, path: targetPath, depth: parentDepth }
            setInsertionLine(spacingInfo)
            setAnimatedSpacing(spacingInfo)
          } else {
            // Regular after placement
            setDragOverTarget(null)
            const spacingInfo = { position: "after" as const, path: targetPath, depth }
            setInsertionLine(spacingInfo)
            setAnimatedSpacing(spacingInfo)
          }
        } else {
          // Middle zone - place into folder
          setDragOverTarget(targetPath)
          setInsertionLine(null)
          setAnimatedSpacing(null)
        }
      } else {
        // For files, use simple before/after based on middle
        const elementMiddle = rect.top + rect.height / 2
        const position = mouseY < elementMiddle ? "before" : "after"

        setDragOverTarget(null)
        const spacingInfo = { position: position as "before" | "after", path: targetPath, depth }
        setInsertionLine(spacingInfo)
        setAnimatedSpacing(spacingInfo)
      }
    } else {
      setDragOverTarget(null)
      setInsertionLine(null)
      setAnimatedSpacing(null)
    }
  }

  // Handle mouse enter for folder exit zones
  const handleFolderExitZoneEnter = (folderPath: string, event: React.MouseEvent) => {
    if (!isDragging || !draggedItem) return

    // Check if dragged item is inside this folder
    const draggedDir = getParentPath(draggedItem)
    if (draggedDir === folderPath) {
      setDragOverTarget(null)

      // Show insertion line at the parent directory level (one level up from folder)
      const parentDepth = Math.max(0, getParentPath(folderPath).split(/[\\/]/).filter(p => p).length)
      const spacingInfo = { position: "after" as const, path: folderPath, depth: parentDepth }
      setInsertionLine(spacingInfo)
      setAnimatedSpacing(spacingInfo)
    }
  }

  const handleMouseLeave = () => {
    if (!isDragging) return
    setDragOverTarget(null)
    setInsertionLine(null)
    setAnimatedSpacing(null)
  }

  const handleMouseUp = async (targetPath?: string) => {

    // If we're not dragging, this might be a click
    if (!isDragging || !draggedItem) {
      // Check if this was a quick click (not a drag)
      if (targetPath && dragStartTime && dragStartPos) {
        const timeElapsed = Date.now() - dragStartTime

        // Try to find the target in entries first, then in file tree
        let entry = entries.find(e => e.path === targetPath)
        if (!entry) {
          entry = findNodeByPath(fileTree, targetPath)?.entry
        }

        // For folders, require shorter time and minimal movement for toggle
        const isQuickClick = entry?.is_dir
          ? timeElapsed < 250 // Longer time allowance for folders
          : timeElapsed < 200


        if (isQuickClick) {
          if (entry?.is_dir) {
            toggleFolder(targetPath)
          } else if (entry && !entry.is_dir && entry.name.endsWith('.md')) {
            onSelectNote(targetPath)
          }
        } else {
        }
      } else {
      }

      setDragStartPos(null)
      setDragStartTime(null)
      return
    }


    // Handle reordering if we have an insertion line (highest priority)
    if (insertionLine) {
      await performReorder(draggedItem, insertionLine)
    } else if (targetPath && targetPath !== draggedItem) {
      // Try to find the target in entries first, then in file tree
      let targetEntry = entries.find(e => e.path === targetPath)
      if (!targetEntry) {
        targetEntry = findNodeByPath(fileTree, targetPath)?.entry
      }
      if (targetEntry?.is_dir) {
        await performDrop(draggedItem, targetPath)
      } else {
      }
    }

    // Reset drag state
    setIsDragging(false)
    setDragOverTarget(null)
    setInsertionLine(null)
    setAnimatedSpacing(null)
    setDragStartPos(null)
    setDragStartTime(null)
    setMousePos(null)

    // Delay clearing draggedItem to prevent immediate clicks
    setTimeout(() => {
      setDraggedItem(null)
    }, 50)
  }

  const performDrop = async (sourcePath: string, targetFolderPath: string) => {
    try {
      const fileName = sourcePath.split(/[\\/]/).pop()!
      const separator = targetFolderPath.includes("\\") ? "\\" : "/"
      const newPath = targetFolderPath ? targetFolderPath + separator + fileName : fileName


      await renameEntry(sourcePath, newPath)
      await loadEntries()

      if (selectedNote === sourcePath) {
        onSelectNote(newPath)
        onNoteRenamed?.(sourcePath, newPath)
      }

    } catch (error) {
      console.error("Move failed:", error)
      alert(`Failed to move: ${error}`)
    }
  }

  const performReorder = async (sourcePath: string, insertionInfo: { position: "before" | "after"; path: string; depth?: number }) => {
    try {

      // Check if this is a folder exit operation (dragging from inside folder to outside)
      const sourceDir = getParentPath(sourcePath)
      const draggedEntry = entries.find(e => e.path === insertionInfo.path)

      if (draggedEntry?.is_dir && sourceDir === insertionInfo.path) {
        // This is a folder exit - move file from inside folder to parent directory
        const fileName = sourcePath.split(/[\\/]/).pop()!
        const targetDir = getParentPath(insertionInfo.path)
        const separator = targetDir ? (targetDir.includes("\\") ? "\\" : "/") : ""
        const newPath = targetDir ? targetDir + separator + fileName : fileName


        await renameEntry(sourcePath, newPath)

        // Now handle the ordering within the target directory
        if (insertionInfo.position === "before" || insertionInfo.position === "after") {
          await reorderEntries(targetDir || null, newPath, insertionInfo.path, insertionInfo.position)
        }

        await loadEntries()

        if (selectedNote === sourcePath) {
          onSelectNote(newPath)
          onNoteRenamed?.(sourcePath, newPath)
        }

        return
      }

      // Get the target directory based on the insertion target's parent
      const targetDir = getParentPath(insertionInfo.path)


      // Only move between directories if they're actually different
      if (targetDir !== sourceDir) {
        const fileName = sourcePath.split(/[\\/]/).pop()!
        const separator = targetDir ? (targetDir.includes("\\") ? "\\" : "/") : ""
        const newPath = targetDir ? targetDir + separator + fileName : fileName

        await renameEntry(sourcePath, newPath)
        await loadEntries()

        if (selectedNote === sourcePath) {
          onSelectNote(newPath)
          onNoteRenamed?.(sourcePath, newPath)
        }
      } else {
        // Same directory reordering - use new reorder API

        const dirPath = sourceDir || null // null for root directory
        await reorderEntries(dirPath, sourcePath, insertionInfo.path, insertionInfo.position)
        await loadEntries()
      }

    } catch (error) {
      console.error("Reorder failed:", error)
      alert(`Failed to reorder: ${error}`)
    }
  }


  // Add global mouse up handler to handle drops anywhere
  useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (isDragging) {

        // Only handle root drops if there's no insertion line (insertion line takes priority)
        if (!insertionLine) {
          // Check if we're dropping on the sidebar background (root directory)
          const sidebar = document.querySelector('aside')
          if (sidebar && sidebar.contains(e.target as Node)) {
            const isOnFileItem = (e.target as Element).closest('[data-file-path]')
            if (!isOnFileItem && draggedItem) {
              // Dropping on sidebar background - move to root
              const fileName = draggedItem.split(/[\\/]/).pop()!
              if (fileName !== draggedItem) { // Only if it's currently in a subfolder
                performDrop(draggedItem, "").catch(console.error)
              }
            }
          }
        } else {
        }

        setIsDragging(false)
        setDraggedItem(null)
        setDragOverTarget(null)
        setInsertionLine(null)
        setAnimatedSpacing(null)
        setDragStartPos(null)
        setDragStartTime(null)
        setMousePos(null)
      }
    }

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setMousePos({ x: e.clientX, y: e.clientY })
      }
    }

    document.addEventListener("mouseup", handleGlobalMouseUp)
    document.addEventListener("mousemove", handleGlobalMouseMove)

    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp)
      document.removeEventListener("mousemove", handleGlobalMouseMove)
    }
  }, [isDragging, draggedItem, insertionLine, animatedSpacing])

  const TreeNode: React.FC<{ node: FileTreeNode; depth: number; siblings?: FileTreeNode[] }> = ({
    node,
    depth,
    siblings = [],
  }) => {
    const isSelected = selectedNote === node.entry.path
    const isMarkdownFile = !node.entry.is_dir && node.entry.name.endsWith(".md")
    const isDraggedOver = dragOverTarget === node.entry.path
    const showInsertionBefore = insertionLine?.position === "before" && insertionLine.path === node.entry.path
    const isBeingDragged = draggedItem === node.entry.path
    const showInsertionAfter = insertionLine?.position === "after" && insertionLine.path === node.entry.path
    const insertionDepth = insertionLine?.depth || 0

    // Animated spacing logic
    const spacingBefore = animatedSpacing?.position === "before" && animatedSpacing.path === node.entry.path
    const spacingAfter = animatedSpacing?.position === "after" && animatedSpacing.path === node.entry.path

    return (
      <div key={node.entry.path} style={{ marginLeft: `${depth * 12}px` }}>
        {spacingBefore && (
          <div
            className="transition-all duration-300 ease-out overflow-hidden"
            style={{
              height: isDragging ? '48px' : '0px',
              marginLeft: `${insertionDepth * 12 + 8}px`,
              marginRight: '8px',
            }}
          >
            <div className="h-12 bg-blue-50 dark:bg-blue-950/20 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center opacity-75">
              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Drop here</div>
            </div>
          </div>
        )}

        <div
          data-file-path={node.entry.path}
          onMouseDown={(e) => handleMouseDown(e, node.entry.path)}
          onMouseMove={(e) => handleMouseMove(e, node.entry.path)}
          onMouseEnter={(e) => handleMouseEnter(node.entry.path, depth, e, "tree")}
          onMouseLeave={handleMouseLeave}
          onMouseUp={(e) => {
            handleMouseUp(node.entry.path)
          }}
          className={cn(
            "group relative flex items-center justify-between p-2 rounded-md transition-all duration-200 select-none",
            isSelected && "bg-sidebar-accent text-sidebar-accent-foreground",
            !isSelected && "hover:bg-sidebar-accent/50 text-sidebar-foreground",
            isDraggedOver && node.entry.is_dir && "bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-400 ring-inset transform scale-105",
            isBeingDragged && "opacity-50 scale-95 transform",
            node.entry.is_dir ? "cursor-grab active:cursor-grabbing" : "cursor-grab active:cursor-grabbing",
            isDragging && draggedItem !== node.entry.path && node.entry.is_dir && "cursor-copy",
            isDragging && "cursor-grabbing"
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
                  <FolderOpen className={cn(
                    "h-4 w-4 flex-shrink-0 text-blue-500 transition-all duration-200",
                    isDraggedOver && "text-blue-600 scale-110"
                  )} />
                ) : (
                  <FolderClosed className={cn(
                    "h-4 w-4 flex-shrink-0 text-blue-500 transition-all duration-200",
                    isDraggedOver && "text-blue-600 scale-110"
                  )} />
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

        {spacingAfter && (
          <div
            className="transition-all duration-300 ease-out overflow-hidden"
            style={{
              height: isDragging ? '48px' : '0px',
              marginLeft: `${insertionDepth * 12 + 8}px`,
              marginRight: '8px',
            }}
          >
            <div className="h-12 bg-blue-50 dark:bg-blue-950/20 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center opacity-75">
              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Drop here</div>
            </div>
          </div>
        )}

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

            {/* Folder exit zone - allows dragging files out of this folder */}
            {isDragging && draggedItem && getParentPath(draggedItem) === node.entry.path && (
              <div
                className="folder-exit-zone h-6 -mt-1 transition-all duration-200 bg-blue-50 dark:bg-blue-950/20 border-t-2 border-dashed border-blue-400 dark:border-blue-500 cursor-pointer z-10"
                style={{ marginLeft: `${depth * 12}px` }}
                onMouseEnter={(e) => handleFolderExitZoneEnter(node.entry.path, e)}
                onMouseLeave={handleMouseLeave}
                onMouseUp={() => handleMouseUp(node.entry.path)}
              >
                <div className="flex items-center justify-center h-full">
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium opacity-75">
                    ↑ Drag here to move out of folder
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Filter entries based on search and hide .tau_order.json files
  const filteredEntries = entries.filter((entry) =>
    entry.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !entry.name.endsWith('.tau_order.json')
  )

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
      className={cn(
        "fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border z-50 flex flex-col",
        isDragging && "bg-blue-50 dark:bg-blue-950/20"
      )}
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
                      data-file-path={note.path}
                      onMouseDown={(e) => handleMouseDown(e, note.path)}
                      onMouseMove={(e) => handleMouseMove(e, note.path)}
                      onMouseEnter={(e) => handleMouseEnter(note.path, 0, e, "recent")}
                      onMouseLeave={handleMouseLeave}
                      onMouseUp={() => handleMouseUp(note.path)}
                      className={cn(
                        "group flex items-center justify-between p-2 rounded-md cursor-pointer transition-all duration-200",
                        selectedNote === note.path
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "hover:bg-sidebar-accent/50 text-sidebar-foreground",
                        draggedItem === note.path && "opacity-50 scale-95",
                        dragOverTarget === note.path && "bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-400"
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
                        data-file-path={entry.path}
                        onMouseDown={(e) => handleMouseDown(e, entry.path)}
                        onMouseMove={(e) => handleMouseMove(e, entry.path)}
                        onMouseEnter={(e) => handleMouseEnter(entry.path, 0, e, "search")}
                        onMouseLeave={handleMouseLeave}
                        onMouseUp={() => handleMouseUp(entry.path)}
                        className={cn(
                          "group flex items-center justify-between p-2 rounded-md cursor-pointer transition-all duration-200",
                          selectedNote === entry.path
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "hover:bg-sidebar-accent/50 text-sidebar-foreground",
                          draggedItem === entry.path && "opacity-50 scale-95",
                          dragOverTarget === entry.path && "bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-400"
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
      
      {/* Floating Drag Preview */}
      {isDragging && draggedItem && mousePos && (
        <div
          className="fixed pointer-events-none z-[9999] bg-sidebar border border-sidebar-border rounded-lg shadow-2xl px-3 py-2 text-sm text-sidebar-foreground scale-110"
          style={{
            left: mousePos.x - 60, // Offset to center better
            top: mousePos.y - 20,  // Offset to be slightly above cursor
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
            transform: 'none' // Remove CSS transitions for instant following
          }}
        >
          <div className="flex items-center gap-2">
            {entries.find(e => e.path === draggedItem)?.is_dir ? (
              <FolderClosed className="h-4 w-4 text-blue-500" />
            ) : (
              <FileText className="h-4 w-4 text-gray-600" />
            )}
            <span className="font-medium">
              {draggedItem.split(/[\\/]/).pop()?.replace('.md', '') || draggedItem}
            </span>
          </div>
        </div>
      )}
    </aside>
  )
}
