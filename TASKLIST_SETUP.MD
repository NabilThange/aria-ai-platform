# Bytebot Local Setup - Coding Agent Tasklist

## 🎯 Mission
Set up and run the bytebot application locally with Docker PostgreSQL database to test the baseline functionality before Gemini integration.

---

## 📋 PREREQUISITES

**Required Software:**
- Node.js (v18 or higher)
- npm or yarn
- Docker Desktop (installed and running)
- Git

**Required Information:**
- Google API Key: `AIzaSyAtqcvJqEsfZD89Apzdo9mCNTzmZBnVots`

---

## ✅ TASK CHECKLIST

### **PHASE 1: Database Setup (Docker)**

#### Task 1.1: Verify Docker is Running
```bash
# Check Docker version
docker --version

# Check Docker is running
docker ps
```
**Expected Output:** Docker version and empty container list (or existing containers)

**If Docker is not running:** Start Docker Desktop application first

---

#### Task 1.2: Navigate to Docker Directory
```bash
# From project root
cd docker
```

---

#### Task 1.3: Start PostgreSQL Container
```bash
# Start only PostgreSQL service
docker-compose -f docker-compose.core.yml up postgres -d
```

**Expected Output:** 
```
Creating network "docker_default" with the default driver
Creating docker_postgres_1 ... done
```

---

#### Task 1.4: Verify PostgreSQL is Running
```bash
# Check if postgres container is running
docker ps

# Should see output like:
# CONTAINER ID   IMAGE         PORTS                    NAMES
# xxxxx          postgres:15   0.0.0.0:5432->5432/tcp   docker_postgres_1
```

**Wait 10 seconds for database to fully start:**
```bash
sleep 10
```

---

#### Task 1.5: Test Database Connection (Optional)
```bash
# Test connection to postgres
docker exec -it docker_postgres_1 psql -U postgres -c "SELECT version();"
```

**Expected Output:** PostgreSQL version information

---

### **PHASE 2: Backend Setup (bytebot-agent)**

#### Task 2.1: Navigate to Agent Directory
```bash
# From docker directory, go to agent
cd ../packages/bytebot-agent
```

---

#### Task 2.2: Install Dependencies
```bash
# Install all npm packages
npm install

# This may take 2-5 minutes
```

**Expected Output:** Successfully installed packages with no errors

---

#### Task 2.3: Create Environment File
```bash
# Copy example env file
cp .env.example .env
```

---

#### Task 2.4: Configure Environment Variables
```bash
# Edit .env file with the following content
cat > .env << 'EOF'
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bytebot?schema=public"

# Google AI
GOOGLE_API_KEY="AIzaSyAtqcvJqEsfZD89Apzdo9mCNTzmZBnVots"

# Server
PORT=3001
NODE_ENV=development

# Desktop Environment (if using)
DESKTOP_URL="http://localhost:3002"
EOF
```

---

#### Task 2.5: Run Database Migrations
```bash
# Generate Prisma client
npx prisma generate

# Run migrations to set up database schema
npx prisma migrate deploy
```

**Expected Output:** 
```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "bytebot"

X migrations found in prisma/migrations

Applying migration `[migration_name]`
...
The following migration(s) have been applied:

migrations/
  └─ [timestamp]_[name]/
    └─ migration.sql

All migrations have been successfully applied.
```

---

#### Task 2.6: Verify Database Tables Created
```bash
# List all tables
npx prisma studio &

# Or check via Docker
docker exec -it docker_postgres_1 psql -U postgres -d bytebot -c "\dt"
```

**Expected Output:** List of tables (Task, Message, etc.)

---

#### Task 2.7: Start Backend Server
```bash
# Start the agent in development mode
npm run start:dev
```

**Expected Output:**
```
[Nest] [timestamp]   LOG [NestFactory] Starting Nest application...
[Nest] [timestamp]   LOG [InstanceLoader] AppModule dependencies initialized
[Nest] [timestamp]   LOG [RoutesResolver] TasksController {/tasks}:
[Nest] [timestamp]   LOG [NestApplication] Nest application successfully started
[Nest] [timestamp]   LOG Application is running on: http://localhost:3001
```

**✅ Keep this terminal open - backend is running**

---

### **PHASE 3: Frontend Setup (bytebot-ui)**

#### Task 3.1: Open New Terminal
Open a NEW terminal window/tab (keep backend running in the first one)

---

#### Task 3.2: Navigate to UI Directory
```bash
# From project root
cd packages/bytebot-ui
```

---

#### Task 3.3: Install Dependencies
```bash
# Install all npm packages
npm install

# This may take 2-5 minutes
```

**Expected Output:** Successfully installed packages

---

#### Task 3.4: Create Environment File (if needed)
```bash
# Copy example if exists
cp .env.example .env 2>/dev/null || echo "No .env.example found, skipping"

# Or create minimal .env
cat > .env << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF
```

---

#### Task 3.5: Start Frontend Server
```bash
# Start Next.js development server
npm run dev
```

**Expected Output:**
```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
- event compiled client and server successfully
- wait compiling...
- event compiled successfully
```

**✅ Keep this terminal open - frontend is running**

---

### **PHASE 4: Desktop Environment (Optional - for Computer Use)**

**Note:** This is optional for initial testing. Only set up if you want to test computer use features.

#### Task 4.1: Open Third Terminal
Open another NEW terminal window/tab

---

#### Task 4.2: Start Desktop Container
```bash
# From docker directory
cd docker

# Start desktop environment
docker-compose -f docker-compose.core.yml up bytebotd -d
```

---

#### Task 4.3: Verify Desktop is Running
```bash
docker ps | grep bytebotd
```

**Expected Output:** Container running on port 3002

---

### **PHASE 5: Verification & Testing**

#### Task 5.1: Check All Services Running
```bash
# In a new terminal, check all processes

# Backend (should show Node process on port 3001)
lsof -i :3001

# Frontend (should show Node process on port 3000)
lsof -i :3000

# Database (should show Docker postgres)
docker ps | grep postgres

# Desktop (should show Docker bytebotd)
docker ps | grep bytebotd
```

---

#### Task 5.2: Open Application in Browser
```
Open: http://localhost:3000
```

**Expected:** Bytebot UI should load

---

#### Task 5.3: Test Basic Functionality

**In the browser:**

1. **Create a Task:**
   - Click "New Task" or similar button
   - Enter a prompt: "Tell me a joke"
   - Submit

2. **Check Console for Errors:**
   - Open browser DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for API calls

3. **Check Backend Terminal:**
   - Look for incoming requests
   - Check for any errors in the agent terminal

---

#### Task 5.4: Check Google Service Status

**In backend terminal, look for:**
- Any errors about missing modules
- Any errors about API keys
- Any successful AI service initialization

**Check the Google service code:**
```bash
# View the current Google service implementation
cat packages/bytebot-agent/src/google/google.service.ts

# Check if it has real implementation or just placeholder
```

---

### **PHASE 6: Troubleshooting Common Issues**

#### Issue 6.1: Database Connection Failed
```bash
# Check if postgres is actually running
docker ps | grep postgres

# Restart postgres if needed
docker-compose -f docker-compose.core.yml restart postgres

# Wait 10 seconds
sleep 10

# Try migrations again
cd ../packages/bytebot-agent
npx prisma migrate deploy
```

---

#### Issue 6.2: Port Already in Use
```bash
# Find what's using the port
lsof -i :3001  # for backend
lsof -i :3000  # for frontend

# Kill the process
kill -9 [PID]

# Or change port in .env file
```

---

#### Issue 6.3: Module Not Found Errors
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

---

#### Issue 6.4: Prisma Errors
```bash
# Regenerate Prisma client
npx prisma generate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Apply migrations again
npx prisma migrate deploy
```

---

## 📊 SUCCESS CRITERIA

### ✅ Phase 1 Complete When:
- [ ] Docker is running
- [ ] PostgreSQL container is up and healthy
- [ ] Can connect to database

### ✅ Phase 2 Complete When:
- [ ] Backend dependencies installed
- [ ] .env file configured with API key
- [ ] Database migrations applied successfully
- [ ] Backend server running on port 3001
- [ ] No critical errors in terminal

### ✅ Phase 3 Complete When:
- [ ] Frontend dependencies installed
- [ ] Frontend server running on port 3000
- [ ] UI loads in browser
- [ ] Can see the interface

### ✅ Phase 5 Complete When:
- [ ] All services running simultaneously
- [ ] Can create a task in UI
- [ ] Backend receives the request
- [ ] Can see messages/responses (even if AI errors)

---

## 🎯 DELIVERABLES

After completing all tasks, provide:

1. **Screenshot of running services:**
   - Backend terminal showing successful start
   - Frontend terminal showing successful start
   - Browser showing the UI

2. **Status report:**
   ```
   ✅ Database: Running on port 5432
   ✅ Backend: Running on port 3001
   ✅ Frontend: Running on port 3000
   ✅ UI loads successfully
   
   Current Issues (if any):
   - [List any errors or warnings]
   ```

3. **Google Service Status:**
   ```
   File: packages/bytebot-agent/src/google/google.service.ts
   
   Status: [Has implementation / Is placeholder / Has errors]
   
   First 50 lines of code:
   [Paste the beginning of google.service.ts]
   ```

---

## 📝 NOTES FOR CODING AGENT

- **Run commands in order** - don't skip steps
- **Wait for each service to start** before moving to next phase
- **Keep terminals open** - you need 2-3 terminal windows running simultaneously
- **Check for errors** after each command
- **If a step fails**, check the Troubleshooting section before proceeding
- **Document any issues** you encounter for the report

---

## 🚀 AFTER SUCCESSFUL LOCAL SETUP

Once everything is running locally and you confirm:
- ✅ UI loads
- ✅ Backend responds
- ✅ Database stores data
- ✅ Google service exists (even if minimal)

**THEN** we proceed to Phase 2: Gemini Integration Enhancement

---

## 🆘 EMERGENCY STOPS

**Stop everything:**
```bash
# Stop backend: Press Ctrl+C in backend terminal
# Stop frontend: Press Ctrl+C in frontend terminal

# Stop all Docker containers
docker-compose -f docker-compose.core.yml down

# Or stop everything at once
docker stop $(docker ps -aq)
```

**Clean restart:**
```bash
# Stop all
docker-compose -f docker-compose.core.yml down

# Remove volumes (WARNING: deletes all data)
docker-compose -f docker-compose.core.yml down -v

# Start fresh
docker-compose -f docker-compose.core.yml up postgres -d
```

---

## ✅ FINAL CHECKLIST

Before reporting completion, verify:

```
[ ] Docker Desktop is running
[ ] PostgreSQL container is running (docker ps shows it)
[ ] Backend terminal shows "Application is running on: http://localhost:3001"
[ ] Frontend terminal shows "ready started server on 0.0.0.0:3000"
[ ] Browser can load http://localhost:3000
[ ] Can create a task in the UI
[ ] Backend terminal shows incoming requests
[ ] No critical errors in any terminal
[ ] google.service.ts file examined and status documented
```

**Once all checked, you're ready for Phase 2: Gemini Integration!**