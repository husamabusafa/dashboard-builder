# Quick Start Guide

## 🚀 Start Everything in 2 Steps

### 1. Install Dependencies

```bash
pnpm i
```

### 2. Run the Application

```bash
pnpm dev
```

That's it! 🎉

## What's Running?

- **NestJS Server** → http://localhost:2100
- **React Client** → http://localhost:2200

## Test the Database Connection

1. Open http://localhost:2200 in your browser
2. Open the browser console (F12)
3. You should see PostgreSQL data logged:
   - "Data from PostgreSQL:" - Sample data
   - "Custom Query - Tables:" - List of database tables

## Execute Custom Queries

In your React components:

```typescript
import { queryDatabase } from './utils/queryDatabase';

const result = await queryDatabase('SELECT * FROM your_table');
console.log(result.data);
```

## Stop the Application

Press `Ctrl+C` in the terminal where `pnpm dev` is running.

## Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Check [client/src/utils/README.md](./client/src/utils/README.md) for query examples
- See [server/README.md](./server/README.md) for API documentation

## Troubleshooting

**Connection Error?**
- Make sure PostgreSQL is running
- Check database `AI-commerce` exists
- Verify connection: `postgres://postgres:postgres@localhost:5432/AI-commerce`

**Port Already in Use?**
- Server: Edit `server/src/main.ts` (default: 2100)
- Client: Edit `client/vite.config.ts` (default: 2200)

**Module Not Found?**
```bash
pnpm install --recursive
```
