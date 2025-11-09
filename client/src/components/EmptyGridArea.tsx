import React from 'react';

interface EmptyGridAreaProps {
  gridArea: string;
}

export const EmptyGridArea: React.FC<EmptyGridAreaProps> = ({ gridArea }) => {
  return (
    <div
      style={{
        gridArea: gridArea,
        backgroundColor: '#17181C',
        border: '2px dashed #2A2C33',
        borderRadius: '8px',
        padding: '16px',
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
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        backgroundColor: '#1F1F1F',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        marginBottom: '12px',
        opacity: 0.5
      }}>
        📊
      </div>

      {/* Text */}
      <div style={{
        textAlign: 'center',
        color: '#666',
      }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 600,
          marginBottom: '4px',
          color: '#888'
        }}>
          Empty Grid Area
        </div>
        <div style={{
          fontSize: '11px',
          color: '#555'
        }}>
          <code style={{
            backgroundColor: '#1F1F1F',
            padding: '2px 6px',
            borderRadius: '3px',
            fontFamily: 'monospace'
          }}>
            {gridArea}
          </code>
        </div>
        <div style={{
          fontSize: '10px',
          color: '#444',
          marginTop: '8px',
          fontStyle: 'italic'
        }}>
          Ask AI to add a component here
        </div>
      </div>

      {/* Visual indicator */}
      <div style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        fontSize: '10px',
        backgroundColor: '#1F1F1F',
        padding: '4px 8px',
        borderRadius: '4px',
        color: '#666',
        fontFamily: 'monospace'
      }}>
        {gridArea}
      </div>
    </div>
  );
};
