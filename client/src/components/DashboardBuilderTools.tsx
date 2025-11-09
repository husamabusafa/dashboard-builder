import type { Dispatch, SetStateAction } from 'react';
import type {
  DashboardState,
  DashboardComponent,
  ToolResponse,
  ComponentDataConfig,
  PostgreSQLSchema,
  ComponentType,
  ChartData,
  TableData,
  StatCardData,
  MetricCardData,
  GaugeData,
  HeatmapData,
} from './types';
import { DataFetcher } from './dataFetcher';
import {
  isValidGridArea,
  isGridAreaOccupied,
  validateGridLayout,
  getGridStats,
  extractGridAreas
} from './gridUtils';

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
    mcpPostgresEndpoint: '/api/mcp/postgres',
    graphqlEndpoint: '/graphql',
  });

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
      title: string;
      description?: string;
      dataConfig: ComponentDataConfig;
      data?: ChartData | TableData | StatCardData | MetricCardData | GaugeData | HeatmapData;
      options?: any;
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

        // Create component with initial data
        const newComponent: DashboardComponent = {
          id: params.id,
          type: params.type,
          gridArea: params.gridArea,
          title: params.title,
          description: params.description,
          dataConfig: params.dataConfig,
          data: params.data || {},
          options: params.options,
          style: params.style,
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

        const stats = getGridStats(getDashboardState());
        
        return {
          success: true,
          message: `Component "${params.id}" created successfully in grid area "${params.gridArea}"`,
          data: {
            component: newComponent,
            gridStats: stats,
            suggestion: stats.availableAreas > 0 
              ? `${stats.availableAreas} grid area(s) still available: ${stats.availableAreaNames.join(', ')}` 
              : 'All grid areas are now occupied'
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
      updates: any;
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

        if (params.path) {
          updatedComponent = setValueAtPath(component, params.path, params.updates) as DashboardComponent;
        } else {
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

        return {
          success: true,
          message: `Component "${params.id}" updated successfully`,
          data: updatedComponent
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

        // Fetch data
        const fetchedData = await dataFetcher.fetchData(params.id, component.dataConfig);

        // Update component with fetched data
        setDashboardState(prev => ({
          ...prev,
          components: {
            ...prev.components,
            [params.id]: {
              ...prev.components[params.id],
              data: fetchedData,
              metadata: {
                ...prev.components[params.id].metadata,
                fetchStatus: 'success',
                lastFetchedAt: new Date().toISOString(),
                error: undefined,
              }
            }
          }
        }));

        return {
          success: true,
          message: `Data fetched successfully for component "${params.id}"`,
          data: fetchedData
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
          componentIds.map(id => 
            dataFetcher.fetchData(id, currentState.components[id].dataConfig)
          )
        );

        // Update all components with fetched data
        setDashboardState(prev => {
          const updatedComponents = { ...prev.components };
          
          componentIds.forEach((id, index) => {
            const result = results[index];
            
            if (result.status === 'fulfilled') {
              updatedComponents[id] = {
                ...updatedComponents[id],
                data: result.value,
                metadata: {
                  ...updatedComponents[id].metadata,
                  fetchStatus: 'success',
                  lastFetchedAt: new Date().toISOString(),
                  error: undefined,
                }
              };
            } else {
              updatedComponents[id] = {
                ...updatedComponents[id],
                metadata: {
                  ...updatedComponents[id].metadata,
                  fetchStatus: 'error',
                  error: result.reason?.message || 'Unknown error',
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
          data: { refreshedCount: componentIds.length }
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
