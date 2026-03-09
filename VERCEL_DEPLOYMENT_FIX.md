# Vercel Deployment Fix for aria-ui

## The Problem
Vercel can't access `../shared` package because it only clones the `aria-ui` directory when you set Root Directory to `packages/aria-ui`.

## ✅ SOLUTION: Deploy from Repository Root

### Step 1: Update Vercel Project Settings

1. Go to your Vercel project
2. **Settings** → **General** → **Root Directory**
3. **LEAVE IT EMPTY** (or set to `.`)
4. This makes Vercel clone the entire repository

### Step 2: Configure Build Settings

In Vercel project settings:

**Framework Preset:**
```
Next.js
```

**Build Command:**
```bash
cd packages/shared && npm install && npm run build && cd ../aria-ui && npm install && next build
```

**Output Directory:**
```
packages/aria-ui/.next
```

**Install Command:**
```bash
npm install --prefix packages/aria-ui
```

### Step 3: Add Environment Variables

Add these in Vercel → Settings → Environment Variables:

```bash
NODE_ENV=production
ARIA_AGENT_BASE_URL=https://your-aria-agent.onrender.com
ARIA_DESKTOP_VNC_URL=wss://your-aria-desktop.onrender.com/websockify
NEXT_PUBLIC_API_URL=https://your-aria-agent.onrender.com
```

### Step 4: Redeploy

Click **Deployments** → **Redeploy** (or push a new commit)

---

## Alternative: Create vercel.json in Repository Root

Create `vercel.json` in the **root** of your repository:

```json
{
  "buildCommand": "cd packages/shared && npm install && npm run build && cd ../aria-ui && npm install && next build",
  "outputDirectory": "packages/aria-ui/.next",
  "framework": "nextjs",
  "installCommand": "npm install --prefix packages/aria-ui"
}
```

Then in Vercel:
- Root Directory: **Leave empty**
- It will use the vercel.json configuration

---

## Why This Works

- Vercel clones the **entire repository** (not just aria-ui folder)
- Build command can access both `packages/shared` and `packages/aria-ui`
- Shared package is built first, then aria-ui can use it
- Output directory points to the correct location

---

## Troubleshooting

### If build still fails:

1. **Check GitHub repository structure:**
   ```
   your-repo/
   ├── packages/
   │   ├── shared/
   │   ├── aria-ui/
   │   └── aria-agent/
   ```

2. **Verify shared package builds:**
   ```bash
   cd packages/shared
   npm install
   npm run build
   # Should create dist/ folder
   ```

3. **Check aria-ui can find shared:**
   ```bash
   cd packages/aria-ui
   npm install
   # Should link @bytebot/shared from ../shared
   ```

### If you get "command not found" errors:

Use this build command instead:
```bash
npm install --prefix packages/shared && npm run build --prefix packages/shared && npm install --prefix packages/aria-ui && npm run build --prefix packages/aria-ui
```

---

## Summary

**The key is to deploy from the repository root, not from `packages/aria-ui`.**

This allows Vercel to access all packages in your monorepo.
