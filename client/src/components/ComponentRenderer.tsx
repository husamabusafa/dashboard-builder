import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { DashboardComponent, TableData, StatCardData } from '../types/types';

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

  const renderContent = () => {
    switch (component.type) {
      case 'chart':
        return component.data ? (
          <ReactECharts
            option={component.data}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'canvas' }}
          />
        ) : (
          <div style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
            No chart data
          </div>
        );

      case 'table': {
        const tableData = component.data as TableData;
        if (!tableData?.columns || !tableData?.rows) {
          return (
            <div style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
              No table data
            </div>
          );
        }

        return (
          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '13px'
            }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2A2C33' }}>
                  {tableData.columns.map((col) => (
                    <th
                      key={col.key}
                      style={{
                        textAlign: col.align || 'left',
                        padding: '12px 8px',
                        color: '#999',
                        fontWeight: 600,
                        fontSize: '12px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    style={{
                      borderBottom: '1px solid #1F1F1F',
                    }}
                  >
                    {tableData.columns.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          padding: '12px 8px',
                          textAlign: col.align || 'left',
                          color: col.color || '#CCC',
                        }}
                      >
                        {col.format ? col.format(row[col.key]) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      case 'stat-card': {
        const statData = component.data as StatCardData;
        if (!statData) {
          return (
            <div style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
              No stat data
            </div>
          );
        }

        return (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
            padding: '8px'
          }}>
            {statData.icon && (
              <div style={{ 
                fontSize: '32px', 
                marginBottom: '12px',
                opacity: 0.9 
              }}>
                {statData.icon}
              </div>
            )}
            <div style={{ 
              fontSize: '36px', 
              fontWeight: 700, 
              color: statData.color || '#FFF',
              marginBottom: '8px',
              lineHeight: 1
            }}>
              {statData.prefix}{statData.value}{statData.suffix}
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: '#999',
              marginBottom: '12px'
            }}>
              {statData.label}
            </div>
            {statData.trend && (
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                color: statData.trend.direction === 'up' ? '#22C55E' : 
                       statData.trend.direction === 'down' ? '#EF4444' : '#999'
              }}>
                <span>{statData.trend.direction === 'up' ? '↑' : statData.trend.direction === 'down' ? '↓' : '→'}</span>
                <span>{statData.trend.value}{typeof statData.trend.value === 'number' ? '%' : ''}</span>
                {statData.trend.label && <span style={{ color: '#666' }}>({statData.trend.label})</span>}
              </div>
            )}
            {statData.description && (
              <div style={{ 
                fontSize: '12px', 
                color: '#666',
                marginTop: '8px'
              }}>
                {statData.description}
              </div>
            )}
          </div>
        );
      }

      default:
        return (
          <div style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
            Unknown component type: {component.type}
          </div>
        );
    }
  };

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
      {component.title && (
        <div style={{ 
          fontSize: '16px', 
          fontWeight: 600, 
          color: '#FFF',
          marginBottom: '12px'
        }}>
          {component.title}
        </div>
      )}
      {component.description && (
        <div style={{ 
          fontSize: '13px', 
          color: '#666',
          marginBottom: '12px'
        }}>
          {component.description}
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {renderContent()}
      </div>
    </div>
  );
};
