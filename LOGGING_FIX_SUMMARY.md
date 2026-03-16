# Logging Fix - Prevent Base64 Image Data Dumps

## Problem

Logs were showing 100K+ lines of base64 image data, making logs unreadable and consuming massive disk space.

## Root Cause

Several places in the code were using `JSON.stringify()` on objects that contained base64-encoded images without filtering them first.

## Fixes Applied

### 1. agent.computer-use.ts (Line 37-48)

**Before:**
```typescript
logger.log(`📥 Tool Input: ${JSON.stringify(block.input)}`);
```

**After:**
```typescript
// Log input safely - avoid logging large base64 image data
const inputPreview = { ...block.input };
if (inputPreview.image && typeof inputPreview.image === 'string' && inputPreview.image.length > 100) {
  inputPreview.image = `[base64 image data: ${(inputPreview.image.length / 1024).toFixed(1)}KB]`;
}
if (inputPreview.data && typeof inputPreview.data === 'string' && inputPreview.data.length > 100) {
  inputPreview.data = `[base64 data: ${(inputPreview.data.length / 1024).toFixed(1)}KB]`;
}
logger.log(`📥 Tool Input: ${JSON.stringify(inputPreview)}`);
```

### 2. desktop.agent.ts (Line 648-650)

**Before:**
```typescript
this.logger.debug(`   Tool input: ${JSON.stringify(input)}`);
```

**After:**
```typescript
// Log input safely - avoid logging large data
const inputPreview = { ...input };
if (inputPreview.image && typeof inputPreview.image === 'string' && inputPreview.image.length > 100) {
  inputPreview.image = `[base64 image: ${(inputPreview.image.length / 1024).toFixed(1)}KB]`;
}
this.logger.debug(`   Tool input: ${JSON.stringify(inputPreview)}`);
```

### 3. web.agent.ts (Line 325-327)

**Before:**
```typescript
this.logger.debug(`   Tool input: ${JSON.stringify(input)}`);
```

**After:**
```typescript
// Log input safely - avoid logging large data
const inputPreview = { ...input };
if (inputPreview.image && typeof inputPreview.image === 'string' && inputPreview.image.length > 100) {
  inputPreview.image = `[base64 image: ${(inputPreview.image.length / 1024).toFixed(1)}KB]`;
}
this.logger.debug(`   Tool input: ${JSON.stringify(inputPreview)}`);
```

### 4. bytez.service.ts (Line 481-502)

**Before:**
```typescript
this.logger.warn(`Invalid content part (not an object): ${JSON.stringify(part)}`);
this.logger.warn(`Content part missing type: ${JSON.stringify(part)}`);
this.logger.warn(`Text content part missing text field: ${JSON.stringify(part)}`);
this.logger.error(`All content parts were invalid! Original parts: ${JSON.stringify(contentParts)}`);
```

**After:**
```typescript
this.logger.warn(`Invalid content part (not an object): ${typeof part}`);
this.logger.warn(`Content part missing type`);
this.logger.warn(`Text content part missing text field`);
this.logger.error(`All content parts were invalid! Count: ${contentParts.length}, Types: ${contentParts.map(p => p?.type || 'unknown').join(', ')}`);
```

## Already Safe

### bytez.service.ts (Line 135-157)

This section was already handling images correctly:

```typescript
if (part.type === 'image') {
  // Don't log full image data - just log that it exists
  const dataSize = part.source?.data ? `${(part.source.data.length / 1024).toFixed(1)}KB` : 'unknown';
  this.logger.debug(`      Part ${partIdx}: type=image, media_type=${part.source?.media_type}, size=${dataSize}`);
}
```

### base.agent.ts (Line 42, 57)

Already truncates output to 200 characters:

```typescript
this.logger.debug(`📥 [${this.agentName}] Input: ${JSON.stringify(input).substring(0, 200)}...`);
this.logger.debug(`📤 [${this.agentName}] Output: ${JSON.stringify(result.data).substring(0, 200)}...`);
```

## Result

Now when images are logged, you'll see:
- `[base64 image data: 45.2KB]` instead of 45KB of base64 text
- `[base64 image: 128.7KB]` instead of 128KB of base64 text
- Image size information for debugging
- Clean, readable logs

## Testing

To verify the fix works:
1. Run a task that involves screenshots
2. Check logs - should see `[base64 image: XXkB]` instead of massive base64 dumps
3. Log files should be much smaller (KB instead of MB)

## Best Practices Going Forward

When logging objects that might contain images:

✅ **DO:**
```typescript
const preview = { ...obj };
if (preview.image?.length > 100) {
  preview.image = `[base64 image: ${(preview.image.length / 1024).toFixed(1)}KB]`;
}
logger.log(JSON.stringify(preview));
```

❌ **DON'T:**
```typescript
logger.log(JSON.stringify(obj)); // Might dump huge base64 strings
```

✅ **DO:**
```typescript
logger.log(`Image size: ${image.length} bytes`);
```

❌ **DON'T:**
```typescript
logger.log(`Image data: ${image}`); // Dumps entire base64 string
```
