# Client Deployment Guide

## Environment Variables

Before deploying, make sure to set these environment variables in your deployment platform (Coolify, Netlify, Vercel, etc.):

```bash
VITE_API_URL=https://your-api-domain.com
VITE_API_BASE_PATH=/api/data
VITE_AGENT_ID=your-agent-id
VITE_AGENT_BASE_URL=https://your-agent-domain.com
```

## Coolify Deployment

This client is configured for Coolify deployment using Nixpacks with pnpm.

### Configuration Files

- **nixpacks.toml**: Configures Nixpacks to use pnpm and build the application
- **.dockerignore**: Excludes unnecessary files from the Docker image
- **package.json**: Specifies `packageManager` field for Corepack compatibility

### Build Configuration

The build process:
1. Installs Node.js 18 and Corepack
2. Enables pnpm via Corepack
3. Installs dependencies with `pnpm install --frozen-lockfile`
4. Builds the application with `pnpm build`
5. Serves static files using Caddy on `$PORT`

### Deployment Steps

1. Push your code to the repository
2. Set environment variables in Coolify
3. Deploy - Coolify will automatically use the `nixpacks.toml` configuration
4. The app will be served on the configured port

## Alternative Deployment Platforms

### Netlify

```bash
# Build command
pnpm install && pnpm build

# Publish directory
dist

# Environment variables (set in Netlify dashboard)
VITE_API_URL
VITE_API_BASE_PATH
VITE_AGENT_ID
VITE_AGENT_BASE_URL
```

### Vercel

Vercel auto-detects Vite projects. Just:
1. Import your repository
2. Set environment variables
3. Deploy

## Production Considerations

1. **Environment Variables**: Never commit `.env` files with production secrets
2. **API URLs**: Update `VITE_API_URL` and `VITE_AGENT_BASE_URL` to production endpoints
3. **CORS**: Ensure your backend allows requests from your deployed domain
4. **HTTPS**: Use HTTPS for all API endpoints in production
