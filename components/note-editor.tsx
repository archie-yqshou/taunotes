"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Eye, Edit3, Split } from "lucide-react"
import { readNote, writeNote, renameEntry } from "@/lib/tauri-api"

interface NoteEditorProps {
  selectedNote: string | null
  vaultPath: string
  onNoteRenamed?: (oldPath: string, newPath: string) => void
  shouldStartEditing?: boolean
  onEditingStarted?: () => void
}

export function NoteEditor({ selectedNote, vaultPath, onNoteRenamed, shouldStartEditing, onEditingStarted }: NoteEditorProps) {
  const [content, setContent] = useState("")
  const [title, setTitle] = useState("")
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "live">("edit")
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [originalTitle, setOriginalTitle] = useState("")

  useEffect(() => {
    if (selectedNote) {
      loadNote(selectedNote)
    } else {
      setContent("")
      setTitle("")
      setIsEditing(false)
      setHasUnsavedChanges(false)
    }
  }, [selectedNote])

  const loadNote = async (notePath: string) => {
    try {
      setIsLoading(true)
      const noteContent = await readNote(notePath)
      setContent(noteContent)
      const fileName = notePath.replace('.md', '').split(/[\\/]/).pop() || "Untitled"
      setTitle(fileName)
      setOriginalTitle(fileName)
      setIsEditing(false)
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error("Failed to load note:", error)
      setContent("# Error\n\nFailed to load this note.")
      setTitle("Error")
    } finally {
      setIsLoading(false)
    }
  }

  const saveNote = async () => {
    if (!selectedNote) return
    
    try {
      // Save title if changed
      await saveTitle()
      
      // Save content
      await writeNote(selectedNote, content)
      setHasUnsavedChanges(false)
      console.log("Note saved successfully")
    } catch (error) {
      console.error("Failed to save note:", error)
      alert("Failed to save note")
    }
  }

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    setHasUnsavedChanges(true)
  }

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    if (newTitle !== originalTitle) {
      setHasUnsavedChanges(true)
    }
  }

  const saveTitle = async () => {
    if (!selectedNote || title === originalTitle) return
    
    try {
      const directory = selectedNote.includes('/') || selectedNote.includes('\\') 
        ? selectedNote.substring(0, selectedNote.lastIndexOf(selectedNote.includes('/') ? '/' : '\\') + 1)
        : ''
      const newPath = directory + title + '.md'
      
      await renameEntry(selectedNote, newPath)
      setOriginalTitle(title)
      onNoteRenamed?.(selectedNote, newPath)
      console.log("File renamed successfully")
    } catch (error) {
      console.error("Failed to rename file:", error)
      alert("Failed to rename file")
      setTitle(originalTitle) // Revert title on error
    }
  }

  // Auto-save after 2 seconds of no typing
  useEffect(() => {
    if (!hasUnsavedChanges || !selectedNote) return
    
    const timer = setTimeout(() => {
      saveNote()
    }, 2000)
    
    return () => clearTimeout(timer)
  }, [content, hasUnsavedChanges, selectedNote])

  // Auto-start editing for new notes
  useEffect(() => {
    if (shouldStartEditing && selectedNote) {
      setIsEditing(true)
      onEditingStarted?.()
    }
  }, [shouldStartEditing, selectedNote, onEditingStarted])

  const renderMarkdown = (text: string) => {
    return text
      .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mb-4 text-foreground">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-semibold mb-3 text-foreground">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-xl font-medium mb-2 text-foreground">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-foreground">$1</em>')
      .replace(/^- (.*$)/gm, '<li class="ml-4 text-foreground">• $1</li>')
      .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 text-foreground">$1</li>')
      .replace(/^---$/gm, '<hr class="my-6 border-border">')
      .replace(/\n/g, "<br>")
  }

  if (!selectedNote) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <Edit3 className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold mb-2 text-foreground">Welcome to Tau</h2>
          <p className="text-muted-foreground mb-6">
            Select a note from the sidebar to start reading, or create a new note to begin writing.
          </p>
          <div className="text-sm text-muted-foreground">
            <p>✨ Clean, distraction-free writing</p>
            <p>📝 Markdown support</p>
            <p>🎨 Beautiful themes</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/30">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="text-lg font-semibold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
            placeholder="Untitled"
            disabled={!isEditing}
          />
          {hasUnsavedChanges && (
            <span className="text-xs text-orange-500 bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded">
              Unsaved
            </span>
          )}
          {isLoading && (
            <span className="text-xs text-blue-500 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
              Loading...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "edit" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("edit")}
            className="hover:bg-accent"
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant={viewMode === "live" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("live")}
            className="hover:bg-accent"
          >
            <Split className="h-4 w-4 mr-2" />
            Live
          </Button>
          <Button
            variant={viewMode === "preview" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("preview")}
            className="hover:bg-accent"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsEditing(!isEditing)} 
            className="hover:bg-accent"
          >
            <Edit3 className="h-4 w-4 mr-2" />
            {isEditing ? "Done" : "Edit"}
          </Button>
          {hasUnsavedChanges && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={saveNote}
              className="hover:bg-accent"
            >
              Save
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {viewMode === "live" ? (
          <div className="h-full flex">
            <div className="w-1/2 border-r border-border">
              <div className="h-full p-6">
                <Textarea
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Start writing your note..."
                  className="w-full h-full resize-none border-none bg-transparent text-foreground placeholder:text-muted-foreground focus:ring-0 text-base leading-relaxed"
                  disabled={!isEditing}
                />
              </div>
            </div>
            <div className="w-1/2">
              <div className="h-full overflow-y-auto p-6">
                <div
                  className="prose prose-lg max-w-none text-foreground"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                />
              </div>
            </div>
          </div>
        ) : viewMode === "preview" ? (
          <div className="h-full overflow-y-auto p-8">
            <div
              className="prose prose-lg max-w-none text-foreground"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
          </div>
        ) : (
          <div className="h-full p-8">
            <Textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Start writing your note..."
              className="w-full h-full resize-none border-none bg-transparent text-foreground placeholder:text-muted-foreground focus:ring-0 text-base leading-relaxed"
              disabled={!isEditing}
            />
          </div>
        )}
      </div>
    </div>
  )
}
