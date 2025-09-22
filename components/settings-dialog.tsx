"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, Palette, FileText, Globe, Monitor, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vaultPath: string
}

export function SettingsDialog({ open, onOpenChange, vaultPath }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme()
  const [editorSettings, setEditorSettings] = useState({
    fontSize: 14,
    fontFamily: "Inter",
    lineHeight: 1.6,
    wordWrap: true,
    showLineNumbers: false,
    autoSave: true,
    autoSaveDelay: 2000
  })
  
  const [uiSettings, setUISettings] = useState({
    sidebarWidth: 300,
    showStatusBar: true,
    compactMode: false,
    animationSpeed: "normal" as "slow" | "normal" | "fast",
    zoom: 100
  })

  const [vaultSettings, setVaultSettings] = useState({
    defaultNoteName: "Untitled",
    fileExtension: ".md",
    sortBy: "modified" as "name" | "modified" | "created",
    sortOrder: "desc" as "asc" | "desc",
    showHiddenFiles: false
  })

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedEditorSettings = localStorage.getItem('tau-editor-settings')
    const savedUISettings = localStorage.getItem('tau-ui-settings')
    const savedVaultSettings = localStorage.getItem('tau-vault-settings')

    if (savedEditorSettings) {
      setEditorSettings(JSON.parse(savedEditorSettings))
    }
    if (savedUISettings) {
      setUISettings(JSON.parse(savedUISettings))
    }
    if (savedVaultSettings) {
      setVaultSettings(JSON.parse(savedVaultSettings))
    }
  }, [])

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('tau-editor-settings', JSON.stringify(editorSettings))
  }, [editorSettings])

  useEffect(() => {
    localStorage.setItem('tau-ui-settings', JSON.stringify(uiSettings))
  }, [uiSettings])

  useEffect(() => {
    localStorage.setItem('tau-vault-settings', JSON.stringify(vaultSettings))
  }, [vaultSettings])

  const resetToDefaults = () => {
    setEditorSettings({
      fontSize: 14,
      fontFamily: "Inter",
      lineHeight: 1.6,
      wordWrap: true,
      showLineNumbers: false,
      autoSave: true,
      autoSaveDelay: 2000
    })
    
    setUISettings({
      sidebarWidth: 300,
      showStatusBar: true,
      compactMode: false,
      animationSpeed: "normal",
      zoom: 100
    })

    setVaultSettings({
      defaultNoteName: "Untitled",
      fileExtension: ".md",
      sortBy: "modified",
      sortOrder: "desc",
      showHiddenFiles: false
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="appearance" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="editor" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Editor
            </TabsTrigger>
            <TabsTrigger value="vault" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Vault
            </TabsTrigger>
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              General
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto mt-4">
            <TabsContent value="appearance" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Theme</h3>
                <div className="grid grid-cols-3 gap-4">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    onClick={() => setTheme("light")}
                    className="flex flex-col items-center gap-2 h-20"
                  >
                    <Sun className="h-6 w-6" />
                    Light
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    onClick={() => setTheme("dark")}
                    className="flex flex-col items-center gap-2 h-20"
                  >
                    <Moon className="h-6 w-6" />
                    Dark
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    onClick={() => setTheme("system")}
                    className="flex flex-col items-center gap-2 h-20"
                  >
                    <Monitor className="h-6 w-6" />
                    System
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">UI Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zoom">Zoom Level: {uiSettings.zoom}%</Label>
                    <Input
                      id="zoom"
                      type="range"
                      min="75"
                      max="150"
                      step="5"
                      value={uiSettings.zoom}
                      onChange={(e) => setUISettings(prev => ({ ...prev, zoom: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="animation-speed">Animation Speed</Label>
                    <Select
                      value={uiSettings.animationSpeed}
                      onValueChange={(value: "slow" | "normal" | "fast") =>
                        setUISettings(prev => ({ ...prev, animationSpeed: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="slow">Slow</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="fast">Fast</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="compact-mode">Compact Mode</Label>
                  <Switch
                    id="compact-mode"
                    checked={uiSettings.compactMode}
                    onCheckedChange={(checked) => setUISettings(prev => ({ ...prev, compactMode: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="status-bar">Show Status Bar</Label>
                  <Switch
                    id="status-bar"
                    checked={uiSettings.showStatusBar}
                    onCheckedChange={(checked) => setUISettings(prev => ({ ...prev, showStatusBar: checked }))}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="editor" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Font & Typography</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="font-family">Font Family</Label>
                    <Select
                      value={editorSettings.fontFamily}
                      onValueChange={(value) => setEditorSettings(prev => ({ ...prev, fontFamily: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter">Inter</SelectItem>
                        <SelectItem value="Source Code Pro">Source Code Pro</SelectItem>
                        <SelectItem value="JetBrains Mono">JetBrains Mono</SelectItem>
                        <SelectItem value="Fira Code">Fira Code</SelectItem>
                        <SelectItem value="Georgia">Georgia</SelectItem>
                        <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="font-size">Font Size: {editorSettings.fontSize}px</Label>
                    <Input
                      id="font-size"
                      type="range"
                      min="10"
                      max="24"
                      value={editorSettings.fontSize}
                      onChange={(e) => setEditorSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="line-height">Line Height: {editorSettings.lineHeight}</Label>
                  <Input
                    id="line-height"
                    type="range"
                    min="1.2"
                    max="2.4"
                    step="0.1"
                    value={editorSettings.lineHeight}
                    onChange={(e) => setEditorSettings(prev => ({ ...prev, lineHeight: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Editing</h3>
                <div className="flex items-center justify-between">
                  <Label htmlFor="word-wrap">Word Wrap</Label>
                  <Switch
                    id="word-wrap"
                    checked={editorSettings.wordWrap}
                    onCheckedChange={(checked) => setEditorSettings(prev => ({ ...prev, wordWrap: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="line-numbers">Show Line Numbers</Label>
                  <Switch
                    id="line-numbers"
                    checked={editorSettings.showLineNumbers}
                    onCheckedChange={(checked) => setEditorSettings(prev => ({ ...prev, showLineNumbers: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-save">Auto Save</Label>
                  <Switch
                    id="auto-save"
                    checked={editorSettings.autoSave}
                    onCheckedChange={(checked) => setEditorSettings(prev => ({ ...prev, autoSave: checked }))}
                  />
                </div>
                
                {editorSettings.autoSave && (
                  <div className="space-y-2">
                    <Label htmlFor="auto-save-delay">Auto Save Delay: {editorSettings.autoSaveDelay}ms</Label>
                    <Input
                      id="auto-save-delay"
                      type="range"
                      min="500"
                      max="5000"
                      step="500"
                      value={editorSettings.autoSaveDelay}
                      onChange={(e) => setEditorSettings(prev => ({ ...prev, autoSaveDelay: parseInt(e.target.value) }))}
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="vault" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Current Vault</h3>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Vault Location:</p>
                  <p className="font-mono text-sm break-all">{vaultPath}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">File Management</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="default-note-name">Default Note Name</Label>
                    <Input
                      id="default-note-name"
                      value={vaultSettings.defaultNoteName}
                      onChange={(e) => setVaultSettings(prev => ({ ...prev, defaultNoteName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="file-extension">File Extension</Label>
                    <Select
                      value={vaultSettings.fileExtension}
                      onValueChange={(value) => setVaultSettings(prev => ({ ...prev, fileExtension: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=".md">.md (Markdown)</SelectItem>
                        <SelectItem value=".txt">.txt (Plain Text)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sort-by">Sort Files By</Label>
                    <Select
                      value={vaultSettings.sortBy}
                      onValueChange={(value: "name" | "modified" | "created") =>
                        setVaultSettings(prev => ({ ...prev, sortBy: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="modified">Last Modified</SelectItem>
                        <SelectItem value="created">Date Created</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sort-order">Sort Order</Label>
                    <Select
                      value={vaultSettings.sortOrder}
                      onValueChange={(value: "asc" | "desc") =>
                        setVaultSettings(prev => ({ ...prev, sortOrder: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">Ascending</SelectItem>
                        <SelectItem value="desc">Descending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-hidden">Show Hidden Files</Label>
                  <Switch
                    id="show-hidden"
                    checked={vaultSettings.showHiddenFiles}
                    onCheckedChange={(checked) => setVaultSettings(prev => ({ ...prev, showHiddenFiles: checked }))}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="general" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Application</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">About Tau</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Tau is a modern, Obsidian-inspired note-taking application built with Tauri and React.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Version: 1.0.0
                    </p>
                  </div>
                  
                  <Button variant="outline" onClick={resetToDefaults} className="w-full">
                    Reset All Settings to Default
                  </Button>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
