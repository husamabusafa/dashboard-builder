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

### 1. Install All Dependencies

```bash
pnpm i
```

This installs dependencies for the root workspace AND both client and server.

### 2. Configure Environment Variables

#### Server Configuration

Create a `.env` file in the `server/` directory:

```bash
cd server
cp .env.example .env
```

Edit `server/.env` with your database credentials:

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

#### Client Configuration (Optional)

Create a `.env` file in the `client/` directory if you need custom API URLs or agent configuration:

```bash
cd client
cp .env.example .env
```

Edit `client/.env` if needed:

```env
VITE_API_URL=http://localhost:2100
VITE_API_BASE_PATH=/api/data

VITE_AGENT_ID=cmhijn9sv0007qggw7c4ipwm3
VITE_AGENT_BASE_URL=http://localhost:3900
```

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

The database connection is now configured via environment variables in `server/.env`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/dashboard-builder
```

Or use individual parameters:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=dashboard-builder
```

**Default values:**
- **Host**: localhost
- **Port**: 5432
- **Database**: dashboard-builder
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

**Server**: Edit `server/.env` and change the `PORT` variable
**Client**: Edit `client/vite.config.ts` and change the port

### Database Connection Error

Make sure:
1. PostgreSQL is running
2. The database specified in `server/.env` exists (default: `dashboard-builder`)
3. Database credentials in `server/.env` are correct
4. You've created the `.env` file from `.env.example`

### Module Not Found

Run from root:
```bash
pnpm install --recursive
```

## 📄 License

MIT
