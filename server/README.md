# Dashboard Builder Server

NestJS server with PostgreSQL integration for the dashboard builder application.

## Prerequisites

- Node.js installed
- PostgreSQL running on `localhost:5432`
- Database: `AI-commerce`
- Credentials: `postgres:postgres`

## Installation

Dependencies are already installed. If needed:

```bash
npm install
```

## Running the Server

Start the development server:

```bash
npm run dev
```

Or:

```bash
npm run start:dev
```

The server will run on `http://localhost:2100`

## API Endpoints

- `GET /data` - Fetches sample data from PostgreSQL database
  - Returns list of tables in the database
  - Returns sample data from the first table found

- `POST /data/query` - Execute custom PostgreSQL queries
  - Request body: `{ "query": "SELECT * FROM table_name" }`
  - Returns: `{ "success": boolean, "data": any[], "rowCount": number }`

## Database Connection

Connection string: `postgres://postgres:postgres@localhost:5432/AI-commerce`

The server will:
1. List all tables in the database
2. Fetch sample records from the first table
3. Return the data as JSON

## Custom Queries

The `/data/query` endpoint supports all PostgreSQL features including:
- Standard SQL queries
- PostgreSQL extensions (PostGIS, pg_trgm, hstore, etc.)
- CTEs, window functions, etc.

Example request:
```bash
curl -X POST http://localhost:2100/data/query \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM users LIMIT 10"}'
```

## Testing

Once the server is running, the React client will automatically fetch and log data to the browser console on load.
