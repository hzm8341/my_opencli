/**
 * CliError → MCP error format conversion.
 */

import {
  CliError,
  ArgumentError,
  AuthRequiredError,
  BrowserConnectError,
  TimeoutError,
  EmptyResultError,
  CommandExecutionError,
} from '../errors.js';

export interface McpError {
  code: string;
  message: string;
  data?: unknown;
}

export function toMcpError(err: unknown): McpError {
  if (err instanceof ArgumentError) {
    return { code: 'INVALID_ARGUMENT', message: err.message, data: { hint: err.hint } };
  }
  if (err instanceof AuthRequiredError) {
    return { code: 'AUTHENTICATION_REQUIRED', message: err.message, data: { domain: err.domain } };
  }
  if (err instanceof BrowserConnectError) {
    return { code: 'SERVICE_UNAVAILABLE', message: err.message, data: { hint: err.hint } };
  }
  if (err instanceof TimeoutError) {
    return { code: 'TIMEOUT', message: err.message };
  }
  if (err instanceof EmptyResultError) {
    return { code: 'EMPTY_RESULT', message: err.message };
  }
  if (err instanceof CommandExecutionError) {
    return { code: 'INTERNAL_ERROR', message: err.message, data: { hint: err.hint } };
  }
  if (err instanceof CliError) {
    return { code: err.code, message: err.message, data: { hint: err.hint } };
  }

  // Generic Error
  const message = err instanceof Error ? err.message : String(err);
  return { code: 'INTERNAL_ERROR', message };
}
