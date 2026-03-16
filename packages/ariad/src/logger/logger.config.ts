import { Params } from 'nestjs-pino';

const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  '*.password',
  '*.token',
  '*.apiKey',
  '*.api_key',
  '*.secret',
];

const isDev = process.env.NODE_ENV !== 'production';

export const pinoLoggerConfig: Params = {
  pinoHttp: {
    level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),

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

    redact: {
      paths: REDACTED_PATHS,
      censor: '[REDACTED]',
    },

    genReqId: (req: any) =>
      req.headers['x-request-id'] ??
      `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,

    customSuccessMessage: (req: any, res: any) =>
      `${req.method} ${req.url} → ${res.statusCode}`,

    customErrorMessage: (req: any, res: any, err: Error) =>
      `${req.method} ${req.url} → ${res.statusCode} [${err.message}]`,

    // Sample health/screenshot polling endpoints aggressively
    customLogLevel: (req: any, res: any, err: Error | undefined) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      if (req.url?.includes('/computer-use') && req.method === 'POST') {
        // Desktop actions are high-frequency — sample 50%
        return Math.random() < 0.5 ? 'info' : 'silent';
      }
      return 'info';
    },

    serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
          remoteAddress: req.remoteAddress,
        };
      },
      res(res: any) {
        return { statusCode: res.statusCode };
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
