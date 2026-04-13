/**
 * Safe fetch wrapper that ensures JSON parsing never fails silently.
 * When the API returns HTML (e.g. Netlify error pages, 404s, redirects),
 * this wrapper catches the parse error and throws a meaningful message.
 */
export async function safeFetch(
  url: string,
  options: RequestInit
): Promise<{ response: Response; json: any }> {
  const response = await fetch(url, options)

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
