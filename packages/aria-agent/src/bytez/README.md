# Bytez API Key Manager

The Bytez service now supports multiple API keys with automatic fallback for improved reliability and rate limit handling.

## Configuration

### Multiple Keys (Recommended)

Add multiple keys to your `.env` file:

```env
BYTEZ_API_KEY_1=your_first_key_here
BYTEZ_API_KEY_2=your_second_key_here
BYTEZ_API_KEY_3=your_third_key_here
```

You can add as many keys as you want by incrementing the number.

### Single Key (Legacy)

The old format still works:

```env
BYTEZ_API_KEY=your_single_key_here
```

## How It Works

1. **Key Rotation**: The service starts with `BYTEZ_API_KEY_1` and automatically rotates to the next key if the current one fails.

2. **Failure Tracking**: Each key tracks its failure count. After 3 consecutive failures, a key is temporarily disabled.

3. **Auto Re-enable**: Disabled keys are automatically re-enabled after 30 minutes, giving them a chance to recover.

4. **Retry Logic**: When a request fails, the service automatically tries the next available key without requiring manual intervention.

## Features

- **Automatic Fallback**: If one key fails (rate limit, quota exceeded, etc.), the next key is used automatically
- **Smart Rotation**: Keys are rotated in sequence, distributing load across all available keys
- **Failure Protection**: Keys that fail repeatedly are temporarily disabled to prevent cascading failures
- **Auto Recovery**: Disabled keys are re-enabled after a cooldown period
- **Zero Downtime**: As long as at least one key is valid, the service continues to work

## Monitoring

The key manager logs important events:

- When keys are loaded at startup
- When a key fails and rotation occurs
- When a key is disabled due to repeated failures
- When a disabled key is re-enabled

Check your application logs for messages like:
- `Loaded X Bytez API key(s)`
- `Key Y failed (Z/3 failures)`
- `Rotated to Key Y`
- `Key Y has been disabled after 3 failures`
- `Key Y has been re-enabled after 30 minutes`

## Best Practices

1. **Use Multiple Keys**: Add at least 2-3 keys for better reliability
2. **Monitor Logs**: Watch for repeated failures that might indicate invalid keys
3. **Rotate Keys Regularly**: Update your keys periodically for security
4. **Test Failover**: Temporarily disable a key to ensure failover works as expected

## Example Setup

```env
# Production setup with 3 keys for high availability
BYTEZ_API_KEY_1=key_for_primary_usage
BYTEZ_API_KEY_2=key_for_backup_1
BYTEZ_API_KEY_3=key_for_backup_2
```

This setup ensures that even if one or two keys hit rate limits or fail, your application continues to function with the remaining key(s).
