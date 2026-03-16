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

export const pinoLoggerConfig: Params = {
  pinoHttp: {
    // Use LOG_LEVEL env var, default to 'info' in prod, 'debug' in dev
    level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),

    // Structured JSON in prod, pretty-printed in dev
    transport: isDev
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

    // Canonical request log: enrich every HTTP request log with useful context
    customProps: (req: any) => ({
      requestId: req.id,
      userId: req.headers['x-user-id'] ?? undefined,
    }),

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
      // Sample 20% of successful health-check / polling endpoints
      if (req.url?.includes('/health') || req.url?.includes('/status')) {
        return Math.random() < 0.2 ? 'debug' : 'silent';
      }
      return 'info';
    },

    // Serialize request/response for structured output
    serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
          userAgent: req.headers?.['user-agent'],
          remoteAddress: req.remoteAddress,
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
          code: err.code,
        };
      },
    },
  },
};
