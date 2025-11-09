import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { DashboardComponent } from '../types/types';

interface ComponentRendererProps {
  component: DashboardComponent;
}

export const ComponentRenderer: React.FC<ComponentRendererProps> = ({ component }) => {
  if (!component || !component.id) {
    return (
      <div style={{
        gridArea: component?.gridArea || 'auto',
        backgroundColor: '#3D1F1F',
        border: '1px solid #5C2929',
        borderRadius: '8px',
        padding: '16px',
        color: '#FF6B6B',
      }}>
        Invalid Component
      </div>
    );
  }

  return (
    <div style={{
      gridArea: component.gridArea,
      backgroundColor: component.style?.backgroundColor || '#17181C',
      border: `1px solid ${component.style?.borderColor || '#2A2C33'}`,
      borderRadius: component.style?.borderRadius || '8px',
      padding: component.style?.padding || '16px',
      display: 'flex',
      flexDirection: 'column',
      minHeight: component.style?.minHeight || '150px',
      height: '100%',
      overflow: 'hidden',
    }}>
      {component.options && (
        <ReactECharts
          option={component.options}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      )}
    </div>
  );
};
