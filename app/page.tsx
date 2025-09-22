"use client"

import { useState, useEffect } from "react"
import { EnhancedSidebar } from "@/components/enhanced-sidebar"
import { NoteEditor } from "@/components/note-editor"
import { ThemeToggle } from "@/components/theme-toggle"
import { VaultPicker } from "@/components/vault-picker"
import { SettingsDialog } from "@/components/settings-dialog"
import { getVault } from "@/lib/tauri-api"

export default function HomePage() {
  const [selectedNote, setSelectedNote] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [vaultPath, setVaultPath] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [shouldStartEditing, setShouldStartEditing] = useState(false)

  useEffect(() => {
    const checkVault = async () => {
      try {
        const vault = await getVault()
        setVaultPath(vault)
      } catch (error) {
        console.error('Failed to get vault:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    checkVault()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!vaultPath) {
    return <VaultPicker onVaultSelected={setVaultPath} />
  }

      return (
        <div className="flex h-screen bg-background text-foreground">
          <EnhancedSidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            selectedNote={selectedNote}
            onSelectNote={(noteId) => {
              setSelectedNote(noteId)
              // Check if this is a newly created note (has timestamp pattern)
              if (noteId && noteId.includes('Untitled-')) {
                setShouldStartEditing(true)
              }
            }}
            vaultPath={vaultPath}
            onNoteRenamed={(oldPath, newPath) => {
              if (selectedNote === oldPath) {
                setSelectedNote(newPath)
              }
            }}
            onShowSettings={() => setShowSettings(true)}
          />

          <main className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? "ml-12" : "ml-64"}`}>
            <header className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-foreground">Tau</h1>
                <span className="text-sm text-muted-foreground">— {vaultPath?.split(/[\\/]/).pop()}</span>
              </div>
              <ThemeToggle />
            </header>

            <div className="flex-1 overflow-hidden">
              <NoteEditor 
                selectedNote={selectedNote} 
                vaultPath={vaultPath}
                onNoteRenamed={(oldPath, newPath) => {
                  if (selectedNote === oldPath) {
                    setSelectedNote(newPath)
                  }
                }}
                shouldStartEditing={shouldStartEditing}
                onEditingStarted={() => setShouldStartEditing(false)}
              />
            </div>
          </main>

          <SettingsDialog 
            open={showSettings}
            onOpenChange={setShowSettings}
            vaultPath={vaultPath || ""}
          />
        </div>
      )
}
