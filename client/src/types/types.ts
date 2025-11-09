export type ComponentType = 'chart';

export interface PostgreSQLQuery {
  type: 'postgresql';
  query: string;
  params?: Record<string, any>;
  schema?: string; // PostgreSQL schema from MCP
}

export interface GraphQLQuery {
  type: 'graphql';
  query: string;
  variables?: Record<string, any>;
  endpoint?: string;
}

export interface StaticData {
  type: 'static';
  data: any;
}

export interface HandlebarsTemplate {
  template: string; // Handlebars template string
  context?: Record<string, any>; // Context data for template
}

export interface AlaSQLTransform {
  query: string; // alasql query to transform data
  params?: Record<string, any>;
}

export type DataSource = PostgreSQLQuery | GraphQLQuery | StaticData;

export interface ComponentDataConfig {
  source: DataSource;
  refreshInterval?: number; // Auto-refresh interval in ms
  handlebarsTemplate?: HandlebarsTemplate; // Template for data transformation
  alasqlTransform?: AlaSQLTransform; // SQL-like transformation
  cache?: {
    enabled: boolean;
    ttl?: number; // Time to live in ms
  };
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string;
  borderWidth?: number;
  fill?: boolean;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartOptions {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  plugins?: {
    legend?: {
      display?: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right';
    };
    tooltip?: {
      enabled?: boolean;
    };
    title?: {
      display?: boolean;
      text?: string;
    };
  };
  scales?: {
    x?: {
      display?: boolean;
      grid?: { display?: boolean };
    };
    y?: {
      display?: boolean;
      grid?: { display?: boolean };
      beginAtZero?: boolean;
    };
  };
}

export interface TableColumn {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  format?: (value: any) => string; // Formatter function
  sortable?: boolean;
  icon?: string; // Iconify icon for column header (e.g., 'mdi:account')
  color?: string; // Custom color for this column's cells
  badge?: boolean; // Render cell value as badge with auto-coloring
}

export interface TableData {
  columns: TableColumn[];
  rows: Record<string, any>[];
  pagination?: {
    pageSize: number;
    currentPage: number;
    totalRows: number;
  };
  sorting?: {
    column: string;
    direction: 'asc' | 'desc';
  };
  showFooter?: boolean; // Show footer with row count and pagination
}

export interface StatCardData {
  value: number | string;
  label: string;
  icon?: string; // Emoji or Iconify icon (e.g., 'mdi:currency-usd' or '💰')
  iconColor?: string; // Color for icon background
  gradient?: string; // Custom gradient background
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  comparison?: {
    value: number | string;
    label: string;
  };
  color?: string;
  prefix?: string; // e.g., "$", "€"
  suffix?: string; // e.g., "%", "k", "M"
  description?: string; // Optional description text
}

export interface MetricCardData {
  title: string;
  value: number | string;
  unit?: string;
  sparkline?: number[]; // Mini chart data
  change?: {
    value: number;
    period: string; // e.g., "vs last month"
  };
  status?: 'success' | 'warning' | 'error' | 'info';
}

export interface GaugeData {
  value: number;
  min: number;
  max: number;
  thresholds?: {
    low: number;
    medium: number;
    high: number;
  };
  colors?: {
    low: string;
    medium: string;
    high: string;
  };
  label?: string;
  unit?: string;
}

export interface HeatmapData {
  xLabels: string[];
  yLabels: string[];
  data: number[][]; // 2D array of values
  colorScale?: {
    min: string;
    max: string;
  };
}

export interface DashboardComponent {
  id: string;
  type: ComponentType;
  gridArea: string;
  title?: string;
  description?: string;
  options: any;
  style?: {
    backgroundColor?: string;
    borderColor?: string;
    borderRadius?: string;
    padding?: string;
    minHeight?: string;
  };
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface PostgreSQLTable {
  schema: string;
  name: string;
  columns: PostgreSQLColumn[];
}

export interface PostgreSQLColumn {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  references?: {
    table: string;
    column: string;
  };
}

export interface PostgreSQLSchema {
  schemas: string[];
  tables: PostgreSQLTable[];
}

export interface DashboardState {
  grid: {
    columns: string;
    rows: string;
    gap: string;
    templateAreas: string[];
  };
  components: Record<string, DashboardComponent>;
  postgresSchema?: PostgreSQLSchema; // Schema from MCP
  graphqlEndpoint?: string;
  metadata?: {
    name?: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface ToolResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}
