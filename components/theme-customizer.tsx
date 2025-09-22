"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useTheme } from "@/hooks/use-theme"
import { Palette, Download, Upload, RotateCcw, Monitor, Sun, Moon } from "lucide-react"

interface CustomTheme {
  name: string
  colors: {
    background: string
    foreground: string
    primary: string
    secondary: string
    accent: string
    muted: string
    border: string
    sidebar: string
  }
}

const defaultThemes: CustomTheme[] = [
  {
    name: "Obsidian Dark",
    colors: {
      background: "#0d1117",
      foreground: "#f0f6fc",
      primary: "#f0f6fc",
      secondary: "#21262d",
      accent: "#30363d",
      muted: "#6e7681",
      border: "#30363d",
      sidebar: "#161b22",
    },
  },
  {
    name: "Clean Light",
    colors: {
      background: "#ffffff",
      foreground: "#1f2937",
      primary: "#1f2937",
      secondary: "#f9fafb",
      accent: "#f3f4f6",
      muted: "#6b7280",
      border: "#e5e7eb",
      sidebar: "#f9fafb",
    },
  },
  {
    name: "Sepia",
    colors: {
      background: "#fdf6e3",
      foreground: "#5c4b37",
      primary: "#5c4b37",
      secondary: "#f4f0e8",
      accent: "#eee8d5",
      muted: "#93a1a1",
      border: "#e3dcc9",
      sidebar: "#f7f2e9",
    },
  },
]

interface ThemeCustomizerProps {
  isOpen: boolean
  onClose: () => void
}

export function ThemeCustomizer({ isOpen, onClose }: ThemeCustomizerProps) {
  const { theme, setTheme, actualTheme } = useTheme()
  const [customTheme, setCustomTheme] = useState<CustomTheme>(defaultThemes[0])
  const [importText, setImportText] = useState("")

  const applyCustomTheme = (themeData: CustomTheme) => {
    const root = document.documentElement
    Object.entries(themeData.colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value)
    })
  }

  const exportTheme = () => {
    const themeData = {
      name: customTheme.name,
      colors: customTheme.colors,
    }
    const blob = new Blob([JSON.stringify(themeData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${customTheme.name.toLowerCase().replace(/\s+/g, "-")}-theme.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const importTheme = () => {
    try {
      const themeData = JSON.parse(importText)
      if (themeData.name && themeData.colors) {
        setCustomTheme(themeData)
        applyCustomTheme(themeData)
        setImportText("")
      }
    } catch (error) {
      console.error("Invalid theme format")
    }
  }

  const resetToDefault = () => {
    const root = document.documentElement
    // Remove custom properties to fall back to CSS defaults
    Object.keys(customTheme.colors).forEach((key) => {
      root.style.removeProperty(`--${key}`)
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Theme Customizer
              </CardTitle>
              <CardDescription>Customize the appearance of Tau to your liking</CardDescription>
            </div>
            <Button variant="ghost" onClick={onClose}>
              ×
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="presets" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="presets">Presets</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
              <TabsTrigger value="import">Import/Export</TabsTrigger>
            </TabsList>

            <TabsContent value="presets" className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-3 block">Theme Mode</Label>
                <div className="flex gap-2">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("light")}
                  >
                    <Sun className="h-4 w-4 mr-2" />
                    Light
                  </Button>
                  <Button variant={theme === "dark" ? "default" : "outline"} size="sm" onClick={() => setTheme("dark")}>
                    <Moon className="h-4 w-4 mr-2" />
                    Dark
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("system")}
                  >
                    <Monitor className="h-4 w-4 mr-2" />
                    System
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block">Preset Themes</Label>
                <div className="grid gap-3">
                  {defaultThemes.map((preset) => (
                    <Card
                      key={preset.name}
                      className="cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => {
                        setCustomTheme(preset)
                        applyCustomTheme(preset)
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{preset.name}</h4>
                            <div className="flex gap-1 mt-2">
                              {Object.values(preset.colors)
                                .slice(0, 6)
                                .map((color, index) => (
                                  <div
                                    key={index}
                                    className="w-4 h-4 rounded-full border border-border"
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                            </div>
                          </div>
                          <Badge variant="outline">Apply</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="custom" className="space-y-4">
              <div>
                <Label htmlFor="theme-name">Theme Name</Label>
                <Input
                  id="theme-name"
                  value={customTheme.name}
                  onChange={(e) => setCustomTheme({ ...customTheme, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {Object.entries(customTheme.colors).map(([key, value]) => (
                  <div key={key}>
                    <Label htmlFor={key} className="capitalize">
                      {key.replace(/([A-Z])/g, " $1")}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id={key}
                        type="color"
                        value={value}
                        onChange={(e) => {
                          const newColors = { ...customTheme.colors, [key]: e.target.value }
                          const newTheme = { ...customTheme, colors: newColors }
                          setCustomTheme(newTheme)
                          applyCustomTheme(newTheme)
                        }}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={value}
                        onChange={(e) => {
                          const newColors = { ...customTheme.colors, [key]: e.target.value }
                          const newTheme = { ...customTheme, colors: newColors }
                          setCustomTheme(newTheme)
                          applyCustomTheme(newTheme)
                        }}
                        className="flex-1"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button onClick={() => applyCustomTheme(customTheme)} className="flex-1">
                  Apply Theme
                </Button>
                <Button variant="outline" onClick={resetToDefault}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="import" className="space-y-4">
              <div>
                <Label htmlFor="import-theme">Import Theme JSON</Label>
                <Textarea
                  id="import-theme"
                  placeholder="Paste theme JSON here..."
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  rows={6}
                />
                <Button onClick={importTheme} className="mt-2 w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Theme
                </Button>
              </div>

              <div>
                <Label>Export Current Theme</Label>
                <Button onClick={exportTheme} variant="outline" className="mt-2 w-full bg-transparent">
                  <Download className="h-4 w-4 mr-2" />
                  Export as JSON
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
