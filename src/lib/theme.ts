import { getSettings, saveSettings, addCustomTheme, setActiveTheme, type CustomTheme } from './storage'

export type ThemeOption = {
  id: string
  name: string
  type: 'built-in' | 'custom'
}

export function getAvailableThemes(): ThemeOption[] {
  const settings = getSettings()
  
  const builtInThemes: ThemeOption[] = [
    { id: 'pure-white', name: 'Pure White', type: 'built-in' },
    { id: 'pure-black', name: 'Pure Black', type: 'built-in' },
  ]
  
  const customThemes: ThemeOption[] = settings.customThemes.map(theme => ({
    id: theme.id,
    name: theme.name,
    type: 'custom' as const
  }))
  
  return [...builtInThemes, ...customThemes]
}

export function getCurrentTheme(): string {
  return getSettings().theme
}

export function switchTheme(themeId: string): void {
  setActiveTheme(themeId)
}

export async function uploadCustomTheme(file: File): Promise<{ success: boolean; error?: string; theme?: CustomTheme }> {
  try {
    if (!file.name.endsWith('.css')) {
      return { success: false, error: 'Please select a CSS file' }
    }
    
    const content = await file.text()
    
    // Basic validation - ensure it contains CSS variable definitions
    if (!content.includes(':root') && !content.includes('--')) {
      return { success: false, error: 'CSS file must contain CSS custom properties (--variables)' }
    }
    
    const themeId = `custom-${Date.now()}`
    const themeName = file.name.replace('.css', '').replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
    
    const theme: CustomTheme = {
      id: themeId,
      name: themeName,
      cssContent: content,
      isActive: false
    }
    
    addCustomTheme(theme)
    
    return { success: true, theme }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to read file' 
    }
  }
}

export function validateThemeCSS(css: string): { valid: boolean; issues: string[] } {
  const issues: string[] = []
  
  // Check for basic CSS variable structure
  if (!css.includes(':root') && !css.includes('[data-theme')) {
    issues.push('Theme should define variables in :root or [data-theme] selectors')
  }
  
  // Check for common required variables
  const requiredVars = [
    '--background',
    '--foreground',
    '--primary',
    '--secondary'
  ]
  
  const missingVars = requiredVars.filter(varName => !css.includes(varName))
  if (missingVars.length > 0) {
    issues.push(`Missing recommended variables: ${missingVars.join(', ')}`)
  }
  
  // Check for potential issues
  if (css.includes('!important')) {
    issues.push('Avoid using !important as it may break theme compatibility')
  }
  
  return {
    valid: issues.length === 0,
    issues
  }
}

