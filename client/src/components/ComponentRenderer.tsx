import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Icon } from '@iconify/react';
import type { DashboardComponent, TableData, StatCardData } from '../types/types';

const formatCompactNumber = (value: number | string): string => {
  const num = typeof value === 'string' ? Number(value) : value;
  if (typeof num !== 'number' || isNaN(num)) return String(value);
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  const units = [
    { v: 1e12, s: 'T' },
    { v: 1e9,  s: 'B' },
    { v: 1e6,  s: 'M' },
    { v: 1e3,  s: 'K' },
  ];
  for (const u of units) {
    if (abs >= u.v) {
      const raw = abs / u.v;
      const fixed = raw < 10 ? raw.toFixed(1) : Math.round(raw).toString();
      return `${sign}${fixed.replace(/\.0$/, '')}${u.s}`;
    }
  }
  return `${sign}${abs.toLocaleString()}`;
};

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
            style={{ height: '100%', width: '100%', minHeight: '250px' }}
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

        const maxTableHeight = (component as any)?.style?.maxTableHeight || '320px';

        return (
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: maxTableHeight, flex: 1 }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'separate',
              borderSpacing: 0,
              fontSize: '13px',
              tableLayout: 'fixed'
            }}>
              <thead>
                <tr style={{ 
                  borderBottom: '2px solid #2A2C33',
                  background: 'linear-gradient(to bottom, rgba(99, 102, 241, 0.05), transparent)'
                }}>
                  {tableData.columns.map((col) => (
                    <th
                      key={col.key}
                      style={{
                        textAlign: col.align || 'left',
                        padding: '14px 12px',
                        color: '#AAA', 
                        fontWeight: 600,
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        position: 'sticky',
                        top: 0,
                        zIndex: 2,
                        backgroundColor: '#17181C',
                        width: col.width
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
                      transition: 'background-color 0.15s ease',
                      backgroundColor: rowIndex % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = rowIndex % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'}
                  >
                    {tableData.columns.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          padding: '14px 12px',
                          textAlign: col.align || 'left',
                          color: col.color || '#DDD',
                          fontSize: '13px',
                          width: col.width,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
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

        const accent = statData.iconColor || statData.color || '#6366F1';
        const chipBg = `linear-gradient(135deg, ${accent}33, ${accent}1A)`; // 20% and 10% alpha

        return (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'space-between',
            flex: 1,
            padding: 0
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#AFAFAF',
                  marginBottom: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.4px',
                  textTransform: 'uppercase'
                }}>
                  {statData.label}
                </div>
                <div style={{ 
                  fontSize: '44px', 
                  fontWeight: 800, 
                  color: statData.color || '#FFFFFF',
                  marginBottom: '6px',
                  lineHeight: 1,
                  letterSpacing: '-0.02em'
                }}>
                  {statData.prefix}{formatCompactNumber(statData.value)}{statData.suffix}
                </div>
              </div>
              {statData.icon && (
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '60px',
                  height: '60px',
                  borderRadius: '14px',
                  background: chipBg,
                  boxShadow: `0 10px 32px ${accent}22`,
                  border: `1px solid ${accent}33`,
                  flexShrink: 0
                }}>
                  {typeof statData.icon === 'string' && statData.icon.includes(':') ? (
                    <Icon icon={statData.icon} style={{ fontSize: '28px', color: accent }} />
                  ) : (
                    <span style={{ fontSize: '26px', lineHeight: 1 }}>{String(statData.icon)}</span>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', gap: '12px', flexWrap: 'wrap' }}>
              {statData.trend && (
                <div style={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  backgroundColor: statData.trend.direction === 'up' ? 'rgba(34, 197, 94, 0.12)' : 
                                   statData.trend.direction === 'down' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(153, 153, 153, 0.12)',
                  color: statData.trend.direction === 'up' ? '#22C55E' : 
                         statData.trend.direction === 'down' ? '#EF4444' : '#999',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <Icon icon={
                    statData.trend.direction === 'up' ? 'lucide:trending-up' :
                    statData.trend.direction === 'down' ? 'lucide:trending-down' :
                    'lucide:minus'
                  } style={{ fontSize: '14px' }} />
                  <span>{statData.trend.value}{typeof statData.trend.value === 'number' ? '%' : ''}</span>
                  {statData.trend.label && <span style={{ opacity: 0.75 }}>{statData.trend.label}</span>}
                </div>
              )}
              {statData.description && (
                <div style={{ 
                  fontSize: '12px', 
                  color: '#A0A0A0',
                  lineHeight: '1.5'
                }}>
                  {statData.description}
                </div>
              )}
            </div>
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
      background: component.type === 'stat-card' && (component.data as any)?.gradient ? (component.data as any).gradient : undefined,
      border: `1px solid ${component.type === 'stat-card' && (component.data as any)?.gradient ? 'rgba(255,255,255,0.06)' : (component.style?.borderColor || '#2A2C33')}`,
      borderRadius: component.style?.borderRadius || '12px',
      padding: component.style?.padding || (component.type === 'stat-card' ? '20px' : '16px'),
      display: 'flex',
      flexDirection: 'column',
      minHeight: component.style?.minHeight || '150px',
      height: '100%',
      overflow: 'hidden',
      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
      transition: 'transform 0.15s ease, box-shadow 0.2s ease',
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
