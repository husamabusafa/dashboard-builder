import type { Dispatch, SetStateAction } from 'react';
import type {
  DashboardState,
  DashboardComponent,
  ToolResponse,
  ComponentDataConfig,
  PostgreSQLSchema,
  ComponentType,
} from '../types/types';
import { DataFetcher } from '../utils/dataFetcher';
import { normalizeToEChartsOption } from '../utils/chartUtils';
import {
  isValidGridArea,
  isGridAreaOccupied,
  validateGridLayout,
  getGridStats,
  extractGridAreas
} from '../utils/gridUtils';

// Helper: Parse JSONPath and navigate to value

const navigateToPath = (obj: any, path: string): { 
  parent: any;
  key: string | number;
  exists: boolean;
  value?: any;
} => {
  if (!path || path === '$' || path === '') {
    return { parent: null, key: '', exists: true, value: obj };
  }

  const cleanPath = path.startsWith('$.') ? path.slice(2) : path.startsWith('$') ? path.slice(1) : path;
  
  if (!cleanPath) {
    return { parent: null, key: '', exists: true, value: obj };
  }

  const parts = cleanPath.split(/\.|\[|\]/).filter(p => p !== '');
  
  let current = obj;
  let parent = null;
  let key: string | number = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    parent = current;
    
    const arrayIndex = parseInt(part);
    if (!isNaN(arrayIndex) && Array.isArray(current)) {
      key = arrayIndex;
      if (i === parts.length - 1) {
        return { 
          parent, 
          key, 
          exists: arrayIndex >= 0 && arrayIndex < current.length,
          value: current[arrayIndex]
        };
      }
      current = current[arrayIndex];
    } else {
      key = part;
      if (i === parts.length - 1) {
        return { 
          parent, 
          key, 
          exists: current != null && key in current,
          value: current?.[key]
        };
      }
      current = current?.[part];
    }

    if (current == null && i < parts.length - 1) {
      return { parent, key, exists: false };
    }
  }

  return { parent, key, exists: false };
};

// Helper: Set value at path

const setValueAtPath = (obj: any, path: string, value: any): any => {
  if (!path || path === '$' || path === '') {
    return value;
  }

  const result = JSON.parse(JSON.stringify(obj));
  const { parent, key } = navigateToPath(result, path);

  if (parent === null) {
    return value;
  }

  if (Array.isArray(parent) && typeof key === 'number') {
    parent[key] = value;
  } else if (typeof parent === 'object' && parent !== null) {
    parent[key] = value;
  }

  return result;
};

// Create Dashboard Tools

export const createDashboardTools = (
  getDashboardState: () => DashboardState,
  setDashboardState: Dispatch<SetStateAction<DashboardState>>
) => {
  // Initialize data fetcher
  const dataFetcher = new DataFetcher({
    mcpPostgresEndpoint: '/api/data/query',
    graphqlEndpoint: '/graphql',
  });

  // Theme helpers
  const applyChartTheme = (opt: any) => {
    if (!opt || typeof opt !== 'object') return opt;
    const palette = ['#6366F1', '#8B5CF6', '#A78BFA', '#22D3EE', '#F472B6', '#34D399'];
    return {
      color: opt.color || palette,
      backgroundColor: opt.backgroundColor || 'transparent',
      textStyle: { color: '#DDD', ...(opt.textStyle || {}) },
      xAxis: Array.isArray(opt.xAxis)
        ? opt.xAxis.map((x: any) => ({
            axisLine: { lineStyle: { color: '#2A2C33' } },
            axisLabel: { color: '#AAA' },
            splitLine: { show: true, lineStyle: { color: '#1F1F1F' } },
            ...x,
          }))
        : {
            axisLine: { lineStyle: { color: '#2A2C33' } },
            axisLabel: { color: '#AAA' },
            splitLine: { show: true, lineStyle: { color: '#1F1F1F' } },
            ...(opt.xAxis || {}),
          },
      yAxis: Array.isArray(opt.yAxis)
        ? opt.yAxis.map((y: any) => ({
            axisLine: { lineStyle: { color: '#2A2C33' } },
            axisLabel: { color: '#AAA' },
            splitLine: { show: true, lineStyle: { color: '#1F1F1F' } },
            ...y,
          }))
        : {
            axisLine: { lineStyle: { color: '#2A2C33' } },
            axisLabel: { color: '#AAA' },
            splitLine: { show: true, lineStyle: { color: '#1F1F1F' } },
            ...(opt.yAxis || {}),
          },
      grid: { containLabel: true, ...(opt.grid || {}) },
      ...opt,
    };
  };

  return {
    // ========================================================================
    // Dashboard State Management
    // ========================================================================

    get_dashboard: async (): Promise<ToolResponse> => {
      const currentState = getDashboardState();
      return {
        success: true,
        message: 'Dashboard state retrieved successfully',
        data: currentState
      };
    },

    set_grid_layout: async (params: {
      columns: string;
      rows: string;
      gap: string;
      templateAreas: string[];
    }): Promise<ToolResponse> => {
      try {
        // Normalize template areas - remove any escaped quotes that might be included
        const normalizedTemplateAreas = params.templateAreas.map(area => 
          area.replace(/^["']|["']$/g, '').trim() // Remove leading/trailing quotes
        );

        const normalizedParams = {
          ...params,
          templateAreas: normalizedTemplateAreas
        };

        // Validate grid layout
        const validation = validateGridLayout(normalizedParams);
        if (!validation.valid) {
          return {
            success: false,
            error: `Invalid grid layout: ${validation.errors.join(', ')}`
          };
        }

        const currentState = getDashboardState();
        const newAreas = extractGridAreas(normalizedParams.templateAreas);
        
        // Check if any components will be orphaned
        const orphanedComponents = Object.values(currentState.components).filter(
          c => !newAreas.includes(c.gridArea)
        );
        
        if (orphanedComponents.length > 0) {
          return {
            success: false,
            error: `Cannot update grid layout: ${orphanedComponents.length} component(s) would be orphaned. ` +
                   `Components in areas: ${orphanedComponents.map(c => c.gridArea).join(', ')} ` +
                   `which are not in new grid areas: ${newAreas.join(', ')}`
          };
        }

        setDashboardState(prev => ({
          ...prev,
          grid: {
            columns: normalizedParams.columns,
            rows: normalizedParams.rows,
            gap: normalizedParams.gap,
            templateAreas: normalizedParams.templateAreas
          }
        }));

        return {
          success: true,
          message: 'Grid layout configured successfully',
          data: {
            ...normalizedParams,
            gridAreas: newAreas,
            stats: getGridStats({ ...currentState, grid: normalizedParams })
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to set grid layout'
        };
      }
    },

    // ========================================================================
    // Component Management
    // ========================================================================

    create_component: async (params: {
      id: string;
      type: ComponentType;
      gridArea: string;
      title?: string;
      description?: string;
      data: any; // Component data - ECharts options for chart, TableData for table, StatCardData for stat-card
      dataConfig?: ComponentDataConfig;
      query?: {
        sql: string;
        handlebarsTemplate?: string;
        alasqlTransform?: string;
      };
      style?: any;
    }): Promise<ToolResponse> => {
      try {
        const currentState = getDashboardState();
        
        // Check if component ID already exists
        if (currentState.components[params.id]) {
          return {
            success: false,
            error: `Component with ID "${params.id}" already exists. Use update_component to modify it.`
          };
        }

        // Validate grid area exists
        if (!isValidGridArea(params.gridArea, currentState.grid.templateAreas)) {
          const availableAreas = extractGridAreas(currentState.grid.templateAreas);
          return {
            success: false,
            error: `Grid area "${params.gridArea}" not found in template areas. Available areas: ${availableAreas.join(', ')}`
          };
        }

        // Check if grid area is already occupied
        if (isGridAreaOccupied(params.gridArea, currentState)) {
          const existingComponent = Object.values(currentState.components).find(
            c => c.gridArea === params.gridArea
          );
          return {
            success: false,
            error: `Grid area "${params.gridArea}" is already occupied by component "${existingComponent?.id}". ` +
                   `Remove it first or choose a different grid area.`
          };
        }

        // Auto-generate dataConfig from query if provided
        let finalDataConfig = params.dataConfig;
        if (params.query && !params.dataConfig) {
          finalDataConfig = {
            source: {
              type: 'postgresql',
              query: params.query.sql,
            } as ComponentDataConfig['source'],
            handlebarsTemplate: params.query.handlebarsTemplate ? {
              template: params.query.handlebarsTemplate,
            } : undefined,
            alasqlTransform: params.query.alasqlTransform ? {
              query: params.query.alasqlTransform,
            } : undefined,
          };
        }

        // Default theme styles
        const themeStyle = {
          backgroundColor: '#17181C',
          borderColor: '#2A2C33',
          borderRadius: '12px',
          padding: params.type === 'stat-card' ? '20px' : '16px',
          ...(params.type === 'chart' ? { minHeight: '250px' } : {}),
        } as DashboardComponent['style'];

        // Apply theme to provided data
        let themedData = params.data;
        if (params.type === 'stat-card') {
          const d = (params.data || {}) as any;
          themedData = {
            color: d.color || '#FFFFFF',
            icon: d.icon || 'lucide:sparkles',
            ...d,
          };
        } else if (params.type === 'chart' && params.data && !params.query) {
          themedData = applyChartTheme(params.data);
        }

        // Create component with initial data
        const newComponent: DashboardComponent = {
          id: params.id,
          type: params.type,
          gridArea: params.gridArea,
          title: params.title,
          description: params.description,
          data: themedData,
          dataConfig: finalDataConfig,
          style: { ...(themeStyle || {}), ...(params.style || {}) },
          metadata: {
            createdAt: new Date().toISOString(),
            fetchStatus: 'idle',
          }
        };

        setDashboardState(prev => ({
          ...prev,
          components: {
            ...prev.components,
            [params.id]: newComponent
          }
        }));

        // Auto-fetch data if query was provided, with trace
        let lastTraceResult: { final: any; trace: any; error?: any } | undefined;
        if (params.query && finalDataConfig) {
          try {
            const traceResult = await dataFetcher.fetchDataWithTrace(params.id, finalDataConfig);
            const normalized = params.type === 'chart' ? normalizeToEChartsOption(traceResult.final) : traceResult.final;
            const themed = params.type === 'chart' ? applyChartTheme(normalized) : normalized;
            lastTraceResult = { ...traceResult, final: themed } as any;
            setDashboardState(prev => ({
              ...prev,
              components: {
                ...prev.components,
                [params.id]: {
                  ...prev.components[params.id],
                  data: themed,
                  metadata: {
                    ...prev.components[params.id].metadata,
                    fetchStatus: traceResult.error ? 'error' : 'success',
                    lastFetchedAt: new Date().toISOString(),
                    error: traceResult.error || undefined,
                  }
                }
              }
            }));
          } catch (error) {
            console.error('Auto-fetch failed:', error);
            setDashboardState(prev => ({
              ...prev,
              components: {
                ...prev.components,
                [params.id]: {
                  ...prev.components[params.id],
                  metadata: {
                    ...prev.components[params.id].metadata,
                    fetchStatus: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error',
                  }
                }
              }
            }));
          }
        }

        const stats = getGridStats(getDashboardState());
        
        return {
          success: true,
          message: `Component "${params.id}" created successfully in grid area "${params.gridArea}"${params.query ? ' (data fetch attempted)' : ''}`,
          data: {
            component: getDashboardState().components[params.id],
            gridStats: stats,
            suggestion: stats.availableAreas > 0 
              ? `${stats.availableAreas} grid area(s) still available: ${stats.availableAreaNames.join(', ')}` 
              : 'All grid areas are now occupied',
            fetch: lastTraceResult ? {
              postgresResponse: lastTraceResult.trace?.raw,
              finalData: lastTraceResult.final,
              transform: {
                afterHandlebars: lastTraceResult.trace?.afterHandlebars,
                afterAlaSQL: lastTraceResult.trace?.afterAlaSQL,
                afterNormalize: lastTraceResult.final,
              },
              error: lastTraceResult.error,
            } : undefined
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create component'
        };
      }
    },

    update_component: async (params: {
      id: string;
      path?: string;
      updates?: any;
      operation?: 'set' | 'push' | 'splice' | 'merge';
      operationParams?: any;
    }): Promise<ToolResponse> => {
      try {
        const currentState = getDashboardState();
        const component = currentState.components[params.id];
        
        if (!component) {
          return {
            success: false,
            error: `Component "${params.id}" not found`
          };
        }

        let updatedComponent: DashboardComponent;
        const operation = params.operation || 'set';

        if (params.path) {
          // Path-based updates
          const pathInfo = navigateToPath(component, params.path);
          
          if (!pathInfo.exists && operation !== 'set') {
            return {
              success: false,
              error: `Path "${params.path}" not found in component`
            };
          }

          switch (operation) {
            case 'push': {
              // Add item(s) to array
              if (!Array.isArray(pathInfo.value)) {
                return {
                  success: false,
                  error: `Path "${params.path}" is not an array. Cannot push.`
                };
              }
              const newArray = [...pathInfo.value, ...(Array.isArray(params.updates) ? params.updates : [params.updates])];
              updatedComponent = setValueAtPath(component, params.path, newArray) as DashboardComponent;
              break;
            }
            
            case 'splice': {
              // Remove/replace items in array
              if (!Array.isArray(pathInfo.value)) {
                return {
                  success: false,
                  error: `Path "${params.path}" is not an array. Cannot splice.`
                };
              }
              const { start = 0, deleteCount = 1, items = [] } = params.operationParams || {};
              const newArray = [...pathInfo.value];
              newArray.splice(start, deleteCount, ...items);
              updatedComponent = setValueAtPath(component, params.path, newArray) as DashboardComponent;
              break;
            }
            
            case 'merge': {
              // Deep merge objects
              if (typeof pathInfo.value !== 'object' || pathInfo.value === null) {
                return {
                  success: false,
                  error: `Path "${params.path}" is not an object. Cannot merge.`
                };
              }
              const merged = Array.isArray(pathInfo.value)
                ? [...pathInfo.value, ...(Array.isArray(params.updates) ? params.updates : [])]
                : { ...pathInfo.value, ...params.updates };
              updatedComponent = setValueAtPath(component, params.path, merged) as DashboardComponent;
              break;
            }
            
            case 'set':
            default: {
              // Direct set
              updatedComponent = setValueAtPath(component, params.path, params.updates) as DashboardComponent;
              break;
            }
          }
        } else {
          // Root-level updates
          updatedComponent = {
            ...component,
            ...params.updates,
            id: params.id,
            metadata: {
              ...component.metadata,
              updatedAt: new Date().toISOString(),
            }
          };
        }

        setDashboardState(prev => ({
          ...prev,
          components: {
            ...prev.components,
            [params.id]: updatedComponent
          }
        }));

        // If the update included/affected dataConfig, attempt fetch with trace
        let fetchInfo: any = undefined;
        const cfg: ComponentDataConfig | undefined = updatedComponent.dataConfig;
        if (cfg && cfg.source) {
          try {
            const traceResult = await dataFetcher.fetchDataWithTrace(params.id, cfg);
            const normalized = updatedComponent.type === 'chart' ? normalizeToEChartsOption(traceResult.final) : traceResult.final;
            fetchInfo = {
              postgresResponse: traceResult.trace?.raw,
              finalData: normalized,
              transform: {
                afterHandlebars: traceResult.trace?.afterHandlebars,
                afterAlaSQL: traceResult.trace?.afterAlaSQL,
                afterNormalize: normalized,
              },
              error: traceResult.error,
            };
            setDashboardState(prev => ({
              ...prev,
              components: {
                ...prev.components,
                [params.id]: {
                  ...prev.components[params.id],
                  data: normalized,
                  metadata: {
                    ...prev.components[params.id].metadata,
                    fetchStatus: traceResult.error ? 'error' : 'success',
                    lastFetchedAt: new Date().toISOString(),
                    error: traceResult.error || undefined,
                  }
                }
              }
            }));
          } catch (error) {
            setDashboardState(prev => ({
              ...prev,
              components: {
                ...prev.components,
                [params.id]: {
                  ...prev.components[params.id],
                  metadata: {
                    ...prev.components[params.id].metadata,
                    fetchStatus: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error',
                  }
                }
              }
            }));
            fetchInfo = { error: error instanceof Error ? error.message : 'Unknown error' };
          }
        }

        return {
          success: true,
          message: `Component "${params.id}" updated successfully using ${operation} operation` + (fetchInfo ? ' (data fetch attempted)' : ''),
          data: {
            component: getDashboardState().components[params.id],
            fetch: fetchInfo,
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update component'
        };
      }
    },

    remove_component: async (params: {
      id: string;
    }): Promise<ToolResponse> => {
      try {
        const currentState = getDashboardState();
        if (!currentState.components[params.id]) {
          return {
            success: false,
            error: `Component "${params.id}" not found`
          };
        }

        setDashboardState(prev => {
          const newComponents = { ...prev.components };
          delete newComponents[params.id];
          
          return {
            ...prev,
            components: newComponents
          };
        });

        return {
          success: true,
          message: `Component "${params.id}" removed successfully`
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to remove component'
        };
      }
    },

    get_component: async (params: {
      id: string;
    }): Promise<ToolResponse> => {
      try {
        const currentState = getDashboardState();
        const component = currentState.components[params.id];
        
        if (!component) {
          return {
            success: false,
            error: `Component "${params.id}" not found`,
            data: null
          };
        }

        return {
          success: true,
          message: `Component "${params.id}" retrieved successfully`,
          data: component
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get component'
        };
      }
    },

    // ========================================================================
    // Data Fetching
    // ========================================================================

    fetch_component_data: async (params: {
      id: string;
    }): Promise<ToolResponse> => {
      try {
        const currentState = getDashboardState();
        const component = currentState.components[params.id];
        
        if (!component) {
          return {
            success: false,
            error: `Component "${params.id}" not found`
          };
        }

        // Update status to loading
        setDashboardState(prev => ({
          ...prev,
          components: {
            ...prev.components,
            [params.id]: {
              ...prev.components[params.id],
              metadata: {
                ...prev.components[params.id].metadata,
                fetchStatus: 'loading',
              }
            }
          }
        }));

        // Validate dataConfig exists
        if (!component.dataConfig) {
          return {
            success: false,
            error: `Component "${params.id}" has no dataConfig to fetch from`,
          };
        }

        // Fetch data with trace
        const cfgFetch: ComponentDataConfig = component.dataConfig as ComponentDataConfig;
        const traceResult = await dataFetcher.fetchDataWithTrace(params.id, cfgFetch);
        const normalized = component.type === 'chart' ? normalizeToEChartsOption(traceResult.final) : traceResult.final;

        // Update component with fetched final data
        setDashboardState(prev => ({
          ...prev,
          components: {
            ...prev.components,
            [params.id]: {
              ...prev.components[params.id],
              data: normalized,
              metadata: {
                ...prev.components[params.id].metadata,
                fetchStatus: traceResult.error ? 'error' : 'success',
                lastFetchedAt: new Date().toISOString(),
                error: traceResult.error || undefined,
              }
            }
          }
        }));

        return {
          success: true,
          message: `Data fetched successfully for component "${params.id}"`,
          data: {
            finalData: normalized,
            postgresResponse: traceResult.trace?.raw,
            transform: {
              afterHandlebars: traceResult.trace?.afterHandlebars,
              afterAlaSQL: traceResult.trace?.afterAlaSQL,
              afterNormalize: normalized,
            },
            error: traceResult.error,
          }
        };
      } catch (error) {
        // Update status to error
        setDashboardState(prev => ({
          ...prev,
          components: {
            ...prev.components,
            [params.id]: {
              ...prev.components[params.id],
              metadata: {
                ...prev.components[params.id].metadata,
                fetchStatus: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
              }
            }
          }
        }));

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch component data'
        };
      }
    },

    refresh_all_components: async (): Promise<ToolResponse> => {
      try {
        const currentState = getDashboardState();
        const componentIds = Object.keys(currentState.components);
        
        const results = await Promise.allSettled(
          componentIds.map(async (id) => {
            const c = getDashboardState().components[id];
            const cfg = c.dataConfig;
            if (!cfg) {
              return { id, skipped: true, reason: 'no dataConfig' } as const;
            }
            const trace = await dataFetcher.fetchDataWithTrace(id, cfg);
            const final = c.type === 'chart' ? normalizeToEChartsOption(trace.final) : trace.final;
            return { id, skipped: false, trace, final } as const;
          })
        );

        // Update all components with fetched data
        setDashboardState(prev => {
          const updatedComponents = { ...prev.components };
          let successCount = 0;
          let errorCount = 0;
          let skippedCount = 0;
          results.forEach((res, index) => {
            const id = componentIds[index];
            if (res.status === 'fulfilled') {
              const val = res.value as any;
              if (val?.skipped) {
                skippedCount += 1;
                return;
              }
              const trace = val.trace;
              const final = val.final;
              successCount += trace?.error ? 0 : 1;
              errorCount += trace?.error ? 1 : 0;
              updatedComponents[id] = {
                ...updatedComponents[id],
                data: final,
                metadata: {
                  ...updatedComponents[id].metadata,
                  fetchStatus: trace?.error ? 'error' : 'success',
                  lastFetchedAt: new Date().toISOString(),
                  error: trace?.error || undefined,
                }
              };
            } else {
              errorCount += 1;
              updatedComponents[id] = {
                ...updatedComponents[id],
                metadata: {
                  ...updatedComponents[id].metadata,
                  fetchStatus: 'error',
                  error: (res as any).reason?.message || 'Unknown error',
                }
              };
            }
          });

          return {
            ...prev,
            components: updatedComponents
          };
        });

        return {
          success: true,
          message: `Refreshed ${componentIds.length} components`,
          data: { total: componentIds.length }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to refresh components'
        };
      }
    },

    // ========================================================================
    // Grid Information
    // ========================================================================

    get_grid_info: async (): Promise<ToolResponse> => {
      try {
        const currentState = getDashboardState();
        const stats = getGridStats(currentState);
        
        return {
          success: true,
          message: 'Grid information retrieved successfully',
          data: {
            grid: currentState.grid,
            stats,
            components: Object.values(currentState.components).map(c => ({
              id: c.id,
              type: c.type,
              gridArea: c.gridArea,
              title: c.title
            }))
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get grid info'
        };
      }
    },

    // ========================================================================
    // PostgreSQL Schema Management
    // ========================================================================

    set_postgres_schema: async (params: {
      schema: PostgreSQLSchema;
    }): Promise<ToolResponse> => {
      try {
        setDashboardState(prev => ({
          ...prev,
          postgresSchema: params.schema
        }));

        return {
          success: true,
          message: 'PostgreSQL schema configured successfully',
          data: params.schema
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to set PostgreSQL schema'
        };
      }
    },

    get_postgres_schema: async (): Promise<ToolResponse> => {
      const currentState = getDashboardState();
      
      if (!currentState.postgresSchema) {
        return {
          success: false,
          error: 'No PostgreSQL schema configured',
          data: null
        };
      }

      return {
        success: true,
        message: 'PostgreSQL schema retrieved successfully',
        data: currentState.postgresSchema
      };
    },

    query_postgres_schema: async (params: {
      schemaName?: string;
      tableName?: string;
    }): Promise<ToolResponse> => {
      const currentState = getDashboardState();
      
      if (!currentState.postgresSchema) {
        return {
          success: false,
          error: 'No PostgreSQL schema configured',
          data: null
        };
      }

      let result: any;

      if (params.tableName) {
        // Find specific table
        result = currentState.postgresSchema.tables.find(
          t => t.name === params.tableName && 
          (!params.schemaName || t.schema === params.schemaName)
        );
        
        if (!result) {
          return {
            success: false,
            error: `Table "${params.tableName}" not found in schema`
          };
        }
      } else if (params.schemaName) {
        // Find all tables in schema
        result = currentState.postgresSchema.tables.filter(
          t => t.schema === params.schemaName
        );
      } else {
        // Return all schemas
        result = currentState.postgresSchema.schemas;
      }

      return {
        success: true,
        message: 'Schema query successful',
        data: result
      };
    },

    // ========================================================================
    // GraphQL Endpoint Management
    // ========================================================================

    set_graphql_endpoint: async (params: {
      endpoint: string;
    }): Promise<ToolResponse> => {
      try {
        setDashboardState(prev => ({
          ...prev,
          graphqlEndpoint: params.endpoint
        }));

        return {
          success: true,
          message: 'GraphQL endpoint configured successfully',
          data: { endpoint: params.endpoint }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to set GraphQL endpoint'
        };
      }
    },

    // ========================================================================
    // Template Helpers
    // ========================================================================

    generate_chart_template: async (params: {
      labelField: string;
      valueFields: string[];
      datasetLabels?: string[];
    }): Promise<ToolResponse> => {
      try {
        const template = `
{
  "labels": [{{#each data}}"{{${params.labelField}}}"{{#unless @last}},{{/unless}}{{/each}}],
  "datasets": [
    ${params.valueFields.map((field, index) => `
    {
      "label": "${params.datasetLabels?.[index] || field}",
      "data": [{{#each data}}{{${field}}}{{#unless @last}},{{/unless}}{{/each}}]
    }
    `).join(',')}
  ]
}
        `.trim();

        return {
          success: true,
          message: 'Chart template generated successfully',
          data: { template }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to generate chart template'
        };
      }
    },

    generate_table_template: async (params: {
      columns: Array<{ key: string; label: string }>;
    }): Promise<ToolResponse> => {
      try {
        const template = `
{
  "columns": ${JSON.stringify(params.columns)},
  "rows": [
    {{#each data}}
    {
      ${params.columns.map(col => `"${col.key}": "{{${col.key}}}"`).join(',\n      ')}
    }{{#unless @last}},{{/unless}}
    {{/each}}
  ]
}
        `.trim();

        return {
          success: true,
          message: 'Table template generated successfully',
          data: { template }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to generate table template'
        };
      }
    },
  };
};

// Types are exported from types.ts
