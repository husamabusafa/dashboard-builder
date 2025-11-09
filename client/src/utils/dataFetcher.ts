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
} from './types';

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
      const context = {
        data,
        ...templateConfig.context,
      };
      
      const result = template(context);
      
      // Try to parse as JSON if it looks like JSON
      if (typeof result === 'string' && (result.startsWith('{') || result.startsWith('['))) {
        try {
          return JSON.parse(result);
        } catch {
          return result;
        }
      }
      
      return result;
    } catch (error) {
      console.error('Handlebars template error:', error);
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

// Greater than helper
Handlebars.registerHelper('gt', function(a: any, b: any) {
  return a > b;
});

// Less than helper
Handlebars.registerHelper('lt', function(a: any, b: any) {
  return a < b;
});

// Equals helper
Handlebars.registerHelper('eq', function(a: any, b: any) {
  return a === b;
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
