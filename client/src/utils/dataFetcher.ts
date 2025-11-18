import Handlebars from 'handlebars';
import alasql from 'alasql';
import type {
  ComponentDataConfig,
  DataSource,
  PostgreSQLQuery,
  GraphQLQuery,
  StaticData,
  HandlebarsTemplate,
  AlaSQLTransform,
} from '../types/types';

// Data Fetcher Class

export class DataFetcher {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private mcpPostgresEndpoint?: string;
  private graphqlEndpoint?: string;

  constructor(config?: {
    mcpPostgresEndpoint?: string;
    graphqlEndpoint?: string;
  }) {
    this.mcpPostgresEndpoint = config?.mcpPostgresEndpoint;
    this.graphqlEndpoint = config?.graphqlEndpoint;
  }

  /**
   * Fetch data based on the component's data configuration
   */
  async fetchData(
    componentId: string,
    config: ComponentDataConfig
  ): Promise<any> {
    try {
      // Check cache first
      if (config.cache?.enabled) {
        const cached = this.getFromCache(componentId, config.cache.ttl);
        if (cached !== null) {
          return cached;
        }
      }

      // Fetch from data source
      let rawData = await this.fetchFromSource(config.source);

      // Apply Handlebars template transformation if specified
      if (config.handlebarsTemplate) {
        rawData = this.applyHandlebarsTemplate(rawData, config.handlebarsTemplate);
      }

      // Apply alasql transformation if specified
      if (config.alasqlTransform) {
        rawData = this.applyAlaSQLTransform(rawData, config.alasqlTransform);
      }

      // Cache the result
      if (config.cache?.enabled) {
        this.setCache(componentId, rawData);
      }

      return rawData;
    } catch (error) {
      console.error(`Error fetching data for component ${componentId}:`, error);
      throw error;
    }
  }

  async fetchDataWithTrace(
    componentId: string,
    config: ComponentDataConfig
  ): Promise<{
    final: any;
    trace: { source: string; raw: any; afterHandlebars?: any; afterAlaSQL?: any };
    error?: string | any;
  }> {
    try {
      let raw: any;
      const sourceType = config.source.type;

      if (sourceType === 'postgresql') {
        raw = await this.fetchFromPostgreSQLRaw(config.source as PostgreSQLQuery);
      } else if (sourceType === 'graphql') {
        raw = await this.fetchFromGraphQL(config.source as GraphQLQuery);
      } else if (sourceType === 'static') {
        raw = await this.fetchFromStatic(config.source as StaticData);
      } else {
        throw new Error(`Unknown data source type: ${(config.source as any).type}`);
      }

      const rawForTransform = raw && typeof raw === 'object' && 'data' in raw ? (raw as any).data : raw;

      let afterHandlebars: any = rawForTransform;
      if (config.handlebarsTemplate) {
        afterHandlebars = this.applyHandlebarsTemplate(rawForTransform, config.handlebarsTemplate);
      }

      let afterAlaSQL: any = afterHandlebars;
      if (config.alasqlTransform) {
        afterAlaSQL = this.applyAlaSQLTransform(afterHandlebars, config.alasqlTransform);
      }

      const final = afterAlaSQL;

      if (config.cache?.enabled) {
        this.setCache(componentId, final);
      }

      const possibleError = raw && typeof raw === 'object' && 'error' in raw ? (raw as any).error : undefined;

      return {
        final,
        trace: { source: sourceType, raw, afterHandlebars: config.handlebarsTemplate ? afterHandlebars : undefined, afterAlaSQL: config.alasqlTransform ? afterAlaSQL : undefined },
        error: possibleError,
      };
    } catch (error: any) {
      return {
        final: undefined,
        trace: { source: config.source.type, raw: undefined },
        error: error?.message || error,
      };
    }
  }

  /**
   * Fetch data from the specified source
   */
  private async fetchFromSource(source: DataSource): Promise<any> {
    switch (source.type) {
      case 'postgresql':
        return this.fetchFromPostgreSQL(source);
      case 'graphql':
        return this.fetchFromGraphQL(source);
      case 'static':
        return this.fetchFromStatic(source);
      default:
        throw new Error(`Unknown data source type: ${(source as any).type}`);
    }
  }

  /**
   * Fetch data from PostgreSQL via MCP
   */
  private async fetchFromPostgreSQL(source: PostgreSQLQuery): Promise<any> {
    if (!this.mcpPostgresEndpoint) {
      console.warn('MCP PostgreSQL endpoint not configured');
      return { error: 'PostgreSQL endpoint not configured' };
    }

    // Check if fetch is available
    if (typeof fetch === 'undefined') {
      console.warn('fetch is not available in this context');
      return { error: 'fetch not available' };
    }

    try {
      const response = await fetch(this.mcpPostgresEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: source.query,
          params: source.params,
          schema: source.schema,
        }),
      });

      if (!response.ok) {
        console.warn(`PostgreSQL query failed: ${response.statusText}`);
        return { error: response.statusText };
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.warn('PostgreSQL fetch error:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async fetchFromPostgreSQLRaw(source: PostgreSQLQuery): Promise<any> {
    if (!this.mcpPostgresEndpoint) {
      return { error: 'PostgreSQL endpoint not configured' };
    }

    if (typeof fetch === 'undefined') {
      return { error: 'fetch not available' };
    }

    try {
      const response = await fetch(this.mcpPostgresEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: source.query,
          params: source.params,
          schema: source.schema,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        return { error: result?.error || response.statusText, ...result };
      }
      return result;
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Fetch data from GraphQL endpoint
   */
  private async fetchFromGraphQL(source: GraphQLQuery): Promise<any> {
    const endpoint = source.endpoint || this.graphqlEndpoint;
    
    if (!endpoint) {
      console.warn('GraphQL endpoint not configured');
      return { error: 'GraphQL endpoint not configured' };
    }

    // Check if fetch is available
    if (typeof fetch === 'undefined') {
      console.warn('fetch is not available in this context');
      return { error: 'fetch not available' };
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: source.query,
          variables: source.variables,
        }),
      });

      if (!response.ok) {
        console.warn(`GraphQL query failed: ${response.statusText}`);
        return { error: response.statusText };
      }

      const result = await response.json();
      
      if (result.errors) {
        console.warn(`GraphQL errors: ${JSON.stringify(result.errors)}`);
        return { error: result.errors };
      }

      return result.data;
    } catch (error) {
      console.warn('GraphQL fetch error:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Return static data
   */
  private async fetchFromStatic(source: StaticData): Promise<any> {
    return source.data;
  }

  /**
   * Apply Handlebars template transformation
   */
  private applyHandlebarsTemplate(
    data: any,
    templateConfig: HandlebarsTemplate
  ): any {
    try {
      const template = Handlebars.compile(templateConfig.template);
      
      // Smart context: flatten single-row results for easier access
      const isSingleRow = Array.isArray(data) && data.length === 1;
      const context = {
        data,
        // Add direct field access for single-row results
        ...(isSingleRow ? data[0] : {}),
        // Add convenience properties
        first: Array.isArray(data) && data.length > 0 ? data[0] : null,
        count: Array.isArray(data) ? data.length : 0,
        isEmpty: !data || (Array.isArray(data) && data.length === 0),
        ...templateConfig.context,
      };
      
      const result = template(context);
      
      // Try to parse as JSON if it looks like JSON
      if (typeof result === 'string' && (result.startsWith('{') || result.startsWith('['))) {
        try {
          return JSON.parse(result);
        } catch (parseError) {
          console.warn('Failed to parse template result as JSON:', parseError);
          return result;
        }
      }
      
      return result;
    } catch (error) {
      const preview = templateConfig.template.length > 100 
        ? templateConfig.template.substring(0, 100) + '...' 
        : templateConfig.template;
      console.error('Handlebars template error:', error);
      console.error('Template preview:', preview);
      throw new Error(`Handlebars template failed: ${error}`);
    }
  }

  /**
   * Apply alasql transformation
   */
  private applyAlaSQLTransform(
    data: any,
    transform: AlaSQLTransform
  ): any {
    try {
      // Ensure data is in array format for alasql
      const dataArray = Array.isArray(data) ? data : [data];
      
      // Execute alasql query
      const result = alasql(transform.query, [dataArray, transform.params]);
      
      return result;
    } catch (error) {
      console.error('AlaSQL transform error:', error);
      throw new Error(`AlaSQL transform failed: ${error}`);
    }
  }

  /**
   * Get data from cache
   */
  private getFromCache(componentId: string, ttl?: number): any | null {
    const cached = this.cache.get(componentId);
    
    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.timestamp;
    const maxAge = ttl || 60000; // Default 60 seconds

    if (age > maxAge) {
      this.cache.delete(componentId);
      return null;
    }

    return cached.data;
  }

  /**
   * Set data in cache
   */
  private setCache(componentId: string, data: any): void {
    this.cache.set(componentId, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache for a specific component or all components
   */
  clearCache(componentId?: string): void {
    if (componentId) {
      this.cache.delete(componentId);
    } else {
      this.cache.clear();
    }
  }
}

// Helper Functions for Template Generation

/**
 * Generate a Handlebars template for chart data transformation
 */
export function createChartDataTemplate(options: {
  labelField: string;
  valueFields: string[];
  datasetLabels?: string[];
}): string {
  const { labelField, valueFields, datasetLabels } = options;
  
  return `
{
  "labels": [{{#each data}}"{{${labelField}}}"{{#unless @last}},{{/unless}}{{/each}}],
  "datasets": [
    ${valueFields.map((field, index) => `
    {
      "label": "${datasetLabels?.[index] || field}",
      "data": [{{#each data}}{{${field}}}{{#unless @last}},{{/unless}}{{/each}}]
    }
    `).join(',')}
  ]
}
  `.trim();
}

/**
 * Generate a Handlebars template for table data transformation
 */
export function createTableDataTemplate(options: {
  columns: Array<{ key: string; label: string }>;
}): string {
  const { columns } = options;
  
  return `
{
  "columns": ${JSON.stringify(columns)},
  "rows": [
    {{#each data}}
    {
      ${columns.map(col => `"${col.key}": "{{${col.key}}}"`).join(',\n      ')}
    }{{#unless @last}},{{/unless}}
    {{/each}}
  ]
}
  `.trim();
}

/**
 * Generate a Handlebars template for stat card data
 */
export function createStatCardTemplate(options: {
  valueField: string;
  labelField?: string;
  trendField?: string;
}): string {
  const { valueField, labelField, trendField } = options;
  
  return `
{
  "value": {{data.0.${valueField}}},
  "label": "${labelField ? `{{data.0.${labelField}}}` : 'Value'}"
  ${trendField ? `,
  "trend": {
    "value": {{data.0.${trendField}}},
    "direction": "{{#if (gt data.0.${trendField} 0)}}up{{else}}down{{/if}}"
  }` : ''}
}
  `.trim();
}

// Register Custom Handlebars Helpers

// Comparison helpers
Handlebars.registerHelper('gt', function(a: any, b: any) {
  return a > b;
});

Handlebars.registerHelper('lt', function(a: any, b: any) {
  return a < b;
});

Handlebars.registerHelper('eq', function(a: any, b: any) {
  return a === b;
});

Handlebars.registerHelper('ne', function(a: any, b: any) {
  return a !== b;
});

Handlebars.registerHelper('gte', function(a: any, b: any) {
  return a >= b;
});

Handlebars.registerHelper('lte', function(a: any, b: any) {
  return a <= b;
});

// Logical helpers
Handlebars.registerHelper('and', function(a: any, b: any) {
  return a && b;
});

Handlebars.registerHelper('or', function(a: any, b: any) {
  return a || b;
});

Handlebars.registerHelper('not', function(a: any) {
  return !a;
});

// Math helpers
Handlebars.registerHelper('add', function(a: number, b: number) {
  return a + b;
});

Handlebars.registerHelper('subtract', function(a: number, b: number) {
  return a - b;
});

Handlebars.registerHelper('multiply', function(a: number, b: number) {
  return a * b;
});

Handlebars.registerHelper('divide', function(a: number, b: number) {
  return b !== 0 ? a / b : 0;
});

// Format number helper
Handlebars.registerHelper('formatNumber', function(value: number, decimals: number = 2) {
  return value.toFixed(decimals);
});

// Format percentage helper
Handlebars.registerHelper('formatPercent', function(value: number) {
  return `${(value * 100).toFixed(1)}%`;
});

// Format currency helper
Handlebars.registerHelper('formatCurrency', function(value: number, currency: string = '$') {
  return `${currency}${value.toLocaleString()}`;
});

// Date formatting helper
Handlebars.registerHelper('formatDate', function(date: string | Date, format: string = 'short') {
  const d = new Date(date);
  if (format === 'short') {
    return d.toLocaleDateString();
  } else if (format === 'long') {
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
  return d.toISOString();
});

// Convenience helpers
Handlebars.registerHelper('first', function(array: any[]) {
  return Array.isArray(array) && array.length > 0 ? array[0] : null;
});

Handlebars.registerHelper('last', function(array: any[]) {
  return Array.isArray(array) && array.length > 0 ? array[array.length - 1] : null;
});

Handlebars.registerHelper('row', function(array: any[], index: number) {
  return Array.isArray(array) && index >= 0 && index < array.length ? array[index] : null;
});

Handlebars.registerHelper('length', function(array: any[]) {
  return Array.isArray(array) ? array.length : 0;
});

// Safe property access helper
Handlebars.registerHelper('get', function(obj: any, path: string, defaultValue: any = '') {
  if (!obj || !path) return defaultValue;
  const keys = path.split('.');
  let result = obj;
  for (const key of keys) {
    if (result == null || !(key in result)) return defaultValue;
    result = result[key];
  }
  return result ?? defaultValue;
});

// JSON helpers
Handlebars.registerHelper('json', function(obj: any, pretty: boolean = false) {
  try {
    return pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
  } catch {
    return '';
  }
});

Handlebars.registerHelper('jsonParse', function(str: string) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
});

// String helpers
Handlebars.registerHelper('uppercase', function(str: string) {
  return str?.toString().toUpperCase() || '';
});

Handlebars.registerHelper('lowercase', function(str: string) {
  return str?.toString().toLowerCase() || '';
});

Handlebars.registerHelper('capitalize', function(str: string) {
  const s = str?.toString() || '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
});

Handlebars.registerHelper('trim', function(str: string) {
  return str?.toString().trim() || '';
});

Handlebars.registerHelper('concat', function(...args: any[]) {
  // Remove the Handlebars options object (last argument)
  return args.slice(0, -1).join('');
});

// Default value helper
Handlebars.registerHelper('default', function(value: any, defaultValue: any) {
  return value ?? defaultValue;
});
