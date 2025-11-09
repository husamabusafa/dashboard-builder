/**
 * Execute a PostgreSQL query through the NestJS server
 * @param query - SQL query string
 * @returns Promise with query results
 */
export async function queryDatabase(query: string) {
  try {
    const response = await fetch('http://localhost:2100/data/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Query execution failed');
    }

    return result;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
}
