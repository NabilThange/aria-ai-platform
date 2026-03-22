# How to Start aria-agent Server

The aria-agent server (with workflows) is NOT currently running. You need to start it.

## Start the Server

### Option 1: Development Mode (with auto-reload)
```bash
cd packages/aria-agent
npm run start:dev
```

### Option 2: Production Mode
```bash
cd packages/aria-agent
npm run start:prod
```

### Option 3: Simple Start
```bash
cd packages/aria-agent
npm start
```

## Verify It's Running

Once started, the server should be on port **9991** (or whatever PORT env var is set).

Test with:
```bash
curl http://localhost:9991/
```

Should return: "Hello World!" or similar

## Test Workflows Endpoint

```bash
curl http://localhost:9991/workflows
```

Should return JSON array of workflows:
```json
[
  {
    "name": "google-search",
    "description": "Search Google for a query and return results",
    ...
  },
  ...
]
```

## Current Ports in Use

- **9990**: ariad (desktop automation service)
- **9992**: Frontend (Next.js UI)
- **9991**: aria-agent (NEEDS TO BE STARTED)

## Troubleshooting

If you get errors about Prisma:
```bash
cd packages/aria-agent
npx prisma generate
npx prisma migrate deploy
```

If you get build errors:
```bash
cd packages/aria-agent
npm run build
```
