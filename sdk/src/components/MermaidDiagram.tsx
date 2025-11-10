import React, { useEffect, useRef, useState } from 'react';

export interface MermaidDiagramProps {
  chart: string;
  theme: 'light' | 'dark';
}

/**
 * Simple MermaidDiagram component for SDK use
 */
export function MermaidDiagram({ chart, theme }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const renderMermaid = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Dynamic import to avoid SSR issues - only try if mermaid is available
        let mermaid: any;
        try {
          mermaid = await import('mermaid');
        } catch {
          throw new Error('Mermaid library not available');
        }
        
        if (!mounted) return;
        
        // Configure mermaid
        mermaid.default?.initialize({
          startOnLoad: false,
          theme: theme === 'dark' ? 'dark' : 'default',
          themeVariables: {
            darkMode: theme === 'dark',
            primaryColor: theme === 'dark' ? '#3B82F6' : '#1D4ED8',
            primaryTextColor: theme === 'dark' ? '#F3F4F6' : '#1F2937',
            primaryBorderColor: theme === 'dark' ? '#374151' : '#D1D5DB',
          },
          flowchart: { useMaxWidth: true },
          sequence: { useMaxWidth: true },
          gantt: { useMaxWidth: true },
        });
        
        if (containerRef.current && mounted) {
          const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          const { svg } = await mermaid.default.render(id, chart);
          
          if (containerRef.current && mounted) {
            containerRef.current.innerHTML = svg;
            const svgElement = containerRef.current.querySelector('svg');
            if (svgElement) {
              svgElement.style.maxWidth = '100%';
              svgElement.style.height = 'auto';
              svgElement.style.display = 'block';
            }
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    renderMermaid();
    
    return () => { mounted = false; };
  }, [chart, theme]);
  
  const borderColor = theme === 'dark' ? '#374151' : '#D1D5DB';
  const bgColor = theme === 'dark' ? '#1F2937' : '#F9FAFB';
  const errorBg = theme === 'dark' ? '#7F1D1D' : '#FEF2F2';
  const errorText = theme === 'dark' ? '#FCA5A5' : '#DC2626';
  const loadingText = theme === 'dark' ? '#9CA3AF' : '#6B7280';
  
  if (error) {
    return (
      <div style={{
        borderRadius: '12px',
        border: `1px solid ${borderColor}`,
        backgroundColor: errorBg,
        padding: '16px',
        margin: '8px 0'
      }}>
        <div style={{
          fontSize: '14px',
          color: errorText,
          marginBottom: '8px',
          fontWeight: '500'
        }}>
          Failed to render diagram
        </div>
        <div style={{
          fontSize: '12px',
          color: errorText,
          opacity: 0.8
        }}>
          {error}
        </div>
      </div>
    );
  }
  
  return (
    <div style={{
      borderRadius: '12px',
      border: `1px solid ${borderColor}`,
      backgroundColor: bgColor,
      padding: '16px',
      margin: '8px 0',
      overflow: 'hidden'
    }}>
      {loading && (
        <div style={{
          fontSize: '14px',
          color: loadingText,
          textAlign: 'center',
          padding: '32px'
        }}>
          Rendering diagram...
        </div>
      )}
      <div 
        ref={containerRef}
        style={{
          display: loading ? 'none' : 'block',
          textAlign: 'center',
          minHeight: loading ? '0' : '50px'
        }}
      />
    </div>
  );
}
