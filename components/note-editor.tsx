"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Eye, Edit3 } from "lucide-react"

interface NoteEditorProps {
  selectedNote: string | null
}

export function NoteEditor({ selectedNote }: NoteEditorProps) {
  const [content, setContent] = useState("")
  const [title, setTitle] = useState("")
  const [isPreview, setIsPreview] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (selectedNote) {
      // In a real app, you'd fetch the note content here
      setContent(
        "# Welcome to Tau\n\nThis is your note content. Start editing to see the magic happen!\n\n## Features\n\n- **Clean interface** inspired by Obsidian\n- **Markdown support** for rich formatting\n- **Dark/Light themes** for comfortable writing\n- **Organized sidebar** for easy navigation\n\n## Getting Started\n\n1. Click the edit button to start writing\n2. Use markdown syntax for formatting\n3. Toggle preview to see your formatted content\n4. Create new notes with the + button\n\n---\n\n*Happy writing!*",
      )
      setTitle("Welcome to Tau")
      setIsEditing(false)
    } else {
      setContent("")
      setTitle("")
      setIsEditing(false)
    }
  }, [selectedNote])

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
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-semibold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
            placeholder="Untitled"
            disabled={!isEditing}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setIsPreview(!isPreview)} className="hover:bg-accent">
            <Eye className="h-4 w-4 mr-2" />
            {isPreview ? "Edit" : "Preview"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)} className="hover:bg-accent">
            <Edit3 className="h-4 w-4 mr-2" />
            {isEditing ? "Done" : "Edit"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {isPreview ? (
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
              onChange={(e) => setContent(e.target.value)}
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
