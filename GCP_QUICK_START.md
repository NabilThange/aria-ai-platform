# 🚀 Google Cloud Platform — Quick Start Guide

**Goal:** Deploy ARIA to Google Cloud in 1 day using FREE tier services

---

## Prerequisites

1. Google Cloud account (free tier: $300 credit for 90 days)
2. `gcloud` CLI installed: https://cloud.google.com/sdk/docs/install
3. Docker installed locally

---

## Step 1: GCP Project Setup (15 minutes)

```bash
# Login to GCP
gcloud auth login

# Create new project
gcloud projects create aria-agent-demo --name="ARIA Agent"

# Set as active project
gcloud config set project aria-agent-demo

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  storage.googleapis.com \
  firestore.googleapis.com \
  aiplatform.googleapis.com \
  secretmanager.googleapis.com \
  logging.googleapis.com

# Set default region
gcloud config set run/region us-central1
```

---

## Step 2: Secret Manager (10 minutes)

```bash
# Store Gemini API key
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-

# Grant Cloud Run access to secrets
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:$(gcloud projects describe aria-agent-demo --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Step 3: Cloud Storage (10 minutes)

```bash
# Create bucket for screenshots
gsutil mb -l us-central1 gs://aria-screenshots-$(gcloud config get-value project)

# Create bucket for task artifacts
gsutil mb -l us-central1 gs://aria-artifacts-$(gcloud config get-value project)

# Set public read access (optional, for demo)
gsutil iam ch allUsers:objectViewer gs://aria-screenshots-$(gcloud config get-value project)
```

---

## Step 4: Firestore (5 minutes)

```bash
# Create Firestore database in Native mode
gcloud firestore databases create --location=us-central1

# Create indexes (add to firestore.indexes.json)
cat > firestore.indexes.json << EOF
{
  "indexes": [
    {
      "collectionGroup": "tasks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "messages",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "taskId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "ASCENDING" }
      ]
    }
  ]
}
EOF

gcloud firestore indexes create --file=firestore.indexes.json
```

---

## Step 5: Deploy aria-agent to Cloud Run (30 minutes)

### Create cloudbuild.yaml

```yaml
# packages/aria-agent/cloudbuild.yaml
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/aria-agent:$SHORT_SHA', '-f', 'Dockerfile', '.']
  
  # Push the container image to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/aria-agent:$SHORT_SHA']
  
  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'aria-agent'
      - '--image=gcr.io/$PROJECT_ID/aria-agent:$SHORT_SHA'
      - '--region=us-central1'
      - '--platform=managed'
      - '--allow-unauthenticated'
      - '--memory=2Gi'
      - '--cpu=2'
      - '--timeout=300'
      - '--set-env-vars=NODE_ENV=production,GOOGLE_CLOUD_PROJECT=$PROJECT_ID'
      - '--set-secrets=GEMINI_API_KEY=gemini-api-key:latest'

images:
  - 'gcr.io/$PROJECT_ID/aria-agent:$SHORT_SHA'

options:
  machineType: 'E2_HIGHCPU_8'
```

### Deploy

```bash
cd packages/aria-agent

# Submit build
gcloud builds submit --config=cloudbuild.yaml

# Get service URL
gcloud run services describe aria-agent --region=us-central1 --format='value(status.url)'
```

---

## Step 6: Deploy aria-ui to Cloud Run (20 minutes)

### Create cloudbuild.yaml

```yaml
# packages/aria-ui/cloudbuild.yaml
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: 
      - 'build'
      - '-t'
      - 'gcr.io/$PROJECT_ID/aria-ui:$SHORT_SHA'
      - '-f'
      - 'Dockerfile'
      - '--build-arg'
      - 'ARIA_AGENT_BASE_URL=https://aria-agent-XXXXXX-uc.a.run.app'
      - '.'
  
  # Push the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/aria-ui:$SHORT_SHA']
  
  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'aria-ui'
      - '--image=gcr.io/$PROJECT_ID/aria-ui:$SHORT_SHA'
      - '--region=us-central1'
      - '--platform=managed'
      - '--allow-unauthenticated'
      - '--memory=1Gi'
      - '--cpu=1'

images:
  - 'gcr.io/$PROJECT_ID/aria-ui:$SHORT_SHA'
```

### Deploy

```bash
cd packages/aria-ui

# Update ARIA_AGENT_BASE_URL in cloudbuild.yaml with actual URL from Step 5

# Submit build
gcloud builds submit --config=cloudbuild.yaml

# Get service URL
gcloud run services describe aria-ui --region=us-central1 --format='value(status.url)'
```

---

## Step 7: Deploy aria-desktop (40 minutes)

**Option A: Cloud Run (Simpler, but limited GPU)**

```yaml
# packages/ariad/cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/aria-desktop:$SHORT_SHA', '-f', 'Dockerfile', '.']
  
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/aria-desktop:$SHORT_SHA']
  
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'aria-desktop'
      - '--image=gcr.io/$PROJECT_ID/aria-desktop:$SHORT_SHA'
      - '--region=us-central1'
      - '--platform=managed'
      - '--allow-unauthenticated'
      - '--memory=4Gi'
      - '--cpu=4'
      - '--timeout=3600'

images:
  - 'gcr.io/$PROJECT_ID/aria-desktop:$SHORT_SHA'
```

**Option B: Compute Engine (Better for desktop, costs ~$0.10/hour)**

```bash
# Create VM with container
gcloud compute instances create-with-container aria-desktop \
  --container-image=gcr.io/aria-agent-demo/aria-desktop:latest \
  --machine-type=n1-standard-4 \
  --zone=us-central1-a \
  --tags=http-server,https-server \
  --container-restart-policy=always \
  --container-privileged

# Create firewall rule
gcloud compute firewall-rules create allow-aria-desktop \
  --allow=tcp:9990 \
  --target-tags=http-server
```

---

## Step 8: Update Code for GCP (2 hours)

### Install GCP SDKs

```bash
cd packages/aria-agent
npm install @google-cloud/storage @google-cloud/firestore @google-cloud/logging @google-cloud/secret-manager
```

### Create Storage Service

```typescript
// packages/aria-agent/src/storage/storage.service.ts
import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
  private storage: Storage;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.storage = new Storage({
      projectId: this.configService.get('GOOGLE_CLOUD_PROJECT'),
    });
    this.bucketName = `aria-screenshots-${this.configService.get('GOOGLE_CLOUD_PROJECT')}`;
  }

  async uploadScreenshot(
    data: Buffer,
    taskId: string,
    filename: string,
  ): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(`${taskId}/${filename}`);

    await file.save(data, {
      metadata: {
        contentType: 'image/png',
        metadata: {
          taskId,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    // Return public URL
    return `https://storage.googleapis.com/${this.bucketName}/${taskId}/${filename}`;
  }

  async getScreenshot(taskId: string, filename: string): Promise<Buffer> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(`${taskId}/${filename}`);
    const [data] = await file.download();
    return data;
  }

  async listScreenshots(taskId: string): Promise<string[]> {
    const bucket = this.storage.bucket(this.bucketName);
    const [files] = await bucket.getFiles({ prefix: `${taskId}/` });
    return files.map((file) => file.name);
  }
}
```

### Create Firestore Service

```typescript
// packages/aria-agent/src/database/firestore.service.ts
import { Injectable } from '@nestjs/common';
import { Firestore } from '@google-cloud/firestore';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FirestoreService {
  private firestore: Firestore;

  constructor(private configService: ConfigService) {
    this.firestore = new Firestore({
      projectId: this.configService.get('GOOGLE_CLOUD_PROJECT'),
    });
  }

  // Tasks collection
  async createTask(data: any) {
    const docRef = this.firestore.collection('tasks').doc();
    await docRef.set({
      ...data,
      id: docRef.id,
      createdAt: Firestore.FieldValue.serverTimestamp(),
      updatedAt: Firestore.FieldValue.serverTimestamp(),
    });
    return docRef.id;
  }

  async getTask(taskId: string) {
    const doc = await this.firestore.collection('tasks').doc(taskId).get();
    return doc.exists ? doc.data() : null;
  }

  async updateTask(taskId: string, data: any) {
    await this.firestore.collection('tasks').doc(taskId).update({
      ...data,
      updatedAt: Firestore.FieldValue.serverTimestamp(),
    });
  }

  async listTasks(userId: string, limit = 50) {
    const snapshot = await this.firestore
      .collection('tasks')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map((doc) => doc.data());
  }

  // Messages collection
  async createMessage(taskId: string, data: any) {
    const docRef = this.firestore
      .collection('tasks')
      .doc(taskId)
      .collection('messages')
      .doc();
    await docRef.set({
      ...data,
      id: docRef.id,
      taskId,
      createdAt: Firestore.FieldValue.serverTimestamp(),
    });
    return docRef.id;
  }

  async listMessages(taskId: string) {
    const snapshot = await this.firestore
      .collection('tasks')
      .doc(taskId)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .get();
    return snapshot.docs.map((doc) => doc.data());
  }
}
```

### Add Cloud Logging

```typescript
// packages/aria-agent/src/main.ts
import { Logging } from '@google-cloud/logging';

const logging = new Logging();
const log = logging.log('aria-agent');

// Add middleware for request logging
app.use((req, res, next) => {
  const metadata = {
    resource: { type: 'cloud_run_revision' },
    severity: 'INFO',
  };

  const entry = log.entry(metadata, {
    httpRequest: {
      requestMethod: req.method,
      requestUrl: req.url,
      userAgent: req.headers['user-agent'],
      remoteIp: req.ip,
    },
  });

  log.write(entry);
  next();
});
```

---

## Step 9: Test End-to-End (30 minutes)

```bash
# Get all service URLs
AGENT_URL=$(gcloud run services describe aria-agent --region=us-central1 --format='value(status.url)')
UI_URL=$(gcloud run services describe aria-ui --region=us-central1 --format='value(status.url)')
DESKTOP_URL=$(gcloud run services describe aria-desktop --region=us-central1 --format='value(status.url)')

echo "Agent: $AGENT_URL"
echo "UI: $UI_URL"
echo "Desktop: $DESKTOP_URL"

# Test agent health
curl $AGENT_URL/health

# Test UI
open $UI_URL

# Create test task via UI
# Verify screenshots uploaded to Cloud Storage
gsutil ls gs://aria-screenshots-$(gcloud config get-value project)

# Check Firestore data
gcloud firestore export gs://aria-artifacts-$(gcloud config get-value project)/backup

# View logs
gcloud logging read "resource.type=cloud_run_revision" --limit=50
```

---

## Step 10: Proof of Deployment (30 minutes)

### Take Screenshots

1. **Cloud Run Services**
   - Go to: https://console.cloud.google.com/run
   - Screenshot showing aria-agent, aria-ui, aria-desktop running
   - Save as `docs/deployment/gcp-cloud-run.png`

2. **Cloud Storage Buckets**
   - Go to: https://console.cloud.google.com/storage
   - Screenshot showing aria-screenshots bucket with files
   - Save as `docs/deployment/gcp-storage.png`

3. **Firestore Collections**
   - Go to: https://console.cloud.google.com/firestore
   - Screenshot showing tasks and messages collections
   - Save as `docs/deployment/gcp-firestore.png`

4. **Cloud Logging**
   - Go to: https://console.cloud.google.com/logs
   - Screenshot showing aria-agent logs
   - Save as `docs/deployment/gcp-logging.png`

### Create Proof Document

```markdown
# docs/deployment/gcp-proof.md

# Google Cloud Platform Deployment Proof

## Project Information
- **Project ID:** aria-agent-demo
- **Region:** us-central1
- **Deployment Date:** March 8, 2026

## Services Deployed

### 1. Cloud Run
![Cloud Run Services](gcp-cloud-run.png)

**Services:**
- aria-agent: https://aria-agent-XXXXXX-uc.a.run.app
- aria-ui: https://aria-ui-XXXXXX-uc.a.run.app
- aria-desktop: https://aria-desktop-XXXXXX-uc.a.run.app

### 2. Cloud Storage
![Cloud Storage Buckets](gcp-storage.png)

**Buckets:**
- aria-screenshots-aria-agent-demo (5.2 MB, 47 objects)
- aria-artifacts-aria-agent-demo (1.8 MB, 12 objects)

### 3. Firestore
![Firestore Collections](gcp-firestore.png)

**Collections:**
- tasks (23 documents)
- messages (156 documents)

### 4. Cloud Logging
![Cloud Logging](gcp-logging.png)

**Log Entries:** 1,247 entries in last 24 hours

## Cost Analysis
- **Total Spend:** $0.00 (within free tier)
- **Estimated Monthly:** $0.00 (projected)

## Deployment Commands
```bash
# Deploy agent
gcloud builds submit --config=packages/aria-agent/cloudbuild.yaml

# Deploy UI
gcloud builds submit --config=packages/aria-ui/cloudbuild.yaml

# Deploy desktop
gcloud builds submit --config=packages/ariad/cloudbuild.yaml
```
```

---

## Step 11: Architecture Diagram (1 hour)

Create diagram using draw.io or Excalidraw:

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                            │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ARIA UI (Cloud Run)                          │
│                    Next.js Frontend                             │
│                    Port: 443                                    │
└────────────────────────────┬────────────────────────────────────┘
                             │ WebSocket + REST
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ARIA AGENT (Cloud Run)                         │
│                  NestJS Backend                                 │
│                  Port: 443                                      │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Google     │  │   Storage    │  │  Firestore   │         │
│  │   Service    │  │   Service    │  │   Service    │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Gemini 2.5     │  │  Cloud Storage  │  │   Firestore     │
│  (Vertex AI)    │  │  Screenshots    │  │   Database      │
│  Vision + Tools │  │  Artifacts      │  │   Tasks/Msgs    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
          │
          │ Computer Use Actions
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                ARIA DESKTOP (Cloud Run / GCE)                   │
│                Ubuntu 22.04 + XFCE                              │
│                Firefox + VS Code + File System                  │
│                VNC Server (Port 9990)                           │
└─────────────────────────────────────────────────────────────────┘
          │
          │ Screenshots (300ms)
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cloud Logging                                │
│                    Centralized Logs                             │
└─────────────────────────────────────────────────────────────────┘
```

Save as `docs/architecture/gcp-architecture.png`

---

## Step 12: Cost Monitoring (15 minutes)

```bash
# Set up billing alerts
gcloud billing budgets create \
  --billing-account=$(gcloud billing accounts list --format='value(name)' --limit=1) \
  --display-name="ARIA Budget Alert" \
  --budget-amount=50 \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100

# View current costs
gcloud billing accounts list
gcloud billing projects describe aria-agent-demo

# Check quota usage
gcloud compute project-info describe --project=aria-agent-demo
```

---

## Troubleshooting

### Cloud Run deployment fails
```bash
# Check build logs
gcloud builds list --limit=5
gcloud builds log <BUILD_ID>

# Check service logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=aria-agent" --limit=50
```

### Firestore permission denied
```bash
# Grant Firestore access to Cloud Run service account
gcloud projects add-iam-policy-binding aria-agent-demo \
  --member="serviceAccount:$(gcloud projects describe aria-agent-demo --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
  --role="roles/datastore.user"
```

### Cloud Storage 403 errors
```bash
# Grant Storage access
gcloud projects add-iam-policy-binding aria-agent-demo \
  --member="serviceAccount:$(gcloud projects describe aria-agent-demo --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

### Secret Manager access denied
```bash
# Grant Secret Manager access
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:$(gcloud projects describe aria-agent-demo --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Next Steps

1. ✅ Complete this quick start
2. ✅ Take screenshots for proof of deployment
3. ✅ Create architecture diagram
4. ✅ Test end-to-end on GCP
5. ✅ Record demo video showing GCP console
6. ✅ Update README.md with GCP deployment instructions
7. ✅ Submit to Devpost before March 16, 2026 @ 5:00 PM PT

---

**Estimated Total Time:** 4-6 hours  
**Total Cost:** $0 (free tier)  
**Compliance:** 100% ✅
