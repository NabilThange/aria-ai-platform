import { Logger } from '@nestjs/common';

/**
 * TaskLogger — canonical log line helper.
 *
 * Wraps NestJS Logger (backed by pino) and automatically binds
 * taskId + agentName to every log entry so you never lose context.
 *
 * Best practice: one rich structured entry per significant event,
 * not a wall of plain text strings.
 */
export class TaskLogger {
  private readonly logger: Logger;
  private readonly ctx: Record<string, unknown>;

  constructor(context: string, taskId: string, agentName?: string) {
    this.logger = new Logger(context);
    this.ctx = {
      taskId,
      ...(agentName ? { agentName } : {}),
    };
  }

  /** Bind additional fields to every subsequent log call */
  withFields(fields: Record<string, unknown>): TaskLogger {
    Object.assign(this.ctx, fields);
    return this;
  }

  info(fields: Record<string, unknown>, msg: string): void {
    this.logger.log({ ...this.ctx, ...fields }, msg);
  }

  debug(fields: Record<string, unknown>, msg: string): void {
    this.logger.debug({ ...this.ctx, ...fields }, msg);
  }

  warn(fields: Record<string, unknown>, msg: string): void {
    this.logger.warn({ ...this.ctx, ...fields }, msg);
  }

  /** Structured error log — always includes stack trace */
  error(fields: Record<string, unknown>, msg: string, err?: Error): void {
    this.logger.error(
      {
        ...this.ctx,
        ...fields,
        ...(err
          ? {
              error: {
                type: err.constructor?.name,
                message: err.message,
                stack: err.stack,
              },
            }
          : {}),
      },
      msg,
    );
  }

  /**
   * Canonical log line — emit one rich summary log at the end of an operation.
   * Captures: who, what, where, why, how long, outcome.
   */
  canonical(fields: {
    event: string;
    durationMs?: number;
    outcome: 'success' | 'failure' | 'partial';
    [key: string]: unknown;
  }): void {
    this.logger.log({ ...this.ctx, ...fields }, `[CANONICAL] ${fields.event}`);
  }
}
