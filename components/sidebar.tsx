"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Search, Plus, Settings, Moon, Sun, FolderOpen, Hash, Star } from "lucide-react"

interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  starred: boolean
  createdAt: Date
  updatedAt: Date
}

interface SidebarProps {
  notes: Note[]
  activeNoteId?: string
  onNoteSelect: (noteId: string) => void
  onNewNote: () => void
  onToggleTheme: () => void
  isDarkMode: boolean
}

export function Sidebar({ notes, activeNoteId, onNoteSelect, onNewNote, onToggleTheme, isDarkMode }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const starredNotes = filteredNotes.filter((note) => note.starred)
  const recentNotes = filteredNotes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 10)

  return (
    <div className="w-80 h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-sidebar-foreground">Tau</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleTheme}
              className="text-sidebar-foreground hover:bg-sidebar-accent"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" className="text-sidebar-foreground hover:bg-sidebar-accent">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* New Note Button */}
        <Button onClick={onNewNote} className="w-full mt-3 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          New Note
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-2">
            {/* Quick Access */}
            <div className="mb-4">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">
                Quick Access
              </h3>
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
                  onClick={() => setSelectedFolder("starred")}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Starred ({starredNotes.length})
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
                  onClick={() => setSelectedFolder("recent")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Recent ({recentNotes.length})
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
                  onClick={() => setSelectedFolder("all")}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  All Notes ({notes.length})
                </Button>
              </div>
            </div>

            {/* Notes List */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">Notes</h3>
              <div className="space-y-1">
                {filteredNotes.length === 0 ? (
                  <div className="px-2 py-4 text-center text-muted-foreground text-sm">
                    {searchQuery ? "No notes found" : "No notes yet"}
                  </div>
                ) : (
                  filteredNotes.map((note) => (
                    <Button
                      key={note.id}
                      variant="ghost"
                      className={`w-full justify-start text-left p-2 h-auto ${
                        activeNoteId === note.id
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent"
                      }`}
                      onClick={() => onNoteSelect(note.id)}
                    >
                      <div className="flex items-start gap-2 w-full">
                        <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{note.title || "Untitled"}</div>
                          <div className="text-xs text-muted-foreground truncate mt-1">
                            {note.content.slice(0, 50)}...
                          </div>
                          {note.tags.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <Hash className="h-3 w-3" />
                              <span className="text-xs text-muted-foreground">
                                {note.tags.slice(0, 2).join(", ")}
                                {note.tags.length > 2 && "..."}
                              </span>
                            </div>
                          )}
                        </div>
                        {note.starred && <Star className="h-3 w-3 fill-current text-yellow-500 flex-shrink-0" />}
                      </div>
                    </Button>
                  ))
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
