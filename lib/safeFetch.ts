import { readPersistedWizardState } from '@/lib/persistStorage'
import { aiActivity } from '@/lib/aiActivity'

/** Tunable so tests do not wait between attempts. */
export const fetchPatience = { delayMs: 1500, aiAttempts: 3, searchAttempts: 2, attemptTimeoutMs: 45000 }

class HttpStatusError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
  }
}

/** Gateway timeouts, overload and dropped connections are worth another try; 4xx never are. */
function isRetryable(error: unknown, status?: number): boolean {
  if (status === 429 || status === 502 || status === 503 || status === 504) return true
  if (error instanceof HttpStatusError) return error.status === undefined || error.status >= 500
  if (error instanceof Error && error.name === 'AbortError') return true
  return error instanceof TypeError // fetch() network failure
}

async function fetchJsonOnce(url: string, options: RequestInit): Promise<{ response: Response; json: any }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), fetchPatience.attemptTimeoutMs)
  try {
    const response = await fetch(url, { ...options, signal: options.signal ?? controller.signal })
    const contentType = response.headers.get('content-type') || ''

    if (!contentType.includes('application/json')) {
      const text = await response.text()
      throw new HttpStatusError(`Server returned non-JSON response (${response.status}): ${text.slice(0, 200)}`, response.status)
    }

    const json = await response.json()
    return { response, json }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Safe fetch wrapper: JSON parsing never fails silently, and slow or flaky backends get patience.
 * `/api/ai` (up to 3 attempts, with a global spinner) and `/api/search` (2 attempts) retry on
 * timeouts, gateway errors and dropped connections instead of surfacing the first failure.
 */
export async function safeFetch(
  url: string,
  options: RequestInit
): Promise<{ response: Response; json: any }> {
  const nextOptions = appendAiConsent(url, options)
  const isAi = url.includes('/api/ai')
  const maxAttempts = isAi ? fetchPatience.aiAttempts : url.includes('/api/search') ? fetchPatience.searchAttempts : 1

  if (isAi) aiActivity.begin(maxAttempts)
  try {
    for (let attempt = 1; ; attempt++) {
      if (isAi) aiActivity.attempt(attempt)
      try {
        const result = await fetchJsonOnce(url, nextOptions)
        const retryable = !result.response.ok && (isRetryable(null, result.response.status) || result.json?.errorType === 'TIMEOUT')
        if (!retryable || attempt >= maxAttempts) return result
      } catch (error) {
        if (attempt >= maxAttempts || nextOptions.signal?.aborted || !isRetryable(error)) throw error
      }
      await new Promise((resolve) => setTimeout(resolve, fetchPatience.delayMs))
    }
  } finally {
    if (isAi) aiActivity.end()
  }
}

function appendAiConsent(url: string, options: RequestInit): RequestInit {
  if (!url.includes('/api/ai')) {
    return options
  }

  if (typeof window === 'undefined' || typeof options.body !== 'string') {
    return options
  }

  try {
    const payload = JSON.parse(options.body) as Record<string, unknown>
    if (typeof payload.aiConsentAccepted === 'boolean') {
      return options
    }

    const aiConsentAccepted =
      readPersistedWizardState<{ aiConsentAccepted?: boolean }>()?.aiConsentAccepted === true

    return {
      ...options,
      body: JSON.stringify({
        ...payload,
        aiConsentAccepted,
      }),
    }
  } catch {
    return options
  }
}
