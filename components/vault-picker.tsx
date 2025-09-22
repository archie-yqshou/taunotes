"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FolderOpen, Plus, ArrowRight } from "lucide-react"
import { selectFolder, setVault, createFolder } from "@/lib/tauri-api"

interface VaultPickerProps {
  onVaultSelected: (path: string) => void
}

export function VaultPicker({ onVaultSelected }: VaultPickerProps) {
  const [newVaultName, setNewVaultName] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSelectExisting = async () => {
    try {
      setIsLoading(true)
      console.log("Selecting existing vault...")
      const selectedPath = await selectFolder()
      console.log("Selected path:", selectedPath)
      if (selectedPath) {
        console.log("Setting vault to:", selectedPath)
        await setVault(selectedPath)
        onVaultSelected(selectedPath)
      }
    } catch (error) {
      console.error("Failed to select vault:", error)
      alert(`Failed to select vault: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateNew = async () => {
    if (!newVaultName.trim()) return

    try {
      setIsLoading(true)
      console.log("Creating new vault:", newVaultName)
      const selectedPath = await selectFolder()
      console.log("Parent path selected:", selectedPath)
      if (selectedPath) {
        // First set the parent directory as vault temporarily
        await setVault(selectedPath)
        
        // Create the new folder
        console.log("Creating folder:", newVaultName)
        await createFolder(newVaultName)
        
        // Now set the actual vault path (use Windows path separator)
        const vaultPath = `${selectedPath}\\${newVaultName}`
        console.log("Setting vault to:", vaultPath)
        await setVault(vaultPath)
        onVaultSelected(vaultPath)
      }
    } catch (error) {
      console.error("Failed to create vault:", error)
      alert(`Failed to create vault: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to Tau</h1>
          <p className="text-muted-foreground text-lg">
            Your personal knowledge management system
          </p>
        </div>

        <div className="space-y-6">
          <div className="p-6 border border-border rounded-lg bg-card">
            <h2 className="text-xl font-semibold text-foreground mb-3">Select Existing Vault</h2>
            <p className="text-muted-foreground mb-4">
              Choose a folder that contains your existing notes
            </p>
            <Button 
              onClick={handleSelectExisting} 
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Browse for Folder
            </Button>
          </div>

          <div className="p-6 border border-border rounded-lg bg-card">
            <h2 className="text-xl font-semibold text-foreground mb-3">Create New Vault</h2>
            <p className="text-muted-foreground mb-4">
              Start fresh with a new folder for your notes
            </p>
            <div className="space-y-3">
              <Input
                placeholder="My Notes"
                value={newVaultName}
                onChange={(e) => setNewVaultName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && newVaultName.trim()) {
                    handleCreateNew()
                  }
                }}
              />
              <Button 
                onClick={handleCreateNew} 
                disabled={isLoading || !newVaultName.trim()}
                className="w-full"
                size="lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Vault
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Your vault is where all your notes will be stored locally on your computer
          </p>
        </div>
      </div>
    </div>
  )
}
