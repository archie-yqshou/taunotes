import React, { useState, useRef, useEffect } from 'react'
import { 
  Eye, 
  EyeOff, 
  Palette, 
  Sun, 
  Moon, 
  Upload,
  Check,
  X,
  ChevronDown
} from 'lucide-react'
import { getAvailableThemes, getCurrentTheme, switchTheme, uploadCustomTheme, type ThemeOption } from '../lib/theme'
import { cn } from '../lib/utils'

interface ToolbarProps {
  currentNote: string | null
  isPreviewMode: boolean
  onPreviewToggle: () => void
  vaultPath: string
}

export function Toolbar({ currentNote, isPreviewMode, onPreviewToggle, vaultPath }: ToolbarProps) {
  const [themes, setThemes] = useState<ThemeOption[]>([])
  const [currentTheme, setCurrentTheme] = useState('')
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const [isUploadingTheme, setIsUploadingTheme] = useState(false)
  
  const themeMenuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setThemes(getAvailableThemes())
    setCurrentTheme(getCurrentTheme())
  }, [])

  // Handle clicks outside theme menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setShowThemeMenu(false)
      }
    }

    if (showThemeMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showThemeMenu])

  const handleThemeChange = (themeId: string) => {
    switchTheme(themeId)
    setCurrentTheme(themeId)
    setShowThemeMenu(false)
  }

  const handleThemeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploadingTheme(true)
    try {
      const result = await uploadCustomTheme(file)
      if (result.success && result.theme) {
        setThemes(getAvailableThemes())
        handleThemeChange(result.theme.id)
      } else {
        alert(result.error || 'Failed to upload theme')
      }
    } catch (error) {
      alert('Failed to upload theme')
    } finally {
      setIsUploadingTheme(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const getCurrentThemeName = () => {
    const theme = themes.find(t => t.id === currentTheme)
    return theme?.name || 'Unknown'
  }

  const getThemeIcon = (themeId: string) => {
    if (themeId === 'pure-black') return <Moon className="w-4 h-4" />
    if (themeId === 'pure-white') return <Sun className="w-4 h-4" />
    return <Palette className="w-4 h-4" />
  }

  // Extract folder name from vault path
  const vaultName = vaultPath.split('\\').pop() || vaultPath.split('/').pop() || 'Vault'

  return (
    <div className="h-12 border-b border-border bg-card flex items-center justify-between px-4">
      {/* Left side - Vault name and current note */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="font-medium text-card-foreground">{vaultName}</span>
        </div>
        
        {currentNote && (
          <>
            <div className="text-muted-foreground">/</div>
            <span className="text-sm text-muted-foreground truncate max-w-xs">
              {currentNote.replace('.md', '')}
            </span>
          </>
        )}
      </div>

      {/* Right side - Controls */}
      <div className="flex items-center space-x-2">
        {/* Preview Toggle */}
        {currentNote && (
          <button
            onClick={onPreviewToggle}
            className={cn(
              "p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent",
              "transition-colors",
              isPreviewMode && "bg-accent text-foreground"
            )}
            title={isPreviewMode ? "Show Editor" : "Show Preview"}
          >
            {isPreviewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}

        {/* Theme Selector */}
        <div className="relative" ref={themeMenuRef}>
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className={cn(
              "flex items-center space-x-2 px-3 py-2 rounded-md text-sm",
              "text-muted-foreground hover:text-foreground hover:bg-accent",
              "transition-colors",
              showThemeMenu && "bg-accent text-foreground"
            )}
          >
            {getThemeIcon(currentTheme)}
            <span className="hidden sm:inline">{getCurrentThemeName()}</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {showThemeMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-md shadow-lg py-1 z-50">
              {/* Built-in themes */}
              {themes.filter(t => t.type === 'built-in').map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeChange(theme.id)}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center justify-between",
                    currentTheme === theme.id && "bg-accent"
                  )}
                >
                  <div className="flex items-center space-x-2">
                    {getThemeIcon(theme.id)}
                    <span>{theme.name}</span>
                  </div>
                  {currentTheme === theme.id && <Check className="w-4 h-4" />}
                </button>
              ))}

              {/* Custom themes */}
              {themes.filter(t => t.type === 'custom').length > 0 && (
                <>
                  <hr className="my-1 border-border" />
                  {themes.filter(t => t.type === 'custom').map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => handleThemeChange(theme.id)}
                      className={cn(
                        "w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center justify-between",
                        currentTheme === theme.id && "bg-accent"
                      )}
                    >
                      <div className="flex items-center space-x-2">
                        <Palette className="w-4 h-4" />
                        <span>{theme.name}</span>
                      </div>
                      {currentTheme === theme.id && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </>
              )}

              {/* Upload theme */}
              <hr className="my-1 border-border" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingTheme}
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center space-x-2 disabled:opacity-50"
              >
                {isUploadingTheme ? (
                  <>
                    <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Upload Theme</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Hidden file input for theme upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".css"
          onChange={handleThemeUpload}
          className="hidden"
        />
      </div>
    </div>
  )
}

