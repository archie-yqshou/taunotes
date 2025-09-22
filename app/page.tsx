"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { NoteEditor } from "@/components/note-editor"
import { ThemeToggle } from "@/components/theme-toggle"

export default function HomePage() {
  const [selectedNote, setSelectedNote] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        selectedNote={selectedNote}
        onSelectNote={setSelectedNote}
      />

      <main className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? "ml-12" : "ml-64"}`}>
        <header className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-foreground">Tau</h1>
            <span className="text-sm text-muted-foreground">{selectedNote ? "Editing" : "Ready to write"}</span>
          </div>
          <ThemeToggle />
        </header>

        <div className="flex-1 overflow-hidden">
          <NoteEditor selectedNote={selectedNote} />
        </div>
      </main>
    </div>
  )
}
