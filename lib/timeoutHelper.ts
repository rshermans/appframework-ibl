/**
 * Timeout helper for API calls
 * Prevents long-running requests from exceeding Netlify's 30s limit
 */

export class TimeoutError extends Error {
  constructor(message: string = 'Request timeout') {
    super(message)
    this.name = 'TimeoutError'
  }
}

export interface TimeoutConfig {
  timeoutMs?: number
  abortSignal?: AbortSignal
}

const DEFAULT_TIMEOUT_MS = 25000 // 25 seconds (Netlify limit is 30s)

/**
 * Wraps a promise with a timeout
 * Throws TimeoutError if promise doesn't resolve within timeoutMs
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  config: TimeoutConfig = {}
): Promise<T> {
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const controller = config.abortSignal ? undefined : new AbortController()
  const abortSignal = config.abortSignal ?? controller?.signal

  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timeoutId = setTimeout(() => {
        if (controller) {
          controller.abort()
        }
        reject(new TimeoutError(`Request timeout after ${timeoutMs}ms`))
      }, timeoutMs)

      // Clear timeout if promise resolves first
      promise
        .then(
          () => clearTimeout(timeoutId),
          () => clearTimeout(timeoutId)
        )
        .catch(() => {}) // Ignore errors from clearing timeout
    }),
  ])
}

/**
 * Creates an abort signal with timeout
 * Useful for fetch and other APIs that accept AbortSignal
 */
export function createTimeoutSignal(timeoutMs: number = DEFAULT_TIMEOUT_MS): AbortSignal {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

/**
 * Checks if an error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  return error instanceof TimeoutError || (error instanceof Error && error.name === 'TimeoutError')
}

/**
 * Checks if an error is due to abort/timeout
 */
export function isAbortedError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
