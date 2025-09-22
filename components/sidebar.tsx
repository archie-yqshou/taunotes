"use client"

import type React from "react"

import { useState } from "react"
import { Search, Plus, FileText, Folder, Menu, X, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  selectedNote: string | null
  onSelectNote: (noteId: string | null) => void
}

interface Note {
  id: string
  title: string
  content: string
  createdAt: Date
  folder?: string
}

export function Sidebar({ collapsed, onToggle, selectedNote, onSelectNote }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [notes, setNotes] = useState<Note[]>([
    {
      id: "1",
      title: "Welcome to Tau",
      content: "# Welcome to Tau\n\nThis is your first note. Start writing!",
      createdAt: new Date(),
      folder: "Getting Started",
    },
    {
      id: "2",
      title: "Quick Notes",
      content: "# Quick Notes\n\nJot down your thoughts here.",
      createdAt: new Date(),
    },
  ])

  const createNewNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: "Untitled",
      content: "# Untitled\n\n",
      createdAt: new Date(),
    }
    setNotes([newNote, ...notes])
    onSelectNote(newNote.id)
  }

  const deleteNote = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setNotes(notes.filter((note) => note.id !== noteId))
    if (selectedNote === noteId) {
      onSelectNote(null)
    }
  }

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const groupedNotes = filteredNotes.reduce(
    (acc, note) => {
      const folder = note.folder || "Uncategorized"
      if (!acc[folder]) acc[folder] = []
      acc[folder].push(note)
      return acc
    },
    {} as Record<string, Note[]>,
  )

  if (collapsed) {
    return (
      <aside className="fixed left-0 top-0 h-full w-12 bg-sidebar border-r border-sidebar-border z-50 flex flex-col items-center py-4">
        <Button variant="ghost" size="icon" onClick={onToggle} className="mb-4 hover:bg-sidebar-accent">
          <Menu className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={createNewNote} className="hover:bg-sidebar-accent">
          <Plus className="h-4 w-4" />
        </Button>
      </aside>
    )
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border z-50 flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-sidebar-foreground">Tau Notes</h2>
          <Button variant="ghost" size="icon" onClick={onToggle} className="hover:bg-sidebar-accent">
            <X className="h-4 w-4" />
          </Button>
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

        <Button
          onClick={createNewNote}
          className="w-full bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Note
        </Button>
      </div>

      <ScrollArea className="flex-1 p-2">
        {Object.entries(groupedNotes).map(([folder, folderNotes]) => (
          <div key={folder} className="mb-4">
            <div className="flex items-center gap-2 px-2 py-1 text-sm font-medium text-muted-foreground">
              <Folder className="h-4 w-4" />
              {folder}
            </div>
            <div className="space-y-1 ml-2">
              {folderNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => onSelectNote(note.id)}
                  className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                    selectedNote === note.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate text-sm">{note.title}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-sidebar-accent"
                      onClick={(e) => deleteNote(note.id, e)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </ScrollArea>
    </aside>
  )
}
