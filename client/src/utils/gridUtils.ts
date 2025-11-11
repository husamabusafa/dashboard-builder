import type { DashboardState } from '../types/types';

/**
 * Extract all unique grid area names from templateAreas
 */
export function extractGridAreas(templateAreas: string[]): string[] {
  const areas = templateAreas
    .join(' ')
    .split(/\s+/)
    .filter(area => area && area !== '.');
  return [...new Set(areas)];
}

/**
 * Validate if a grid area exists in the template
 */
export function isValidGridArea(gridArea: string, templateAreas: string[]): boolean {
  const areas = extractGridAreas(templateAreas);
  return areas.includes(gridArea);
}

/**
 * Get all available (empty) grid areas
 */
export function getAvailableGridAreas(dashboardState: DashboardState): string[] {
  const allAreas = extractGridAreas(dashboardState.grid.templateAreas);
  const occupiedAreas = Object.values(dashboardState.components).map(c => c.gridArea);
  return allAreas.filter(area => !occupiedAreas.includes(area));
}

/**
 * Get occupied grid areas
 */
export function getOccupiedGridAreas(dashboardState: DashboardState): string[] {
  return Object.values(dashboardState.components).map(c => c.gridArea);
}

/**
 * Check if a grid area is already occupied
 */
export function isGridAreaOccupied(gridArea: string, dashboardState: DashboardState): boolean {
  return Object.values(dashboardState.components).some(c => c.gridArea === gridArea);
}

/**
 * Validate grid layout configuration
 */
export function validateGridLayout(grid: {
  columns: string;
  rows: string;
  gap: string;
  templateAreas: string[];
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if templateAreas is not empty
  if (!grid.templateAreas || grid.templateAreas.length === 0) {
    errors.push('Template areas cannot be empty');
  }

  // Check if all rows have the same number of columns
  if (grid.templateAreas.length > 0) {
    const firstRowCols = grid.templateAreas[0].split(/\s+/).length;
    for (let i = 1; i < grid.templateAreas.length; i++) {
      const cols = grid.templateAreas[i].split(/\s+/).length;
      if (cols !== firstRowCols) {
        errors.push(`Row ${i + 1} has ${cols} columns, but row 1 has ${firstRowCols} columns`);
      }
    }
  }

  // Validate CSS grid values
  if (!grid.columns) {
    errors.push('Columns value is required');
  }
  if (!grid.rows) {
    errors.push('Rows value is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generate a default grid layout
 */
export function generateDefaultGrid(rows: number, cols: number): {
  columns: string;
  rows: string;
  gap: string;
  templateAreas: string[];
} {
  const columns = Array(cols).fill('1fr').join(' ');
  const rowsStr = Array(rows).fill('auto').join(' ');
  
  // Generate sequential area names
  const templateAreas: string[] = [];
  let areaIndex = 1;
  
  for (let r = 0; r < rows; r++) {
    const rowAreas: string[] = [];
    for (let c = 0; c < cols; c++) {
      rowAreas.push(`area${areaIndex}`);
      areaIndex++;
    }
    templateAreas.push(rowAreas.join(' '));
  }

  return {
    columns,
    rows: rowsStr,
    gap: '16px',
    templateAreas
  };
}

/**
 * Get grid statistics
 */
export function getGridStats(dashboardState: DashboardState) {
  const allAreas = extractGridAreas(dashboardState.grid.templateAreas);
  const occupiedAreas = getOccupiedGridAreas(dashboardState);
  const availableAreas = getAvailableGridAreas(dashboardState);

  return {
    totalAreas: allAreas.length,
    occupiedAreas: occupiedAreas.length,
    availableAreas: availableAreas.length,
    occupancyRate: allAreas.length > 0 
      ? Math.round((occupiedAreas.length / allAreas.length) * 100) 
      : 0,
    allAreaNames: allAreas,
    occupiedAreaNames: occupiedAreas,
    availableAreaNames: availableAreas
  };
}

/**
 * Suggest next available grid area
 */
export function suggestNextGridArea(dashboardState: DashboardState): string | null {
  const available = getAvailableGridAreas(dashboardState);
  return available.length > 0 ? available[0] : null;
}
