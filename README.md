# Dashboard Builder

Full-stack dashboard builder with NestJS backend (PostgreSQL) and React frontend.

## 🚀 Quick Start

### One Command to Rule Them All

From the root directory, run:

```bash
pnpm dev
```

This will start both the server and client simultaneously!

- **Server**: http://localhost:2100
- **Client**: http://localhost:2200

## 📦 Installation

### Install All Dependencies

```bash
pnpm i
```

This installs dependencies for the root workspace AND both client and server.

### Manual Installation (if needed)

```bash
# Root
pnpm install

# Client only
pnpm run install:client

# Server only  
pnpm run install:server

# Or install all at once
pnpm run install:all
```

## 🏃 Running the Project

### Development Mode (Recommended)

```bash
pnpm dev
```

Runs both server and client in parallel with colored output.

### Run Separately

```bash
# Server only
pnpm run dev:server

# Client only
pnpm run dev:client
```

## 🗄️ Database Configuration

### PostgreSQL Connection

- **Connection String**: `postgres://postgres:postgres@localhost:5432/AI-commerce`
- **Host**: localhost
- **Port**: 5432
- **Database**: AI-commerce
- **User**: postgres
- **Password**: postgres

Make sure PostgreSQL is running and the database exists before starting the server.

## 🔌 API Endpoints

### GET /data

Fetches sample data from the database (lists tables and returns sample records).

```bash
curl http://localhost:2100/data
```

### POST /data/query

Execute custom PostgreSQL queries (supports all PostgreSQL features including extensions like PostGIS).

```bash
curl -X POST http://localhost:2100/data/query \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM your_table LIMIT 10"}'
```

## 💻 Client Usage

### Query Database Function

```typescript
import { queryDatabase } from './utils/queryDatabase';

// Execute any PostgreSQL query
const result = await queryDatabase(`
  SELECT * FROM users WHERE active = true
`);

console.log(result.data); // Query results
console.log(result.rowCount); // Number of rows
```

### PostGIS Support

If your database has PostGIS enabled:

```typescript
const result = await queryDatabase(`
  SELECT name, 
         ST_Distance(
           location::geography, 
           ST_MakePoint(-122.4194, 37.7749)::geography
         ) as distance_meters
  FROM places
  WHERE ST_DWithin(
    location::geography,
    ST_MakePoint(-122.4194, 37.7749)::geography,
    5000
  )
  ORDER BY distance_meters
`);
```

## 📁 Project Structure

```
dashboard-builder/
├── client/              # React + Vite frontend
│   ├── src/
│   │   ├── components/  # Dashboard components
│   │   ├── utils/       # Utilities including queryDatabase
│   │   ├── types/       # TypeScript types
│   │   └── App.tsx      # Main app with query examples
│   └── package.json
├── server/              # NestJS backend
│   ├── src/
│   │   ├── data/        # Data module with PostgreSQL
│   │   ├── main.ts      # Entry point
│   │   └── app.module.ts
│   └── package.json
├── package.json         # Root workspace config
└── pnpm-workspace.yaml  # PNPM workspace definition
```

## 🛠️ Available Scripts

### Root Commands

| Command | Description |
|---------|-------------|
| `pnpm i` | Install all dependencies |
| `pnpm dev` | Run both server and client |
| `pnpm run dev:server` | Run server only |
| `pnpm run dev:client` | Run client only |
| `pnpm run install:all` | Install dependencies recursively |
| `pnpm run build:client` | Build client for production |
| `pnpm run build:server` | Build server for production |

### Client Commands

```bash
cd client
pnpm run dev     # Start dev server
pnpm run build   # Build for production
pnpm run preview # Preview production build
```

### Server Commands

```bash
cd server
pnpm run dev       # Start dev server with watch mode
pnpm run start     # Start server
pnpm run build     # Build for production
```

## 🎯 Features

- ✅ **PostgreSQL Integration**: Direct database queries from the client
- ✅ **Extension Support**: PostGIS, pg_trgm, hstore, and all PostgreSQL extensions
- ✅ **Auto-refresh**: Optional data refresh intervals
- ✅ **Type-safe**: Full TypeScript support
- ✅ **CORS Enabled**: For local development
- ✅ **Monorepo Setup**: Workspace with pnpm
- ✅ **Single Command**: Run everything with `pnpm dev`

## 📚 Documentation

- **Client Utils**: See `client/src/utils/README.md` for queryDatabase documentation
- **Server API**: See `server/README.md` for API details
- **Recovery**: See `RECOVERY_SUMMARY.md` for file restoration details

## 🔧 Tech Stack

### Backend
- NestJS 10
- TypeORM
- PostgreSQL (pg driver)
- TypeScript

### Frontend
- React 18
- Vite 5
- TypeScript
- React Grid Layout

## ⚠️ Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL 14+

## 🐛 Troubleshooting

### Port Already in Use

If ports 2100 or 2200 are in use:

**Server**: Edit `server/src/main.ts` and change the port
**Client**: Edit `client/vite.config.ts` and change the port

### Database Connection Error

Make sure:
1. PostgreSQL is running
2. Database `AI-commerce` exists
3. User `postgres` with password `postgres` has access

### Module Not Found

Run from root:
```bash
pnpm install --recursive
```

## 📄 License

MIT
