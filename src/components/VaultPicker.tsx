import React, { useState } from 'react'
import { FolderOpen, Plus, HardDrive } from 'lucide-react'
import { selectFolder } from '../lib/api'
import { cn } from '../lib/utils'

interface VaultPickerProps {
  onVaultSelected: (path: string) => void
}

export function VaultPicker({ onVaultSelected }: VaultPickerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [newVaultName, setNewVaultName] = useState('')
  const [showNewVaultInput, setShowNewVaultInput] = useState(false)

  const handleSelectExisting = async () => {
    setIsLoading(true)
    try {
      const selectedPath = await selectFolder()
      if (selectedPath) {
        onVaultSelected(selectedPath)
      }
    } catch (error) {
      console.error('Failed to select folder:', error)
      alert(`Failed to select folder: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateNew = async () => {
    if (!newVaultName.trim()) {
      alert('Please enter a vault name')
      return
    }
    
    setIsLoading(true)
    try {
      // Show user what's happening
      const vaultName = newVaultName.trim()
      const confirmCreate = confirm(`This will:\n1. Ask you to choose a parent folder\n2. Create a new folder called "${vaultName}"\n3. Set it up as your vault\n\nContinue?`)
      
      if (!confirmCreate) {
        setIsLoading(false)
        return
      }
      
      // Ask user to select where to create the vault
      const parentPath = await selectFolder()
      if (parentPath) {
        // Create the full vault path
        const vaultPath = `${parentPath}\\${vaultName}`
        onVaultSelected(vaultPath)
      }
    } catch (error) {
      console.error('Failed to create vault:', error)
      alert(`Failed to create vault: ${error}`)
    } finally {
      setIsLoading(false)
      setShowNewVaultInput(false)
      setNewVaultName('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateNew()
    } else if (e.key === 'Escape') {
      setShowNewVaultInput(false)
      setNewVaultName('')
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary rounded-lg flex items-center justify-center">
            <HardDrive className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Welcome to Tau</h1>
            <p className="text-muted-foreground mt-2">
              Choose a vault to get started with your notes
            </p>
          </div>
        </div>

        {/* Vault Selection Options */}
        <div className="space-y-4">
          {/* Select Existing Folder */}
          <button
            onClick={handleSelectExisting}
            disabled={isLoading}
            className={cn(
              "w-full p-6 rounded-lg border-2 border-border bg-card text-left",
              "hover:border-primary hover:bg-accent transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "group"
            )}
          >
            <div className="flex items-start space-x-4">
              <div className="p-2 rounded-md bg-muted group-hover:bg-muted/80">
                <FolderOpen className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-card-foreground">Select Existing Folder</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose an existing folder to use as your vault. You can pick an empty folder or one with existing markdown files.
                </p>
              </div>
            </div>
          </button>

          {/* Create New Vault */}
          {!showNewVaultInput ? (
            <button
              onClick={() => setShowNewVaultInput(true)}
              disabled={isLoading}
              className={cn(
                "w-full p-6 rounded-lg border-2 border-border bg-card text-left",
                "hover:border-primary hover:bg-accent transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "group"
              )}
            >
              <div className="flex items-start space-x-4">
                <div className="p-2 rounded-md bg-muted group-hover:bg-muted/80">
                  <Plus className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-card-foreground">Create New Vault</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Name your new vault, then choose where to create the folder
                  </p>
                </div>
              </div>
            </button>
          ) : (
            <div className="p-6 rounded-lg border-2 border-primary bg-card">
              <div className="flex items-start space-x-4">
                <div className="p-2 rounded-md bg-muted">
                  <Plus className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="font-semibold text-card-foreground">Create New Vault</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Enter a name for your new vault folder (e.g., "My Notes", "Work Vault")
                    </p>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newVaultName}
                      onChange={(e) => setNewVaultName(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="My Notes"
                      className={cn(
                        "w-full px-3 py-2 border border-input bg-background",
                        "rounded-md text-sm text-foreground",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                        "placeholder:text-muted-foreground"
                      )}
                      autoFocus
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={handleCreateNew}
                        disabled={!newVaultName.trim() || isLoading}
                        className={cn(
                          "px-4 py-2 bg-primary text-primary-foreground",
                          "rounded-md text-sm font-medium",
                          "hover:bg-primary/90 transition-colors",
                          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        Create
                      </button>
                      <button
                        onClick={() => {
                          setShowNewVaultInput(false)
                          setNewVaultName('')
                        }}
                        disabled={isLoading}
                        className={cn(
                          "px-4 py-2 border border-border bg-background",
                          "rounded-md text-sm font-medium text-foreground",
                          "hover:bg-accent transition-colors",
                          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            You can change your vault location later in the settings
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-muted-foreground">
              <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
              <span>Setting up your vault...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
