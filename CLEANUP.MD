# Bytebot Cleanup & Gemini Migration - Coding Agent Brief

## 🎯 Mission Overview

We're participating in the **Google Gemini Live Agent Challenge** ($80K prize pool). We've forked the bytebot open-source computer use agent and need to:

1. **PHASE 1 (NOW)**: Clean up unnecessary code and dependencies
2. **PHASE 2**: Migrate to Gemini 2.0 + Google Cloud
3. **PHASE 3**: Deploy to Google Cloud Run
4. **PHASE 4**: Add innovations (avatar, voice, rebrand)

---

## 🏆 Hackathon Requirements (Must Meet ALL)

### Mandatory Technical Requirements:
- ✅ **Use Gemini Model** (Google's AI) - we'll migrate from Claude/OpenAI
- ✅ **Use Google GenAI SDK or ADK** - we'll use `google-generativeai` + Vertex AI
- ✅ **Use Google Cloud Service** - Cloud Run, Cloud Storage, Vertex AI
- ✅ **Backend on Google Cloud** - will deploy to Cloud Run
- ✅ **Category: Live Agents** - must use Gemini Live API for real-time interaction

### Judging Criteria:
- **40%** - Innovation & Multimodal UX
- **30%** - Technical Implementation
- **30%** - Demo Quality

---

## 📋 PHASE 1: CLEANUP TASKS

### Goal: Remove ALL non-Gemini AI provider code to prepare for pure Gemini integration

---

## 🗑️ FILES TO DELETE ENTIRELY

### 1. AI Provider Modules (Keep ONLY Google)
```
DELETE:
- packages/bytebot-agent/src/anthropic/
  ├── anthropic.constants.ts
  ├── anthropic.module.ts
  ├── anthropic.service.ts
  └── anthropic.tools.ts

- packages/bytebot-agent/src/openai/
  ├── openai.constants.ts
  ├── openai.module.ts
  ├── openai.service.ts
  └── openai.tools.ts

- packages/bytebot-agent/src/proxy/
  ├── proxy.module.ts
  ├── proxy.service.ts
  └── proxy.tools.ts

KEEP:
- packages/bytebot-agent/src/google/
  (We'll expand this for full Gemini integration)
```

### 2. LLM Proxy (Not Needed)
```
DELETE ENTIRE DIRECTORY:
- packages/bytebot-llm-proxy/
  (LiteLLM proxy - we'll call Gemini directly)
```

### 3. Claude Code Integration
```
DELETE:
- packages/bytebot-agent-cc/
  (Claude Code specific - not needed for Gemini)
```

### 4. Docker Files for Removed Services
```
DELETE:
- docker/docker-compose-claude-code.yml
- docker/docker-compose.proxy.yml

KEEP & WILL MODIFY:
- docker/docker-compose.yml
- docker/docker-compose.development.yml
- docker/bytebot-desktop.Dockerfile
- packages/bytebot-agent/Dockerfile
- packages/bytebot-ui/Dockerfile
```

### 5. Helm Charts for Removed Services
```
DELETE:
- helm/charts/bytebot-llm-proxy/
- helm/values-proxy.yaml

KEEP:
- helm/charts/bytebot-agent/
- helm/charts/bytebot-desktop/
- helm/charts/bytebot-ui/
- helm/charts/postgresql/
```

---

## ✏️ FILES TO MODIFY

### 1. **packages/bytebot-agent/src/app.module.ts**
```typescript
// REMOVE imports for:
- AnthropicModule
- OpenAIModule  
- ProxyModule

// KEEP:
- GoogleModule
- AgentModule
- TasksModule
- MessagesModule
- PrismaModule
- SummariesModule
```

### 2. **packages/bytebot-agent/package.json**
```json
// REMOVE dependencies:
- @anthropic-ai/sdk
- openai (the OpenAI SDK)
- litellm-related packages

// KEEP/ADD:
- @google/generative-ai (if not present)
- @google-cloud/aiplatform (for Vertex AI)
- @google-cloud/storage
```

### 3. **packages/bytebot-agent/.env.example**
```bash
# REMOVE:
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
LITELLM_PROXY_URL=

# KEEP/ADD:
GOOGLE_API_KEY=
GOOGLE_CLOUD_PROJECT=
GOOGLE_APPLICATION_CREDENTIALS=
```

### 4. **packages/bytebot-agent/src/agent/agent.module.ts**
```typescript
// UPDATE imports to remove:
- AnthropicModule
- OpenAIModule
- ProxyModule

// Keep only GoogleModule
```

### 5. **packages/bytebot-agent/src/agent/agent.processor.ts**
This is the CORE file where AI integration happens.

```typescript
// CURRENT STATE (likely has):
- Anthropic service calls
- OpenAI service calls
- Proxy service calls

// FUTURE STATE (Phase 2):
- Only Google/Gemini service calls
- Will use Gemini 2.0 Flash with vision
- Will integrate Gemini Live API
```

**For Phase 1**: Just remove references to anthropic/openai/proxy services

### 6. **docker-compose.yml Files**
```yaml
# REMOVE services:
- llm-proxy
- claude-code-agent

# KEEP services:
- bytebot-agent
- bytebot-ui
- bytebotd (desktop environment)
- postgres
```

### 7. **README.md**
```markdown
# UPDATE to mention:
- "Powered by Google Gemini 2.0"
- Remove references to Claude/OpenAI
- Add note: "Adapted for Google Gemini Live Agent Challenge"
```

---

## 📦 DEPENDENCIES TO REVIEW

### package.json Files to Check:

**packages/bytebot-agent/package.json**
- Remove: `@anthropic-ai/sdk`, `openai`
- Add if missing: `@google/generative-ai`, `@google-cloud/aiplatform`

**packages/bytebot-ui/package.json**
- Should be fine (just frontend)

**packages/bytebotd/package.json**
- Should be fine (desktop environment)

---

## 🎯 SUCCESS CRITERIA FOR PHASE 1

After cleanup, the codebase should:

1. ✅ **No Anthropic code** - completely removed
2. ✅ **No OpenAI code** - completely removed  
3. ✅ **No proxy code** - completely removed
4. ✅ **Google module intact** - ready for expansion
5. ✅ **Compiles successfully** - no broken imports
6. ✅ **Reduced size** - lighter codebase
7. ✅ **Clear architecture** - only Gemini path forward

---

## 🔄 AFTER PHASE 1 CLEANUP

**Phase 2** will involve:
1. Expanding `packages/bytebot-agent/src/google/` to use Gemini 2.0 Flash
2. Implementing Gemini Live API for voice interaction
3. Adding Vertex AI integration
4. Updating `agent.processor.ts` with Gemini logic

**Phase 3** will be:
1. Creating Cloud Run deployment configs
2. Setting up Google Cloud Storage
3. Deploying to GCP
4. Recording deployment proof

**Phase 4** will add:
1. Avatar frontend integration
2. Voice input/output
3. Rebranding
4. Custom features

---

## 🚨 IMPORTANT NOTES

### What NOT to Delete:
- `packages/bytebot-agent/src/google/` - **CRITICAL - KEEP THIS**
- `packages/bytebotd/` - Desktop environment (needed)
- `packages/bytebot-ui/` - Frontend (needed)
- `packages/shared/` - Shared types (needed)
- Database migrations in `prisma/`
- Agent core logic in `agent/`

### What to Be Careful With:
- `agent.processor.ts` - Core agent logic, just remove AI provider references
- `agent.tools.ts` - Tool definitions, should be provider-agnostic
- `agent.computer-use.ts` - Computer use logic, keep intact

### Git Strategy:
```bash
# Create cleanup branch
git checkout -b cleanup-for-gemini

# After cleanup
git add .
git commit -m "Phase 1: Remove non-Gemini AI providers (Anthropic, OpenAI, Proxy)"
git push origin cleanup-for-gemini
```

---

## 📝 CLEANUP CHECKLIST

Use this to track progress:

```
[ ] Delete packages/bytebot-agent/src/anthropic/
[ ] Delete packages/bytebot-agent/src/openai/
[ ] Delete packages/bytebot-agent/src/proxy/
[ ] Delete packages/bytebot-llm-proxy/
[ ] Delete packages/bytebot-agent-cc/
[ ] Delete docker/docker-compose-claude-code.yml
[ ] Delete docker/docker-compose.proxy.yml
[ ] Delete helm/charts/bytebot-llm-proxy/
[ ] Delete helm/values-proxy.yaml
[ ] Update packages/bytebot-agent/src/app.module.ts
[ ] Update packages/bytebot-agent/package.json
[ ] Update packages/bytebot-agent/.env.example
[ ] Update packages/bytebot-agent/src/agent/agent.module.ts
[ ] Update packages/bytebot-agent/src/agent/agent.processor.ts
[ ] Update docker-compose.yml files
[ ] Update README.md
[ ] Remove unused dependencies
[ ] Test compilation: npm run build
[ ] Commit changes
```

---

## 🎬 EXECUTION ORDER

1. **Backup first**: `git checkout -b cleanup-for-gemini`
2. **Delete directories** (anthropic, openai, proxy, llm-proxy, agent-cc)
3. **Delete docker/helm files** for removed services
4. **Update imports** in module files
5. **Update package.json** files
6. **Update .env.example** files
7. **Update agent.processor.ts** (remove provider calls, keep structure)
8. **Update README.md**
9. **Run build test**: `cd packages/bytebot-agent && npm run build`
10. **Commit and push**

---

## 📊 EXPECTED OUTCOME

**Before Cleanup:**
- 3 AI providers (Anthropic, OpenAI, Proxy)
- LLM proxy service
- Claude Code integration
- Complex multi-provider architecture

**After Cleanup:**
- 1 AI provider (Google/Gemini) - ready to expand
- Direct Gemini integration
- Simplified architecture
- Ready for Phase 2 (full Gemini migration)

---

## 🤝 NEXT STEPS AFTER CLEANUP

Once cleanup is complete, we'll move to **Phase 2: Gemini Integration**, where we'll:

1. Expand `google.service.ts` to use Gemini 2.0 Flash
2. Implement vision capabilities for screenshot analysis
3. Add Gemini Live API for voice interaction
4. Integrate with Vertex AI (for GCP points)
5. Test end-to-end flow

---

## ❓ QUESTIONS TO ASK IF STUCK

- "Is this file imported anywhere?" - Check before deleting
- "Does this module have dependencies?" - Trace the imports
- "Will this break the build?" - Test compile after changes
- "Is this related to core agent logic?" - Be careful with agent/ files

---

## 🎯 REMEMBER THE GOAL

We're building a **Google Gemini-powered computer use agent** to win the hackathon. This cleanup is essential to:

1. Remove technical debt (unused providers)
2. Simplify the codebase
3. Prepare for pure Gemini integration
4. Make deployment to GCP easier
5. Show judges we built with Gemini (not just API key swap)

**Let's clean this up and get ready for Gemini! 🚀**