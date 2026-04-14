/**
 * API configuration for production environments
 * Handles timeout and performance optimizations for Netlify
 */

export const API_CONFIG = {
  // Netlify function timeout is 30s (basic) to 60s (pro)
  // Set our limit to 28s to allow buffer for response
  FUNCTION_TIMEOUT_MS: 28000,

  // OpenAI API timeout - give it 22s to respond
  OPENAI_TIMEOUT_MS: 22000,

  // Retry configuration for failed requests
  RETRY_CONFIG: {
    maxAttempts: 2, // Reduce from 3 to avoid stacking timeouts
    initialDelayMs: 500,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
  },

  // Request headers for production
  HEADERS: {
    'Content-Type': 'application/json',
    'User-Agent': 'AppFramework-IBL/1.0',
  },
}

/**
 * Checks remaining time in a Netlify function
 * Returns percentage of time budget remaining
 */
export function getTimeRemaining(startTimeMs: number): number {
  const elapsedMs = Date.now() - startTimeMs
  const remainingMs = API_CONFIG.FUNCTION_TIMEOUT_MS - elapsedMs
  return Math.max(0, remainingMs)
}

/**
 * Checks if we should continue processing given elapsed time
 * Reserve at least 2s for cleanup/response
 */
export function canContinueProcessing(startTimeMs: number, minBufferMs: number = 2000): boolean {
  return getTimeRemaining(startTimeMs) > minBufferMs
}
