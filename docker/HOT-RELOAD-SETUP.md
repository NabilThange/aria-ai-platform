# Hot Reload Development Setup

## What This Does
Changes to your Next.js code will automatically reload in the browser **without rebuilding Docker images**. Save a file → see changes instantly!

## One-Time Setup (Already Done!)

1. ✅ Created `packages/aria-ui/Dockerfile.dev` - Development Dockerfile
2. ✅ Modified `docker-compose.yml` - Added volume mounts and dev environment
3. ✅ Configured hot reload environment variables

## How to Use

### First Time / After Adding New npm Packages
```bash
cd docker
docker-compose build aria-ui
docker-compose up aria-ui -d
```

### Daily Development (No Rebuild Needed!)
```bash
# Just start the container if it's stopped
docker-compose up aria-ui -d

# Make changes to any file in packages/aria-ui/src/
# Save the file
# Browser auto-refreshes with your changes! ⚡
```

### View Logs
```bash
docker-compose logs -f aria-ui
```

### Restart Container (if needed)
```bash
docker-compose restart aria-ui
```

### Stop Container
```bash
docker-compose stop aria-ui
```

## What's Mounted
- `packages/aria-ui/` → `/app` (your source code)
- `packages/shared/` → `/app-shared` (shared types)
- `/app/node_modules` → Protected (won't be overwritten)
- `/app/.next` → Protected (Next.js build cache)

## When to Rebuild
Only rebuild when you:
- Add/remove npm packages (modify package.json)
- Change Dockerfile.dev
- Update environment variables in docker-compose.yml

## Troubleshooting

### Changes not reflecting?
```bash
# Clear Next.js cache
docker-compose exec aria-ui rm -rf .next
docker-compose restart aria-ui
```

### Port already in use?
```bash
# Stop the container
docker-compose stop aria-ui
# Or change port in docker-compose.yml: "3000:9992" instead of "9992:9992"
```

### Module not found errors?
```bash
# Reinstall dependencies
docker-compose exec aria-ui npm install
docker-compose restart aria-ui
```

## Production Build
When ready to deploy, use the original Dockerfile:
```bash
# Edit docker-compose.yml: change Dockerfile.dev → Dockerfile
# Remove volumes section
# Change NODE_ENV to production
docker-compose build aria-ui
docker-compose up aria-ui -d
```
