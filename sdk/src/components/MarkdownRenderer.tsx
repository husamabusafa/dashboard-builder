import React, { useMemo } from 'react';
import { renderMarkdownToHtmlSafe } from '../utils/markdown';
import { MermaidDiagram } from './MermaidDiagram';

export interface MarkdownRendererProps {
  content: string;
  theme: 'light' | 'dark';
}

/**
 * Markdown component that handles both regular markdown and mermaid diagrams
 */
export function MarkdownRenderer({ content, theme }: MarkdownRendererProps) {
  const { html, hasMermaid } = useMemo(() => renderMarkdownToHtmlSafe(content, theme), [content, theme]);
  
  if (!hasMermaid) {
    return (
      <div
        style={{
          fontSize: '14px',
          lineHeight: '1.6',
          wordBreak: 'break-word',
          maxWidth: '100%',
          overflow: 'hidden'
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  // Parse HTML and replace mermaid placeholders with components
  const parts = html.split(/(<div class="mermaid-placeholder"[^>]*><\/div>)/g);
  const elements: React.ReactNode[] = [];
  
  parts.forEach((part, index) => {
    if (part.includes('mermaid-placeholder')) {
      // Extract mermaid code from data attribute
      const match = part.match(/data-mermaid="([^"]*)"/); 
      if (match) {
        const mermaidCode = match[1]
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
        
        elements.push(
          React.createElement(MermaidDiagram, {
            key: `mermaid-${index}`,
            chart: mermaidCode,
            theme: theme
          })
        );
      }
    } else if (part.trim()) {
      // Regular HTML content
      elements.push(
        React.createElement('div', {
          key: `html-${index}`,
          style: {
            fontSize: '14px',
            lineHeight: '1.6',
            wordBreak: 'break-word',
            maxWidth: '100%',
            overflow: 'hidden'
          },
          dangerouslySetInnerHTML: { __html: part }
        })
      );
    }
  });

  return React.createElement(React.Fragment, {}, ...elements);
}
