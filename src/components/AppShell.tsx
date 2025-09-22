import { useState, useEffect } from 'react'
import { VaultPicker } from './VaultPicker'
import { Sidebar } from './Sidebar'
import { Editor } from './Editor'
import { Toolbar } from './Toolbar'
import { setVault, getVault, createFolder } from '../lib/api'
import { getSettings, saveSettings, initializeTheme } from '../lib/storage'

export function AppShell() {
  const [vaultPath, setVaultPath] = useState<string | null>(null)
  const [isLoadingVault, setIsLoadingVault] = useState(true)
  const [currentNote, setCurrentNote] = useState<string | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(280)
  const [isPreviewMode, setIsPreviewMode] = useState(false)

  // Initialize app state
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize theme
        initializeTheme()
        
        // Load vault path from settings and Tauri state
        const settings = getSettings()
        if (settings.vaultPath) {
          try {
            await setVault(settings.vaultPath)
            const currentVault = await getVault()
            if (currentVault) {
              setVaultPath(currentVault)
              setSidebarWidth(settings.sidebarWidth)
            }
          } catch (error) {
            console.warn('Failed to load vault from settings:', error)
            // Clear invalid vault path from settings
            saveSettings({ vaultPath: null })
          }
        }
      } catch (error) {
        console.error('Failed to initialize app:', error)
      } finally {
        setIsLoadingVault(false)
      }
    }

    initializeApp()
  }, [])

  const handleVaultSelected = async (path: string) => {
    try {
      setIsLoadingVault(true)
      
      // Check if we need to create the directory (for new vaults)
      try {
        await setVault(path)
      } catch (error) {
        // If the path doesn't exist, create it
        if (error instanceof Error && error.message.includes('does not exist')) {
          const pathParts = path.split('\\')
          const vaultName = pathParts[pathParts.length - 1]
          const parentPath = pathParts.slice(0, -1).join('\\')
          
          // Set the parent as vault temporarily to create the folder
          await setVault(parentPath)
          await createFolder(vaultName)
          
          // Now set the actual vault path
          await setVault(path)
        } else {
          throw error
        }
      }
      
      const currentVault = await getVault()
      if (currentVault) {
        setVaultPath(currentVault)
        saveSettings({ vaultPath: currentVault })
      }
    } catch (error) {
      console.error('Failed to set vault:', error)
      // TODO: Show error message to user
    } finally {
      setIsLoadingVault(false)
    }
  }

  const handleNoteSelected = (notePath: string) => {
    setCurrentNote(notePath)
    saveSettings({ lastOpenedNote: notePath })
  }

  const handleSidebarResize = (width: number) => {
    setSidebarWidth(width)
    saveSettings({ sidebarWidth: width })
  }

  // Show vault picker if no vault is set
  if (isLoadingVault) {
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
    return <VaultPicker onVaultSelected={handleVaultSelected} />
  }

  // Main app interface
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Toolbar */}
      <Toolbar 
        currentNote={currentNote}
        isPreviewMode={isPreviewMode}
        onPreviewToggle={() => setIsPreviewMode(!isPreviewMode)}
        vaultPath={vaultPath}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div 
          className="border-r border-border bg-card flex-shrink-0"
          style={{ width: sidebarWidth }}
        >
          <Sidebar
            vaultPath={vaultPath}
            currentNote={currentNote}
            onNoteSelected={handleNoteSelected}
            onResize={handleSidebarResize}
          />
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {currentNote ? (
            <Editor
              notePath={currentNote}
              isPreviewMode={isPreviewMode}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-background">
              <div className="text-center space-y-4 max-w-md">
                <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">No note selected</h3>
                  <p className="text-muted-foreground mt-1">
                    Select a note from the sidebar or create a new one to get started
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

