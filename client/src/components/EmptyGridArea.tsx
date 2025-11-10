import React from 'react';
import { Icon } from '@iconify/react';

interface EmptyGridAreaProps {
  gridArea: string;
}

export const EmptyGridArea: React.FC<EmptyGridAreaProps> = ({ gridArea }) => {
  return (
    <div
      style={{
        gridArea: gridArea,
        position: 'relative',
        background: 'linear-gradient(135deg, #1a1b1e 0%, #17181c 100%)',
        border: '2px dashed #2A2C33',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '150px',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Icon */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '60px',
        height: '60px',
        borderRadius: '14px',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))',
        boxShadow: '0 8px 32px rgba(99, 102, 241, 0.15)',
        marginBottom: '14px'
      }}>
        <Icon icon="lucide:square-plus" style={{ fontSize: '28px', color: '#6366F1' }} />
      </div>

      {/* Text */}
      <div style={{
        textAlign: 'center',
        color: '#AAA',
      }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 700,
          marginBottom: '6px',
          color: '#FFFFFF',
          letterSpacing: '-0.01em'
        }}>
          Empty Grid Area
        </div>
        <div style={{
          fontSize: '12px',
          color: '#8b8b8b'
        }}>
          <code style={{
            backgroundColor: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.25)',
            padding: '4px 8px',
            borderRadius: '6px',
            fontFamily: 'monospace'
          }}>
            {gridArea}
          </code>
        </div>
        <div style={{
          fontSize: '12px',
          color: '#888',
          marginTop: '10px'
        }}>
          Ask the AI to add a component here
        </div>
      </div>

      {/* Visual indicator */}
      <div style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '11px',
        backgroundColor: 'rgba(99,102,241,0.08)',
        border: '1px solid rgba(99,102,241,0.25)',
        padding: '4px 8px',
        borderRadius: '8px',
        color: '#AAA',
        fontFamily: 'monospace'
      }}>
        <Icon icon="lucide:grid-2x2" style={{ fontSize: '14px', color: '#6366F1' }} />
        {gridArea}
      </div>
    </div>
  );
};
