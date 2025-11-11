# Dashboard Builder Server

NestJS server with PostgreSQL integration for the dashboard builder application.

## Prerequisites

- Node.js installed
- PostgreSQL running on `localhost:5432`
- Database: `dashboard-builder` (or your custom database)

## Installation

1. Install dependencies:

```bash
pnpm install
```

2. Create a `.env` file from the example:

```bash
cp .env.example .env
```

3. Update the `.env` file with your database credentials:

```env
PORT=2100

DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=dashboard-builder

DATABASE_URL=postgres://postgres:postgres@localhost:5432/dashboard-builder
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

The database connection is configured via environment variables in the `.env` file. The server supports both individual connection parameters and a full connection URL:

- `DATABASE_URL` - Full PostgreSQL connection string (recommended)
- Or individual parameters: `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE_NAME`

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
