import React, { useMemo } from 'react'
import 'katex/dist/katex.min.css'

interface MarkdownPreviewProps {
  content: string
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const renderedElements = useMemo(() => {
    return renderMarkdownToReact(content)
  }, [content])

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div 
          className="markdown-content"
          style={{
            color: 'var(--foreground)',
            lineHeight: '1.7',
          }}
        >
          {renderedElements}
        </div>
      </div>
    </div>
  )
}

function renderMarkdownToReact(content: string): React.ReactNode[] {
  // For now, let's use a simple HTML-based approach with dangerouslySetInnerHTML
  // This is a simplified markdown renderer - in a production app you'd want to use a proper library
  
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let currentParagraph: string[] = []
  let key = 0

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const paragraphContent = currentParagraph.join('\n')
      if (paragraphContent.trim()) {
        elements.push(
          <p key={`p-${key++}`} className="mb-4">
            {renderInlineElements(paragraphContent)}
          </p>
        )
      }
      currentParagraph = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()

    // Empty line - might end a paragraph
    if (!trimmedLine) {
      flushParagraph()
      continue
    }

    // Headers
    if (trimmedLine.startsWith('#')) {
      flushParagraph()
      const level = trimmedLine.match(/^#+/)?.[0].length || 1
      const text = trimmedLine.replace(/^#+\s*/, '')
      const HeaderTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements
      elements.push(
        <HeaderTag key={`h-${key++}`} className={`font-bold mb-4 ${getHeaderClasses(level)}`}>
          {renderInlineElements(text)}
        </HeaderTag>
      )
      continue
    }

    // Code blocks
    if (trimmedLine.startsWith('```')) {
      flushParagraph()
      const language = trimmedLine.slice(3).trim()
      const codeLines: string[] = []
      i++ // Skip the opening ```
      
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      
      elements.push(
        <pre key={`pre-${key++}`} className="bg-muted p-4 rounded-md mb-4 overflow-x-auto">
          <code className={language ? `language-${language}` : ''}>{codeLines.join('\n')}</code>
        </pre>
      )
      continue
    }

    // Blockquotes
    if (trimmedLine.startsWith('>')) {
      flushParagraph()
      const quoteText = trimmedLine.slice(1).trim()
      elements.push(
        <blockquote key={`quote-${key++}`} className="border-l-4 border-border pl-4 italic text-muted-foreground mb-4">
          {renderInlineElements(quoteText)}
        </blockquote>
      )
      continue
    }

    // Horizontal rules
    if (trimmedLine === '---' || trimmedLine === '***' || trimmedLine === '___') {
      flushParagraph()
      elements.push(<hr key={`hr-${key++}`} className="border-border my-8" />)
      continue
    }

    // Lists
    if (trimmedLine.match(/^[-*+]\s/) || trimmedLine.match(/^\d+\.\s/)) {
      flushParagraph()
      const listItems: React.ReactNode[] = []
      const isOrdered = trimmedLine.match(/^\d+\.\s/)
      
      while (i < lines.length) {
        const currentLine = lines[i].trim()
        if (!currentLine) {
          i++
          continue
        }
        
        const listMatch = isOrdered 
          ? currentLine.match(/^\d+\.\s(.*)/) 
          : currentLine.match(/^[-*+]\s(.*)/)
        
        if (!listMatch) {
          i-- // Go back one line
          break
        }
        
        const itemText = listMatch[1]
        
        // Check for task list items
        const taskMatch = itemText.match(/^\[([ x])\]\s(.*)/)
        if (taskMatch) {
          const isChecked = taskMatch[1] === 'x'
          const taskText = taskMatch[2]
          listItems.push(
            <li key={`li-${key++}`} className="flex items-start space-x-2 mb-1">
              <input 
                type="checkbox" 
                checked={isChecked} 
                disabled 
                className="mt-1 flex-shrink-0"
              />
              <span>{renderInlineElements(taskText)}</span>
            </li>
          )
        } else {
          listItems.push(
            <li key={`li-${key++}`} className="mb-1">
              {renderInlineElements(itemText)}
            </li>
          )
        }
        
        i++
      }
      
      const ListTag = isOrdered ? 'ol' : 'ul'
      elements.push(
        <ListTag key={`list-${key++}`} className={`mb-4 ml-6 ${isOrdered ? 'list-decimal' : 'list-disc'}`}>
          {listItems}
        </ListTag>
      )
      continue
    }

    // Regular paragraph line
    currentParagraph.push(line)
  }

  // Flush any remaining paragraph
  flushParagraph()

  return elements
}

function renderInlineElements(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining) {
    // Math expressions (block and inline)
    const blockMathMatch = remaining.match(/^\$\$([\s\S]*?)\$\$/)
    if (blockMathMatch) {
      const formula = blockMathMatch[1].trim()
      elements.push(
        <div key={`math-block-${key++}`} className="my-4 text-center">
          <span className="inline-block p-2 bg-muted rounded">
            {formula} {/* Simplified - in production use KaTeX */}
          </span>
        </div>
      )
      remaining = remaining.slice(blockMathMatch[0].length)
      continue
    }

    const inlineMathMatch = remaining.match(/^\$([^$\n]+?)\$/)
    if (inlineMathMatch) {
      const formula = inlineMathMatch[1].trim()
      elements.push(
        <span key={`math-inline-${key++}`} className="px-1 bg-muted rounded text-sm">
          {formula} {/* Simplified - in production use KaTeX */}
        </span>
      )
      remaining = remaining.slice(inlineMathMatch[0].length)
      continue
    }

    // Bold/Italic
    const boldItalicMatch = remaining.match(/^\*\*\*(.*?)\*\*\*/)
    if (boldItalicMatch) {
      elements.push(
        <strong key={`bold-italic-${key++}`}>
          <em>{boldItalicMatch[1]}</em>
        </strong>
      )
      remaining = remaining.slice(boldItalicMatch[0].length)
      continue
    }

    const boldMatch = remaining.match(/^\*\*(.*?)\*\*/)
    if (boldMatch) {
      elements.push(<strong key={`bold-${key++}`}>{boldMatch[1]}</strong>)
      remaining = remaining.slice(boldMatch[0].length)
      continue
    }

    const italicMatch = remaining.match(/^\*(.*?)\*/)
    if (italicMatch) {
      elements.push(<em key={`italic-${key++}`}>{italicMatch[1]}</em>)
      remaining = remaining.slice(italicMatch[0].length)
      continue
    }

    // Inline code
    const codeMatch = remaining.match(/^`([^`\n]+)`/)
    if (codeMatch) {
      elements.push(
        <code key={`code-${key++}`} className="px-1 py-0.5 bg-muted rounded text-sm font-mono">
          {codeMatch[1]}
        </code>
      )
      remaining = remaining.slice(codeMatch[0].length)
      continue
    }

    // Links
    const linkMatch = remaining.match(/^\[([^\]]*)\]\(([^)]*)\)/)
    if (linkMatch) {
      elements.push(
        <a 
          key={`link-${key++}`} 
          href={linkMatch[2]} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-primary underline hover:text-primary/80"
        >
          {linkMatch[1]}
        </a>
      )
      remaining = remaining.slice(linkMatch[0].length)
      continue
    }

    // Wikilinks
    const wikilinkMatch = remaining.match(/^\[\[([^\]]+)\]\]/)
    if (wikilinkMatch) {
      const [noteName, heading] = wikilinkMatch[1].split('#')
      const displayText = heading ? `${noteName}#${heading}` : noteName
      elements.push(
        <a 
          key={`wikilink-${key++}`} 
          href="#" 
          className="text-primary underline hover:text-primary/80"
          onClick={(e) => {
            e.preventDefault()
            // TODO: Handle wikilink navigation
            console.log('Navigate to:', noteName, heading)
          }}
        >
          {displayText}
        </a>
      )
      remaining = remaining.slice(wikilinkMatch[0].length)
      continue
    }

    // Regular text
    const nextSpecialMatch = remaining.match(/[\*`$\[]/)
    if (nextSpecialMatch) {
      const textBefore = remaining.slice(0, nextSpecialMatch.index)
      if (textBefore) {
        elements.push(textBefore)
      }
      remaining = remaining.slice(nextSpecialMatch.index!)
    } else {
      elements.push(remaining)
      break
    }
  }

  return elements
}

function getHeaderClasses(level: number): string {
  switch (level) {
    case 1: return 'text-3xl mt-8'
    case 2: return 'text-2xl mt-6'
    case 3: return 'text-xl mt-4'
    case 4: return 'text-lg mt-4'
    case 5: return 'text-base mt-3'
    case 6: return 'text-sm mt-3'
    default: return 'text-base mt-3'
  }
}
