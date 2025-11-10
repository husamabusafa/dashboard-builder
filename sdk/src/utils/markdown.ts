/**
 * Markdown rendering utilities for the HsafaChat component
 */

/**
 * Escape HTML characters
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Apply inline formatting (links, bold, italic, code)
 */
export function inlineFormat(s: string): string {
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="text-decoration: underline; color: inherit; opacity: 0.8;">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  s = s.replace(/`([^`]+)`/g, '<code style="padding: 2px 4px; border-radius: 4px; background-color: rgba(0,0,0,0.1); font-family: monospace;">$1</code>');
  return s;
}

/**
 * Render markdown to HTML with mermaid detection
 */
export function renderMarkdownToHtmlSafe(input: string, theme: 'light' | 'dark' = 'dark'): { html: string; hasMermaid: boolean } {
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

  const closeLists = () => {
    if (inUl) { html += '</ul>'; inUl = false; }
    if (inOl) { html += '</ol>'; inOl = false; }
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
