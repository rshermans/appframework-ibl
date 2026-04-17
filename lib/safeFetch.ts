/**
 * Safe fetch wrapper that ensures JSON parsing never fails silently.
 * When the API returns HTML (e.g. Netlify error pages, 404s, redirects),
 * this wrapper catches the parse error and throws a meaningful message.
 */
export async function safeFetch(
  url: string,
  options: RequestInit
): Promise<{ response: Response; json: any }> {
  const nextOptions = appendAiConsent(url, options)
  const response = await fetch(url, nextOptions)

  const contentType = response.headers.get('content-type') || ''

  if (!contentType.includes('application/json')) {
    const text = await response.text()
    const preview = text.slice(0, 200)
    throw new Error(
      `Server returned non-JSON response (${response.status}): ${preview}`
    )
  }

  const json = await response.json()
  return { response, json }
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

    const persisted = window.sessionStorage.getItem('ibl-step0-memory')
    const parsedPersisted = persisted ? (JSON.parse(persisted) as { state?: { aiConsentAccepted?: boolean } }) : null
    const aiConsentAccepted = parsedPersisted?.state?.aiConsentAccepted === true

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
