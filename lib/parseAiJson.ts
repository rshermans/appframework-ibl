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
  // Use bracket-depth counting to find the first *complete* JSON object or
  // array. Using lastIndexOf('}') fails when the model appends commentary or
  // a second JSON block after the main response.
  function findFirstComplete(text: string, open: string, close: string): string | null {
    const start = text.indexOf(open)
    if (start === -1) return null

    let depth = 0
    let inString = false
    let escaped = false

    for (let i = start; i < text.length; i++) {
      const ch = text[i]

      if (escaped) {
        escaped = false
        continue
      }

      if (ch === '\\' && inString) {
        escaped = true
        continue
      }

      if (ch === '"') {
        inString = !inString
        continue
      }

      if (!inString) {
        if (ch === open) depth++
        else if (ch === close) {
          depth--
          if (depth === 0) return text.slice(start, i + 1)
        }
      }
    }

    return null
  }

  const obj = findFirstComplete(value, '{', '}')
  if (obj) return obj

  const arr = findFirstComplete(value, '[', ']')
  if (arr) return arr

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

function removeTrailingCommas(value: string): string {
  // Remove trailing commas inside objects and arrays: [1, 2,] -> [1, 2]
  // Runs multiple passes to handle nested structures.
  let prev = ''
  let current = value
  while (current !== prev) {
    prev = current
    current = current.replace(/,(\s*[}\]])/g, '$1')
  }
  return current
}

function normalizeJsonText(value: string): string {
  return escapeControlCharsInsideStrings(
    removeTrailingCommas(
      extractJsonCandidate(stripCodeFences(value))
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'")
        .trim()
    )
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
