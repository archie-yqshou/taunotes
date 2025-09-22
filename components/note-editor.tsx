"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Star,
  MoreHorizontal,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Hash,
  X,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  starred: boolean
  createdAt: Date
  updatedAt: Date
}

interface NoteEditorProps {
  note: Note | null
  onSave: (note: Partial<Note>) => void
  onDelete: (noteId: string) => void
  onToggleStar: (noteId: string) => void
}

export function NoteEditor({ note, onSave, onDelete, onToggleStar }: NoteEditorProps) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setContent(note.content)
      setTags(note.tags)
      setIsEditing(false)
    } else {
      setTitle("")
      setContent("")
      setTags([])
      setIsEditing(true)
    }
  }, [note])

  const handleSave = () => {
    if (!note && !title.trim() && !content.trim()) return

    const noteData = {
      title: title.trim() || "Untitled",
      content: content.trim(),
      tags,
      updatedAt: new Date(),
    }

    if (!note) {
      // New note
      onSave({
        ...noteData,
        id: Date.now().toString(),
        starred: false,
        createdAt: new Date(),
      })
    } else {
      // Update existing note
      onSave({ ...noteData, id: note.id })
    }
    setIsEditing(false)
  }

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()]
      setTags(updatedTags)
      setNewTag("")
      if (note) {
        onSave({ id: note.id, tags: updatedTags })
      }
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = tags.filter((tag) => tag !== tagToRemove)
    setTags(updatedTags)
    if (note) {
      onSave({ id: note.id, tags: updatedTags })
    }
  }

  const insertMarkdown = (before: string, after = "") => {
    if (!contentRef.current) return

    const textarea = contentRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end)

    setContent(newText)

    // Set cursor position after insertion
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + before.length + selectedText.length + after.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  if (!note && !isEditing) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-6xl mb-4">📝</div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">Welcome to Tau</h2>
          <p className="text-muted-foreground mb-4">
            Select a note from the sidebar or create a new one to get started.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <Input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
              className="text-2xl font-semibold border-none bg-transparent p-0 focus-visible:ring-0 text-foreground placeholder:text-muted-foreground"
              onBlur={handleSave}
            />
          </div>
          <div className="flex items-center gap-2">
            {note && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleStar(note.id)}
                className={note.starred ? "text-yellow-500" : "text-muted-foreground"}
              >
                <Star className={`h-4 w-4 ${note.starred ? "fill-current" : ""}`} />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(!isEditing)}>
                  {isEditing ? "Preview" : "Edit"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {note && (
                  <DropdownMenuItem
                    onClick={() => onDelete(note.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    Delete Note
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2 flex-wrap">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              <Hash className="h-3 w-3 mr-1" />
              {tag}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-1 hover:bg-transparent"
                onClick={() => handleRemoveTag(tag)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
          <div className="flex items-center gap-1">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
              placeholder="Add tag..."
              className="h-6 text-xs w-20 border-none bg-transparent p-1 focus-visible:ring-0"
            />
            {newTag && (
              <Button variant="ghost" size="sm" className="h-6 px-1 text-xs" onClick={handleAddTag}>
                Add
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      {isEditing && (
        <div className="border-b border-border p-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown("**", "**")}
              className="text-muted-foreground hover:text-foreground"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown("*", "*")}
              className="text-muted-foreground hover:text-foreground"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown("~~", "~~")}
              className="text-muted-foreground hover:text-foreground"
            >
              <Underline className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown("- ")}
              className="text-muted-foreground hover:text-foreground"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown("1. ")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown("> ")}
              className="text-muted-foreground hover:text-foreground"
            >
              <Quote className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown("`", "`")}
              className="text-muted-foreground hover:text-foreground"
            >
              <Code className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown("[", "](url)")}
              className="text-muted-foreground hover:text-foreground"
            >
              <Link className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-4">
        <Textarea
          ref={contentRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleSave}
          placeholder="Start writing your note..."
          className="w-full h-full resize-none border-none bg-transparent p-0 focus-visible:ring-0 text-foreground placeholder:text-muted-foreground text-base leading-relaxed"
          style={{ minHeight: "calc(100vh - 200px)" }}
        />
      </div>

      {/* Footer */}
      {note && (
        <div className="border-t border-border p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Created: {note.createdAt.toLocaleDateString()}</span>
            <span>Modified: {note.updatedAt.toLocaleDateString()}</span>
          </div>
        </div>
      )}
    </div>
  )
}
