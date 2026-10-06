import type { SearchDesign } from '@/types/research-workflow'

export interface RawSearchDesign {
  keywords?: string[]
  synonyms?: string[]
  boolean_query?: string
  booleanQuery?: string
  query?: string
  search_query?: string
  search_strings?: SearchDesign['searchStrings']
  searchStrings?: SearchDesign['searchStrings']
  strings?: SearchDesign['searchStrings']
  recommended_databases?: string[]
  recommendedDatabases?: string[]
  filters?: string[]
}

function pickSearchStrings(value: RawSearchDesign | null | undefined): SearchDesign['searchStrings'] {
  return (
    (Array.isArray(value?.search_strings) && value.search_strings) ||
    (Array.isArray(value?.searchStrings) && value.searchStrings) ||
    (Array.isArray(value?.strings) && value.strings) ||
    []
  )
}

function pickBooleanQuery(value: RawSearchDesign | null | undefined): string {
  return value?.boolean_query || value?.booleanQuery || value?.search_query || value?.query || ''
}

/** The model output is usable when it has a boolean query and at least one search string. */
export function isUsableRawSearchDesign(value: RawSearchDesign | null | undefined): boolean {
  const booleanQuery = pickBooleanQuery(value)
  return typeof booleanQuery === 'string' && booleanQuery.trim().length > 0 && pickSearchStrings(value).length > 0
}

/** Accepts the several key spellings models produce and fills sensible fallbacks. */
export function normalizeSearchDesign(parsed: RawSearchDesign | null | undefined): SearchDesign {
  const normalizedSearchStrings = pickSearchStrings(parsed)
  const normalizedBooleanQuery = pickBooleanQuery(parsed)

  // Fallback: build boolean_query from keywords if model omitted it
  const fallbackBooleanQuery =
    normalizedBooleanQuery ||
    (Array.isArray(parsed?.keywords) && parsed.keywords.length > 0 ? parsed.keywords.join(' AND ') : '')

  // Fallback: build a single search_strings entry from the boolean query
  const fallbackSearchStrings =
    normalizedSearchStrings.length > 0
      ? normalizedSearchStrings
      : fallbackBooleanQuery
        ? [{ database: 'General', query: fallbackBooleanQuery }]
        : []

  return {
    keywords: Array.isArray(parsed?.keywords) ? parsed.keywords : [],
    synonyms: Array.isArray(parsed?.synonyms) ? parsed.synonyms : [],
    booleanQuery: fallbackBooleanQuery,
    searchStrings: fallbackSearchStrings,
    recommendedDatabases: Array.isArray(parsed?.recommended_databases)
      ? parsed.recommended_databases
      : Array.isArray(parsed?.recommendedDatabases)
        ? parsed.recommendedDatabases
        : [],
    filters: Array.isArray(parsed?.filters) ? parsed.filters : [],
  }
}
