/**
 * Utility functions for handling promise timeouts and error boundaries
 * to prevent indefinite hangs in the application.
 */

/**
 * Wraps a promise with a timeout. If the promise doesn't resolve/reject
 * within the specified time, it will be rejected with a timeout error.
 *
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds (default: 30000ms = 30s)
 * @param errorMessage - Custom error message for timeout
 * @returns Promise that resolves/rejects with the original promise or times out
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000,
  errorMessage: string = "Operation timed out"
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`${errorMessage} (after ${timeoutMs}ms)`));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Wraps a promise with both timeout and fallback value on error.
 * Useful for non-critical operations that shouldn't block the UI.
 *
 * @param promise - The promise to wrap
 * @param fallbackValue - Value to return if promise fails or times out
 * @param timeoutMs - Timeout in milliseconds (default: 30000ms = 30s)
 * @param errorMessage - Custom error message for timeout
 * @returns Promise that always resolves (with result or fallback)
 */
export function withTimeoutAndFallback<T>(
  promise: Promise<T>,
  fallbackValue: T,
  timeoutMs: number = 30000,
  errorMessage: string = "Operation timed out"
): Promise<T> {
  return withTimeout(promise, timeoutMs, errorMessage).catch((error) => {
    console.error(`[PromiseTimeout] ${errorMessage}:`, error);
    return fallbackValue;
  });
}

/**
 * Error class for identifying timeout errors
 */
export class TimeoutError extends Error {
  constructor(message: string, public timeoutMs: number) {
    super(message);
    this.name = "TimeoutError";
  }
}

/**
 * Enhanced timeout wrapper that throws a specific TimeoutError
 */
export function withTimeoutError<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000,
  errorMessage: string = "Operation timed out"
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new TimeoutError(`${errorMessage} (after ${timeoutMs}ms)`, timeoutMs));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}
