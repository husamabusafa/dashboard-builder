# Database Query Utility

## Usage

The `queryDatabase` function allows you to execute custom PostgreSQL queries from the client.

### Import

```typescript
import { queryDatabase } from './utils/queryDatabase';
```

### Function Signature

```typescript
async function queryDatabase(query: string): Promise<{
  success: boolean;
  data: any[];
  rowCount: number;
  error?: string;
}>
```

### Examples

#### Simple SELECT Query

```typescript
const result = await queryDatabase('SELECT * FROM users LIMIT 10');
console.log(result.data); // Array of rows
console.log(result.rowCount); // Number of rows returned
```

#### Query with WHERE Clause

```typescript
const result = await queryDatabase(`
  SELECT id, name, email 
  FROM users 
  WHERE created_at > '2024-01-01'
`);
console.log(result.data);
```

#### Aggregate Query

```typescript
const result = await queryDatabase(`
  SELECT COUNT(*) as total, status 
  FROM orders 
  GROUP BY status
`);
console.log(result.data);
```

#### JOIN Query

```typescript
const result = await queryDatabase(`
  SELECT u.name, o.order_id, o.total 
  FROM users u
  JOIN orders o ON u.id = o.user_id
  WHERE o.total > 100
`);
console.log(result.data);
```

#### PostGIS Query (if PostGIS extension is enabled)

```typescript
// Find locations within a radius
const result = await queryDatabase(`
  SELECT name, address, 
         ST_Distance(
           location::geography, 
           ST_MakePoint(-122.4194, 37.7749)::geography
         ) as distance_meters
  FROM places
  WHERE ST_DWithin(
    location::geography,
    ST_MakePoint(-122.4194, 37.7749)::geography,
    5000  -- 5km radius
  )
  ORDER BY distance_meters
`);
console.log(result.data);
```

### Error Handling

```typescript
try {
  const result = await queryDatabase('SELECT * FROM products');
  if (result.success) {
    console.log('Query successful:', result.data);
  }
} catch (error) {
  console.error('Query failed:', error);
}
```

### Important Notes

- All queries are executed on the PostgreSQL database at: `postgres://postgres:postgres@localhost:5432/AI-commerce`
- The server must be running on `http://localhost:2100`
- Only SELECT queries are recommended for safety
- Supports all PostgreSQL extensions (PostGIS, pg_trgm, hstore, etc.)
- Use parameterized queries on the server side for production use
