"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Eye, Edit3, FileText } from "lucide-react"
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
        <div className="text-center max-w-2xl px-8">
          <div className="w-32 h-32 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center border border-border/50">
            <FileText className="h-16 w-16 text-blue-500" />
          </div>
          <h1 className="text-4xl font-bold mb-4 text-foreground">Welcome to Tau</h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            Your clean, distraction-free note-taking companion inspired by Obsidian.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-6 rounded-xl bg-card border border-border/50 hover:border-border transition-colors">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4 mx-auto">
                <Edit3 className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="font-semibold mb-2 text-foreground">Live Preview</h3>
              <p className="text-sm text-muted-foreground">
                See your markdown rendered in real-time as you type, just like Obsidian.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-card border border-border/50 hover:border-border transition-colors">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4 mx-auto">
                {/* Placeholder for FolderClosed icon */}
              </div>
              <h3 className="font-semibold mb-2 text-foreground">Organized</h3>
              <p className="text-sm text-muted-foreground">
                Drag and drop files and folders to keep your notes perfectly organized.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-card border border-border/50 hover:border-border transition-colors">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4 mx-auto">
                <Eye className="h-6 w-6 text-purple-500" />
              </div>
              <h3 className="font-semibold mb-2 text-foreground">Clean Design</h3>
              <p className="text-sm text-muted-foreground">
                Minimal, beautiful interface that lets you focus on your thoughts.
              </p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              Get started by selecting a note from the sidebar or creating a new one.
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                Auto-save enabled
              </span>
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                Markdown support
              </span>
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                Theme customization
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/30 backdrop-blur-sm">
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
            <span className="text-xs text-orange-500 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-full">
              Unsaved
            </span>
          )}
          {isLoading && (
            <span className="text-xs text-blue-500 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
              Loading...
            </span>
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
