import { Params } from 'nestjs-pino';

/**
 * Redact sensitive fields from all log output.
 * These paths follow pino's redact syntax.
 */
const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.token',
  'req.body.apiKey',
  'req.body.api_key',
  'req.body.secret',
  '*.password',
  '*.token',
  '*.apiKey',
  '*.api_key',
  '*.secret',
  '*.accessToken',
  '*.refreshToken',
];

const isDev = process.env.NODE_ENV !== 'production';

// Check if pino-pretty is available (only in dev, not in production Docker)
let hasPinoPretty = false;
try {
  require.resolve('pino-pretty');
  hasPinoPretty = true;
} catch {
  hasPinoPretty = false;
}

/**
 * Per-service log level configuration
 * Reduces noise from verbose services while keeping critical logs
 */
const SERVICE_LOG_LEVELS: Record<string, string> = {
  'BytezService': 'warn',              // Only warnings and errors
  'BytezKeyManagerService': 'info',    // Key rotations and errors only
  'GroqService': 'warn',               // Only warnings and errors
  'GroqKeyManagerService': 'info',     // Key rotations and errors only
  'GoogleService': 'warn',             // Only warnings and errors
  'MessagesService': 'warn',           // Reduce message processing noise
  'AgentExecution': 'info',            // Agent execution logs (via AgentLogger)
  'UserInteraction': 'info',           // User request logs
};

/**
 * Get effective log level for a given context/service
 */
function getLogLevel(context?: string): string {
  if (context && SERVICE_LOG_LEVELS[context]) {
    return SERVICE_LOG_LEVELS[context];
  }
  return process.env.LOG_LEVEL ?? (isDev ? 'info' : 'info');
}

export const pinoLoggerConfig: Params = {
  pinoHttp: {
    // Use LOG_LEVEL env var, default to 'info' (changed from 'debug' in dev)
    level: process.env.LOG_LEVEL ?? 'info',

    // Structured JSON in prod, pretty-printed in dev (only if pino-pretty is available)
    transport: isDev && hasPinoPretty
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: false,
            translateTime: 'SYS:HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        }
      : undefined,

    // Redact sensitive fields — best sensitive data leak is the one that never happens
    redact: {
      paths: REDACTED_PATHS,
      censor: '[REDACTED]',
    },

    // Don't add request context to every log - only to HTTP request logs
    // This prevents req: {...} from appearing on agent execution logs
    customProps: () => ({}),

    // Assign request IDs for tracing across microservices
    genReqId: (req: any) => {
      return (
        req.headers['x-request-id'] ??
        req.headers['x-correlation-id'] ??
        `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      );
    },

    // Customize what gets logged on each request (canonical log line per request)
    customSuccessMessage: (req: any, res: any) =>
      `${req.method} ${req.url} → ${res.statusCode}`,

    customErrorMessage: (req: any, res: any, err: Error) =>
      `${req.method} ${req.url} → ${res.statusCode} [${err.message}]`,

    // Sampling: in high-traffic paths, only log a % of successful 2xx requests
    // Keep ALL errors and warnings regardless
    customLogLevel: (req: any, res: any, err: Error | undefined) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      // Sample 10% of successful health-check / polling endpoints (reduced from 20%)
      if (req.url?.includes('/health') || req.url?.includes('/status')) {
        return Math.random() < 0.1 ? 'debug' : 'silent';
      }
      // Reduce noise from frequent polling endpoints
      if (req.url?.includes('/tasks') && req.method === 'GET') {
        return 'debug'; // Move task polling to debug level
      }
      return 'info';
    },

    // Simplified serializers - only include essential info
    serializers: {
      req(req: any) {
        return {
          method: req.method,
          url: req.url,
        };
      },
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
      err(err: any) {
        return {
          type: err.constructor?.name,
          message: err.message,
          stack: err.stack,
        };
      },
    },
  },
};
