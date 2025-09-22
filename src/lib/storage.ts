// Storage utilities for persisting app state
export interface AppSettings {
  vaultPath: string | null
  theme: 'pure-white' | 'pure-black' | string
  customThemes: CustomTheme[]
  sidebarWidth: number
  rightPanelWidth: number
  showRightPanel: boolean
  lastOpenedNote: string | null
}

export interface CustomTheme {
  name: string
  id: string
  cssContent: string
  isActive: boolean
}

const STORAGE_KEY = 'tau-app-settings'

const defaultSettings: AppSettings = {
  vaultPath: null,
  theme: 'pure-white',
  customThemes: [],
  sidebarWidth: 280,
  rightPanelWidth: 320,
  showRightPanel: true,
  lastOpenedNote: null,
}

export function getSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return { ...defaultSettings, ...parsed }
    }
  } catch (error) {
    console.warn('Failed to load settings from localStorage:', error)
  }
  return defaultSettings
}

export function saveSettings(settings: Partial<AppSettings>): void {
  try {
    const current = getSettings()
    const updated = { ...current, ...settings }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Failed to save settings to localStorage:', error)
  }
}

export function addCustomTheme(theme: CustomTheme): void {
  const settings = getSettings()
  const existingIndex = settings.customThemes.findIndex(t => t.id === theme.id)
  
  if (existingIndex >= 0) {
    settings.customThemes[existingIndex] = theme
  } else {
    settings.customThemes.push(theme)
  }
  
  saveSettings({ customThemes: settings.customThemes })
}

export function removeCustomTheme(themeId: string): void {
  const settings = getSettings()
  settings.customThemes = settings.customThemes.filter(t => t.id !== themeId)
  
  // If the removed theme was active, switch to pure-white
  if (settings.theme === themeId) {
    settings.theme = 'pure-white'
  }
  
  saveSettings({ 
    customThemes: settings.customThemes,
    theme: settings.theme 
  })
}

export function setActiveTheme(themeId: string): void {
  saveSettings({ theme: themeId })
  applyTheme(themeId)
}

export function applyTheme(themeId: string): void {
  const settings = getSettings()
  const root = document.documentElement
  
  // Remove existing theme attributes
  root.removeAttribute('data-theme')
  
  // Remove existing custom theme styles
  const existingStyle = document.getElementById('custom-theme-style')
  if (existingStyle) {
    existingStyle.remove()
  }
  
  if (themeId === 'pure-black') {
    root.setAttribute('data-theme', 'pure-black')
  } else if (themeId !== 'pure-white') {
    // Custom theme
    const customTheme = settings.customThemes.find(t => t.id === themeId)
    if (customTheme) {
      const style = document.createElement('style')
      style.id = 'custom-theme-style'
      style.textContent = customTheme.cssContent
      document.head.appendChild(style)
    }
  }
  // pure-white is the default, no special handling needed
}

// Initialize theme on app start
export function initializeTheme(): void {
  const settings = getSettings()
  applyTheme(settings.theme)
}

