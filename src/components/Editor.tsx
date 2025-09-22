import React, { useState, useEffect, useCallback, useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'
import { readNote, writeNote } from '../lib/api'
import { getCurrentTheme } from '../lib/theme'
import { MarkdownPreview } from './MarkdownPreview'
import { cn } from '../lib/utils'

interface EditorProps {
  notePath: string
  isPreviewMode: boolean
}

export function Editor({ notePath, isPreviewMode }: EditorProps) {
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSavedContent, setLastSavedContent] = useState('')

  // Load note content when path changes
  useEffect(() => {
    loadNote()
  }, [notePath])

  // Auto-save functionality
  useEffect(() => {
    if (hasUnsavedChanges && content !== lastSavedContent) {
      const timeoutId = setTimeout(() => {
        saveNote()
      }, 2000) // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timeoutId)
    }
  }, [content, hasUnsavedChanges, lastSavedContent])

  // Handle Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault()
        saveNote()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const loadNote = async () => {
    try {
      setIsLoading(true)
      const noteContent = await readNote(notePath)
      setContent(noteContent)
      setLastSavedContent(noteContent)
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Failed to load note:', error)
      setContent('')
    } finally {
      setIsLoading(false)
    }
  }

  const saveNote = useCallback(async () => {
    if (!hasUnsavedChanges || isSaving) return

    try {
      setIsSaving(true)
      await writeNote(notePath, content)
      setLastSavedContent(content)
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Failed to save note:', error)
    } finally {
      setIsSaving(false)
    }
  }, [notePath, content, hasUnsavedChanges, isSaving])

  const handleContentChange = useCallback((value: string) => {
    setContent(value)
    setHasUnsavedChanges(value !== lastSavedContent)
  }, [lastSavedContent])

  // CodeMirror extensions
  const extensions = useMemo(() => {
    const baseExtensions = [
      markdown(),
      EditorView.theme({
        '&': {
          fontSize: '14px',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
        },
        '.cm-content': {
          padding: '16px',
          lineHeight: '1.6',
        },
        '.cm-focused': {
          outline: 'none',
        },
        '.cm-editor': {
          borderRadius: '0',
        },
        '.cm-scroller': {
          scrollbarWidth: 'thin',
        },
        '.cm-line': {
          padding: '0 2px',
        },
        // Markdown-specific styling
        '.cm-header': {
          fontWeight: 'bold',
        },
        '.cm-header1': {
          fontSize: '1.875em',
          lineHeight: '1.2',
        },
        '.cm-header2': {
          fontSize: '1.5em',
          lineHeight: '1.3',
        },
        '.cm-header3': {
          fontSize: '1.25em',
          lineHeight: '1.4',
        },
        '.cm-header4': {
          fontSize: '1.125em',
          lineHeight: '1.5',
        },
        '.cm-header5': {
          fontSize: '1em',
          lineHeight: '1.5',
        },
        '.cm-header6': {
          fontSize: '0.875em',
          lineHeight: '1.5',
        },
        '.cm-strong': {
          fontWeight: '600',
        },
        '.cm-emphasis': {
          fontStyle: 'italic',
        },
        '.cm-link': {
          color: 'var(--primary)',
          textDecoration: 'underline',
        },
        '.cm-monospace': {
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
          backgroundColor: 'var(--muted)',
          padding: '2px 4px',
          borderRadius: '3px',
          fontSize: '0.875em',
        },
        '.cm-code': {
          backgroundColor: 'var(--muted)',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '0.875em',
        },
        '.cm-quote': {
          borderLeft: '4px solid var(--border)',
          paddingLeft: '12px',
          marginLeft: '4px',
          fontStyle: 'italic',
          color: 'var(--muted-foreground)',
        },
        '.cm-list': {
          paddingLeft: '16px',
        },
        '.cm-hr': {
          border: 'none',
          borderTop: '2px solid var(--border)',
          margin: '16px 0',
        },
        // Math styling
        '.cm-math': {
          color: 'var(--primary)',
          backgroundColor: 'var(--muted)',
          padding: '2px 4px',
          borderRadius: '3px',
        },
      }),
      EditorView.lineWrapping,
    ]

    // Add dark theme if current theme is pure-black
    const currentTheme = getCurrentTheme()
    if (currentTheme === 'pure-black') {
      baseExtensions.push(oneDark)
    }

    return baseExtensions
  }, [])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <div className="w-6 h-6 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading note...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Editor status bar */}
      <div className="px-4 py-2 border-b border-border bg-card flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          <span>{notePath.replace('.md', '')}</span>
          {hasUnsavedChanges && (
            <span className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
              <span>Unsaved changes</span>
            </span>
          )}
          {isSaving && (
            <span className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
              <span>Saving...</span>
            </span>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <span>{content.length} characters</span>
          <span>{content.split('\n').length} lines</span>
          <span>Ctrl+S to save</span>
        </div>
      </div>

      {/* Editor or Preview */}
      <div className="flex-1 overflow-hidden">
        {isPreviewMode ? (
          <MarkdownPreview content={content} />
        ) : (
          <div className="h-full">
            <CodeMirror
              value={content}
              onChange={handleContentChange}
              extensions={extensions}
              className="h-full"
              basicSetup={{
                lineNumbers: false,
                foldGutter: true,
                dropCursor: true,
                allowMultipleSelections: true,
                indentOnInput: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: true,
                highlightSelectionMatches: true,
                searchKeymap: true,
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

