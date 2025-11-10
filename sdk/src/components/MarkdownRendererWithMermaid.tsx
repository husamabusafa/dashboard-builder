import React, { useMemo } from 'react';
import { MermaidDiagram } from './MermaidDiagram';
import { escapeHtml } from '../utils/markdown';

function inlineFormat(s: string) {
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="text-decoration: underline; color: inherit; opacity: 0.8;">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  s = s.replace(/`([^`]+)`/g, '<code style="padding: 2px 4px; border-radius: 4px; background-color: rgba(0,0,0,0.1); font-family: monospace;">$1</code>');
  return s;
}

function renderMarkdownToHtmlSafe(input: string, theme: 'light' | 'dark' = 'dark'): { html: string; hasMermaid: boolean } {
  const lines = (input || '').replace(/\r\n/g, '\n').split('\n');
  let html = '';
  let inCode = false;
  let codeLang = '';
  let codeBuffer: string[] = [];
  let inUl = false;
  let inOl = false;
  let hasMermaid = false;

  const borderColor = theme === 'dark' ? '#374151' : '#D1D5DB';
  const bgColor = theme === 'dark' ? '#1F2937' : '#F9FAFB';
  const codeBlockBg = theme === 'dark' ? '#111827' : '#F3F4F6';
  const codeTextColor = theme === 'dark' ? '#E5E7EB' : '#374151';
  const tableHeaderBg = theme === 'dark' ? '#374151' : '#F3F4F6';
  const tableHeaderTextColor = theme === 'dark' ? '#F9FAFB' : '#111827';

  const closeLists = () => {
    if (inUl) { html += '</ul>'; inUl = false; }
    if (inOl) { html += '</ol>'; inOl = false; }
  };

  // Helpers for table parsing
  const nextNonEmptyIndex = (start: number) => {
    for (let k = start; k < lines.length; k++) {
      if (lines[k].trim().length > 0) return k;
    }
    return -1;
  };

  const splitTableCells = (rawLine: string) => {
    const trimmed = rawLine.trim();
    const line = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed;
    const sanitized = line.endsWith('|') ? line.slice(0, -1) : line;
    return sanitized.split('|').map(c => c.trim());
  };

  const isTableHeaderRow = (rawLine: string) => {
    const t = rawLine.trim();
    if (!t.startsWith('|')) return false;
    const cells = splitTableCells(t);
    return cells.length >= 2 && cells.some(c => c.length > 0);
  };

  const isSeparatorRow = (rawLine: string) => {
    const cells = splitTableCells(rawLine);
    if (cells.length === 0) return false;
    return cells.every(c => /^:?-{3,}:?$/.test(c));
  };

  const alignmentFromSep = (cell: string): 'left' | 'center' | 'right' => {
    const hasLeft = cell.startsWith(':');
    const hasRight = cell.endsWith(':');
    if (hasLeft && hasRight) return 'center';
    if (!hasLeft && hasRight) return 'right';
    return 'left';
  };

  const parseTableBlock = (startIndex: number): { tableHtml: string; endIndex: number } => {
    const headerIdx = startIndex;
    const sepIdx = nextNonEmptyIndex(headerIdx + 1);
    if (sepIdx === -1) {
      return { tableHtml: '', endIndex: startIndex };
    }
    const headerCells = splitTableCells(lines[headerIdx]);
    const sepCells = splitTableCells(lines[sepIdx]);
    const colCount = Math.max(headerCells.length, sepCells.length);
    const aligns: Array<'left' | 'center' | 'right'> = [];
    for (let i = 0; i < colCount; i++) {
      const cell = sepCells[i] || '---';
      aligns.push(alignmentFromSep(cell));
    }

    const rows: string[][] = [];
    let k = sepIdx + 1;
    while (k < lines.length) {
      const t = lines[k].trim();
      if (t.length === 0) { k++; continue; }
      if (!t.startsWith('|')) break;
      const cells = splitTableCells(lines[k]);
      const normalized: string[] = [];
      for (let i = 0; i < colCount; i++) {
        normalized.push(cells[i] ?? '');
      }
      rows.push(normalized);
      k++;
    }

    // Build table HTML
    let tableHtml = `<div style="overflow: auto; max-width: 100%; max-height: 60vh;  border-radius: 10px; margin: 8px 0;"> 
<table style="width: 100%; min-width: max-content; border-collapse: separate; border-spacing: 0; margin: 0;">`;
    // Header
    tableHtml += '<thead><tr>';
    for (let i = 0; i < colCount; i++) {
      const content = inlineFormat(escapeHtml(headerCells[i] ?? ''));
      const textAlign = aligns[i];
      const isFirst = i === 0;
      const isLast = i === colCount - 1;
      const radiusStyles = `${isFirst ? 'border-top-left-radius: 10px;' : ''}${isLast ? 'border-top-right-radius: 10px;' : ''}`;
      tableHtml += `<th style="text-align: ${textAlign}; padding: 10px 12px; border-bottom: 1px solid ${borderColor}; background-color: ${tableHeaderBg}; color: ${tableHeaderTextColor}; position: sticky; top: 0; z-index: 1; ${radiusStyles}">${content}</th>`;
    }
    tableHtml += '</tr></thead>';
    // Body
    tableHtml += '<tbody>';
    for (const row of rows) {
      tableHtml += '<tr>';
      for (let i = 0; i < colCount; i++) {
        const content = inlineFormat(escapeHtml(row[i] ?? ''));
        const textAlign = aligns[i];
        const isFirst = i === 0;
        const isLast = i === colCount - 1;
        tableHtml += `<td style="text-align: ${textAlign}; padding: 10px 12px; border-bottom: 1px solid ${borderColor}; ${isFirst ? `border-left: 1px solid ${borderColor};` : ''} border-right: 1px solid ${borderColor};">${content}</td>`;
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table></div>';

    return { tableHtml, endIndex: k - 1 };
  };

  for (let i = 0; i < lines.length; i++) {
    let raw = lines[i];
    const fenceMatch = raw.match(/^```\s*(\w+)?\s*$/);
    
    if (fenceMatch) {
      if (!inCode) {
        closeLists();
        inCode = true;
        codeLang = fenceMatch[1] ? String(fenceMatch[1]) : '';
        codeBuffer = [];
      } else {
        // Check if this is a mermaid diagram
        if (codeLang === 'mermaid') {
          hasMermaid = true;
          const mermaidCode = codeBuffer.join('\n');
          html += `<div class="mermaid-placeholder" data-mermaid="${escapeHtml(mermaidCode)}"></div>`;
        } else {
          const codeHtml = escapeHtml(codeBuffer.join('\n'));
          const cls = codeLang ? `language-${codeLang}` : '';
          html += `<pre style="border-radius: 8px; padding: 12px; background-color: ${codeBlockBg}; color: ${codeTextColor}; border: 1px solid ${borderColor}; overflow-x: auto; white-space: pre-wrap; word-break: break-all;"><code class="${cls}">${codeHtml}</code></pre>`;
        }
        inCode = false;
        codeLang = '';
        codeBuffer = [];
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(raw);
      continue;
    }

    // Horizontal rules
    if (/^\s*(---|\*\*\*|___)\s*$/.test(raw)) {
      closeLists();
      html += '<hr style="margin: 12px 0; opacity: 0.6; border: none; border-top: 1px solid currentColor;" />';
      continue;
    }

    // Headers
    const h = raw.match(/^(#{1,6})\s+(.+)$/);
    if (h) {
      closeLists();
      const level = h[1].length;
      const content = inlineFormat(escapeHtml(h[2].trim()));
      const size = level <= 2 ? '18px' : level === 3 ? '16px' : '14px';
      html += `<h${level} style="font-size: ${size}; font-weight: 600; margin: 8px 0 4px 0;">${content}</h${level}>`;
      continue;
    }

    // Tables (GitHub-style)
    if (isTableHeaderRow(raw)) {
      const sepIdx = nextNonEmptyIndex(i + 1);
      if (sepIdx !== -1 && isSeparatorRow(lines[sepIdx])) {
        closeLists();
        const { tableHtml, endIndex } = parseTableBlock(i);
        if (tableHtml) {
          html += tableHtml;
          i = endIndex;
          continue;
        }
      }
    }

    // Lists
    const ulItem = raw.match(/^\s*[-*]\s+(.+)$/);
    const olItem = raw.match(/^\s*\d+\.\s+(.+)$/);
    if (ulItem) {
      if (!inUl) { closeLists(); html += '<ul style="list-style-type: disc; padding-left: 24px; margin: 4px 0;">'; inUl = true; }
      const content = inlineFormat(escapeHtml(ulItem[1]));
      html += `<li style="margin: 2px 0;">${content}</li>`;
      continue;
    }
    if (olItem) {
      if (!inOl) { closeLists(); html += '<ol style="list-style-type: decimal; padding-left: 24px; margin: 4px 0;">'; inOl = true; }
      const content = inlineFormat(escapeHtml(olItem[1]));
      html += `<li style="margin: 2px 0;">${content}</li>`;
      continue;
    }

    // Empty lines
    if (raw.trim().length === 0) {
      closeLists();
      html += '<div style="height: 8px;"></div>';
    } else {
      closeLists();
      const content = inlineFormat(escapeHtml(raw));
      html += `<p style="line-height: 1.6; margin: 4px 0; word-break: break-word;">${content}</p>`;
    }
  }

  // Handle unclosed code blocks
  if (inCode) {
    if (codeLang === 'mermaid') {
      hasMermaid = true;
      const mermaidCode = codeBuffer.join('\n');
      html += `<div class="mermaid-placeholder" data-mermaid="${escapeHtml(mermaidCode)}"></div>`;
    } else {
      const codeHtml = escapeHtml(codeBuffer.join('\n'));
      const cls = codeLang ? `language-${codeLang}` : '';
      html += `<pre style="border-radius: 8px; padding: 12px; background-color: ${codeBlockBg}; color: ${codeTextColor}; border: 1px solid ${borderColor}; overflow-x: auto; white-space: pre-wrap; word-break: break-all;"><code class="${cls}">${codeHtml}</code></pre>`;
    }
  }
  if (inUl) html += '</ul>';
  if (inOl) html += '</ol>';
  
  return { html, hasMermaid };
}

// Markdown component that handles both regular markdown and mermaid diagrams
export function MarkdownRendererWithMermaid({ content, theme }: { content: string; theme: 'light' | 'dark' }) {
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
