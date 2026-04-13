/**
 * Intelligent retry helper with exponential backoff.
 * Automatically retries failed requests without blocking UI.
 */

export interface RetryConfig {
  maxAttempts?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  let lastError: Error | null = null
  let delayMs = cfg.initialDelayMs

  for (let attempt = 1; attempt <= cfg.maxAttempts; attempt++) {
    try {
      console.log(`[Retry] Attempt ${attempt}/${cfg.maxAttempts}`)
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.warn(`[Retry] Attempt ${attempt} failed:`, lastError.message)

      if (attempt < cfg.maxAttempts) {
        const actualDelay = Math.min(delayMs, cfg.maxDelayMs)
        console.log(`[Retry] Waiting ${actualDelay}ms before retry...`)
        await new Promise((resolve) => setTimeout(resolve, actualDelay))
        delayMs = Math.min(delayMs * cfg.backoffMultiplier, cfg.maxDelayMs)
      }
    }
  }

  throw lastError || new Error('Retry failed: unknown error')
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryConfig: RetryConfig = {}
): Promise<Response> {
  return retryWithBackoff(() => fetch(url, options), retryConfig)
}
