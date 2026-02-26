/**
 * Server-side logger utility.
 * Only logs in development mode to keep production clean.
 * console.error is always logged (for monitoring/debugging critical failures).
 */

const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: any[]) => {
    // Always log errors — these indicate real problems
    console.error(...args);
  },
  /** Debug: only in development, with [DEBUG] prefix */
  debug: (...args: any[]) => {
    if (isDev) console.log('[DEBUG]', ...args);
  },
};
