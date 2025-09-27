"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Eye, Edit3 } from "lucide-react"
import { readNote, writeNote, renameEntry } from "@/lib/tauri-api"

interface NoteEditorProps {
  selectedNote: string | null
  vaultPath: string
  onNoteRenamed?: (oldPath: string, newPath: string) => void
  shouldStartEditing?: boolean
  onEditingStarted?: () => void
}

export function NoteEditor({
  selectedNote,
  vaultPath,
  onNoteRenamed,
  shouldStartEditing,
  onEditingStarted,
}: NoteEditorProps) {
  const [content, setContent] = useState("")
  const [title, setTitle] = useState("")
  const [viewMode, setViewMode] = useState<"live" | "preview">("live") // Simplified to just live and preview modes
  const [isLoading, setIsLoading] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [originalTitle, setOriginalTitle] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selectedNote) {
      loadNote(selectedNote)
    } else {
      setContent("")
      setTitle("")
      setHasUnsavedChanges(false)
    }
  }, [selectedNote])

  const loadNote = async (notePath: string) => {
    try {
      setIsLoading(true)
      const noteContent = await readNote(notePath)
      setContent(noteContent)
      const fileName = notePath.replace(".md", "").split(/[\\/]/).pop() || "Untitled"
      setTitle(fileName)
      setOriginalTitle(fileName)
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
      await saveTitle()
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
      const directory =
        selectedNote.includes("/") || selectedNote.includes("\\")
          ? selectedNote.substring(0, selectedNote.lastIndexOf(selectedNote.includes("/") ? "/" : "\\") + 1)
          : ""
      const newPath = directory + title + ".md"

      await renameEntry(selectedNote, newPath)
      setOriginalTitle(title)
      onNoteRenamed?.(selectedNote, newPath)
      console.log("File renamed successfully")
    } catch (error) {
      console.error("Failed to rename file:", error)
      alert("Failed to rename file")
      setTitle(originalTitle)
    }
  }

  useEffect(() => {
    if (!hasUnsavedChanges || !selectedNote) return

    const timer = setTimeout(() => {
      saveNote()
    }, 2000)

    return () => clearTimeout(timer)
  }, [content, hasUnsavedChanges, selectedNote])

  useEffect(() => {
    if (shouldStartEditing && selectedNote) {
      onEditingStarted?.()
    }
  }, [shouldStartEditing, selectedNote, onEditingStarted])

  const renderMarkdown = (text: string) => {
    const html = text
      // Headers
      .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mb-4 text-foreground border-b border-border pb-2">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-semibold mb-3 text-foreground">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-xl font-medium mb-2 text-foreground">$1</h3>')
      .replace(/^#### (.*$)/gm, '<h4 class="text-lg font-medium mb-2 text-foreground">$1</h4>')
      // Bold and italic
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-foreground">$1</em>')
      // Code blocks
      .replace(
        /```([\s\S]*?)```/g,
        '<pre class="bg-muted p-4 rounded-md my-4 overflow-x-auto"><code class="text-sm font-mono text-foreground">$1</code></pre>',
      )
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm font-mono text-foreground">$1</code>')
      // Lists
      .replace(/^- (.*$)/gm, '<li class="ml-4 text-foreground list-disc list-inside">$1</li>')
      .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 text-foreground list-decimal list-inside">$1</li>')
      // Links
      .replace(/\[([^\]]+)\]$$([^)]+)$$/g, '<a href="$2" class="text-blue-500 hover:text-blue-600 underline">$1</a>')
      // Horizontal rules
      .replace(/^---$/gm, '<hr class="my-6 border-border">')
      // Line breaks
      .replace(/\n/g, "<br>")

    return html
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
          <div className="text-sm text-muted-foreground space-y-1">
            <p>✨ Clean, distraction-free writing</p>
            <p>📝 Live markdown preview</p>
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
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="text-lg font-semibold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
            placeholder="Untitled"
          />
          {hasUnsavedChanges && (
            <span className="text-xs text-orange-500 bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded">Unsaved</span>
          )}
          {isLoading && (
            <span className="text-xs text-blue-500 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">Loading...</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "live" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("live")}
            className="hover:bg-accent"
          >
            <Edit3 className="h-4 w-4 mr-2" />
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
          {hasUnsavedChanges && (
            <Button variant="outline" size="sm" onClick={saveNote} className="hover:bg-accent bg-transparent">
              Save
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {viewMode === "preview" ? (
          <div className="h-full overflow-y-auto p-8">
            <div
              className="prose prose-lg max-w-none text-foreground"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
          </div>
        ) : (
          <div className="h-full flex">
            <div className="w-1/2 border-r border-border">
              <div className="h-full p-6">
                <Textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Start writing your note..."
                  className="w-full h-full resize-none border-none bg-transparent text-foreground placeholder:text-muted-foreground focus:ring-0 text-base leading-relaxed font-mono"
                />
              </div>
            </div>
            <div className="w-1/2">
              <div className="h-full overflow-y-auto p-6" ref={previewRef}>
                <div
                  className="prose prose-lg max-w-none text-foreground"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
