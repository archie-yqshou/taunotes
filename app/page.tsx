"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { NoteEditor } from "@/components/note-editor"
import { ThemeCustomizer } from "@/components/theme-customizer"
import { ThemeProvider } from "@/hooks/use-theme"

interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  starred: boolean
  createdAt: Date
  updatedAt: Date
}

function TauNotesApp() {
  const [notes, setNotes] = useState<Note[]>([])
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [isThemeCustomizerOpen, setIsThemeCustomizerOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)

  // Load notes from localStorage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem("tau-notes")
    if (savedNotes) {
      const parsedNotes = JSON.parse(savedNotes).map((note: any) => ({
        ...note,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt),
      }))
      setNotes(parsedNotes)
    } else {
      // Create a welcome note for new users
      const welcomeNote: Note = {
        id: "welcome",
        title: "Welcome to Tau",
        content: `# Welcome to Tau Notes

Tau is a clean, minimalist note-taking application inspired by Obsidian. Here are some features to get you started:

## Features
- **Clean Interface**: Distraction-free writing environment
- **Markdown Support**: Write with markdown formatting
- **Tags**: Organize your notes with tags
- **Search**: Quickly find your notes
- **Themes**: Customize the appearance to your liking
- **Dark/Light Mode**: Switch between themes

## Getting Started
1. Create a new note using the "New Note" button
2. Use markdown syntax for formatting
3. Add tags to organize your notes
4. Star important notes for quick access
5. Customize themes in the settings

## Markdown Examples
**Bold text** and *italic text*
- Bullet points
1. Numbered lists
> Blockquotes
\`inline code\`

Happy note-taking! 📝`,
        tags: ["welcome", "getting-started"],
        starred: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setNotes([welcomeNote])
      setActiveNoteId("welcome")
    }
  }, [])

  // Save notes to localStorage whenever notes change
  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem("tau-notes", JSON.stringify(notes))
    }
  }, [notes])

  const handleNoteSelect = (noteId: string) => {
    setActiveNoteId(noteId)
  }

  const handleNewNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: "",
      content: "",
      tags: [],
      starred: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setNotes((prev) => [newNote, ...prev])
    setActiveNoteId(newNote.id)
  }

  const handleSaveNote = (noteData: Partial<Note>) => {
    if (!noteData.id) {
      // This shouldn't happen, but handle it gracefully
      return
    }

    setNotes((prev) =>
      prev.map((note) => (note.id === noteData.id ? { ...note, ...noteData, updatedAt: new Date() } : note)),
    )
  }

  const handleDeleteNote = (noteId: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== noteId))
    if (activeNoteId === noteId) {
      setActiveNoteId(notes.length > 1 ? notes.find((n) => n.id !== noteId)?.id || null : null)
    }
  }

  const handleToggleStar = (noteId: string) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === noteId ? { ...note, starred: !note.starred, updatedAt: new Date() } : note)),
    )
  }

  const handleToggleTheme = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle("dark")
  }

  const activeNote = notes.find((note) => note.id === activeNoteId) || null

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        notes={notes}
        activeNoteId={activeNoteId}
        onNoteSelect={handleNoteSelect}
        onNewNote={handleNewNote}
        onToggleTheme={handleToggleTheme}
        isDarkMode={isDarkMode}
      />
      <NoteEditor
        note={activeNote}
        onSave={handleSaveNote}
        onDelete={handleDeleteNote}
        onToggleStar={handleToggleStar}
      />
      <ThemeCustomizer isOpen={isThemeCustomizerOpen} onClose={() => setIsThemeCustomizerOpen(false)} />
    </div>
  )
}

export default function Page() {
  return (
    <ThemeProvider>
      <TauNotesApp />
    </ThemeProvider>
  )
}
