function stripCodeFences(value: string): string {
  const trimmed = value.trim()

  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim()
  }

  return trimmed
}

function extractJsonCandidate(value: string): string {
  const objectStart = value.indexOf('{')
  const objectEnd = value.lastIndexOf('}')

  if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
    return value.slice(objectStart, objectEnd + 1)
  }

  const arrayStart = value.indexOf('[')
  const arrayEnd = value.lastIndexOf(']')

  if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
    return value.slice(arrayStart, arrayEnd + 1)
  }

  return value
}

function escapeControlCharsInsideStrings(value: string): string {
  let result = ''
  let inString = false
  let escaped = false

  for (const char of value) {
    if (escaped) {
      result += char
      escaped = false
      continue
    }

    if (char === '\\') {
      result += char
      escaped = true
      continue
    }

    if (char === '"') {
      result += char
      inString = !inString
      continue
    }

    if (inString) {
      if (char === '\n') {
        result += '\\n'
        continue
      }

      if (char === '\r') {
        result += '\\r'
        continue
      }

      if (char === '\t') {
        result += '\\t'
        continue
      }
    }

    result += char
  }

  return result
}

function normalizeJsonText(value: string): string {
  return escapeControlCharsInsideStrings(
    extractJsonCandidate(stripCodeFences(value))
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .trim()
  )
}

export function parseAiJson<T>(input: unknown): T {
  if (input && typeof input === 'object') {
    return input as T
  }

  if (typeof input !== 'string') {
    throw new Error('AI returned unsupported structured output format.')
  }

  const attempts = [input.trim(), stripCodeFences(input), normalizeJsonText(input)]
  let lastError: Error | null = null

  for (const attempt of attempts) {
    if (!attempt) continue

    try {
      return JSON.parse(attempt) as T
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }
  }

  throw new Error(
    lastError?.message || 'AI returned invalid JSON. Please try again with a more specific prompt.'
  )
}
