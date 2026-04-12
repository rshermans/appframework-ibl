import type { SearchArticle, SearchPagination } from '@/types/research-workflow'

export type SearchProvider = 'semantic_scholar' | 'crossref' | 'openaire'

const SEMANTIC_SCHOLAR_MIN_INTERVAL_MS = 1100
let semanticScholarNextSlotAt = 0
let semanticScholarQueue: Promise<void> = Promise.resolve()

interface SearchInput {
  query: string
  limit?: number
  page?: number
  provider?: SearchProvider
}

interface SearchOutput {
  provider: SearchProvider
  articles: SearchArticle[]
  pagination: SearchPagination
}

export async function searchScientificArticles(input: SearchInput): Promise<SearchOutput> {
  const provider = input.provider ?? 'semantic_scholar'
  const pageSize = clampLimit(input.limit)
  const page = clampPage(input.page)

  if (provider === 'crossref') {
    return searchCrossref(input.query, pageSize, page)
  }

  if (provider === 'openaire') {
    return searchOpenAIRE(input.query, pageSize, page)
  }

  return searchSemanticScholar(input.query, pageSize, page)
}

function clampLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) return 5
  return Math.max(1, Math.min(20, Math.trunc(limit)))
}

function clampPage(page?: number): number {
  if (!page || Number.isNaN(page)) return 1
  return Math.max(1, Math.trunc(page))
}

async function searchSemanticScholar(
  query: string,
  pageSize: number,
  page: number
): Promise<SearchOutput> {
  const offset = (page - 1) * pageSize
  const url = new URL('https://api.semanticscholar.org/graph/v1/paper/search')
  url.searchParams.set('query', query)
  url.searchParams.set('limit', String(pageSize))
  url.searchParams.set('offset', String(offset))
  url.searchParams.set('fields', 'paperId,title,abstract,year,authors,url,externalIds')

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'RELIA-Research-Wizard/1.0',
  }

  const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY || process.env.S2_API_KEY || ''
  if (apiKey) {
    headers['x-api-key'] = apiKey
  }

  const response = await runSemanticScholarRequest(() =>
    fetch(url.toString(), {
      method: 'GET',
      headers,
      cache: 'no-store',
    })
  )

  if (!response.ok) {
    const details = await safeReadText(response)
    throw new Error(`Semantic Scholar search failed (${response.status}): ${details}`)
  }

  const payload = (await response.json()) as {
    data?: Array<{
      paperId?: string
      title?: string
      abstract?: string
      year?: number
      authors?: Array<{ name?: string }>
      url?: string
      externalIds?: { DOI?: string }
    }>
    total?: number
  }

  const articles = (payload.data ?? [])
    .filter((item) => item.title || item.abstract)
    .map((item, index) => ({
      id: item.paperId || `semantic-${Date.now()}-${index}`,
      provider: 'semantic_scholar' as const,
      title: item.title?.trim() || 'Untitled paper',
      abstract: item.abstract?.trim() || 'No abstract available.',
      year: item.year,
      authors: (item.authors ?? []).map((author) => author.name || '').filter(Boolean),
      doi: item.externalIds?.DOI,
      url: item.url,
    }))

  const totalResults =
    typeof payload.total === 'number' && payload.total >= 0
      ? payload.total
      : undefined

  return {
    provider: 'semantic_scholar',
    articles,
    pagination: {
      page,
      pageSize,
      totalResults,
      hasNextPage:
        totalResults !== undefined
          ? page * pageSize < totalResults
          : articles.length === pageSize,
    },
  }
}

async function searchCrossref(
  query: string,
  pageSize: number,
  page: number
): Promise<SearchOutput> {
  const offset = (page - 1) * pageSize
  const url = new URL('https://api.crossref.org/works')
  url.searchParams.set('query', query)
  url.searchParams.set('rows', String(pageSize))
  url.searchParams.set('offset', String(offset))
  url.searchParams.set('select', 'DOI,title,abstract,published-print,published-online,author,URL')

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'RELIA-Research-Wizard/1.0 (mailto:support@example.com)',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const details = await safeReadText(response)
    throw new Error(`Crossref search failed (${response.status}): ${details}`)
  }

  const payload = (await response.json()) as {
    message?: {
      items?: Array<{
        DOI?: string
        title?: string[]
        abstract?: string
        author?: Array<{ given?: string; family?: string }>
        URL?: string
        'published-print'?: { 'date-parts'?: number[][] }
        'published-online'?: { 'date-parts'?: number[][] }
      }>
      'total-results'?: number
    }
  }

  const articles = (payload.message?.items ?? [])
    .filter((item) => item.title?.length || item.abstract)
    .map((item, index) => {
      const printYear = item['published-print']?.['date-parts']?.[0]?.[0]
      const onlineYear = item['published-online']?.['date-parts']?.[0]?.[0]
      return {
        id: item.DOI || `crossref-${Date.now()}-${index}`,
        provider: 'crossref' as const,
        title: item.title?.[0]?.trim() || 'Untitled paper',
        abstract: stripMarkup(item.abstract || 'No abstract available.'),
        year: printYear || onlineYear,
        authors: (item.author ?? [])
          .map((author) => `${author.given || ''} ${author.family || ''}`.trim())
          .filter(Boolean),
        doi: item.DOI,
        url: item.URL,
      }
    })

  const totalResults = payload.message?.['total-results']

  return {
    provider: 'crossref',
    articles,
    pagination: {
      page,
      pageSize,
      totalResults: typeof totalResults === 'number' ? totalResults : undefined,
      hasNextPage:
        typeof totalResults === 'number'
          ? page * pageSize < totalResults
          : articles.length === pageSize,
    },
  }
}

async function searchOpenAIRE(
  query: string,
  pageSize: number,
  page: number
): Promise<SearchOutput> {
  const normalizedQuery = simplifyOpenAIREQuery(query)
  const url = new URL('https://api.openaire.eu/graph/v1/researchProducts')
  url.searchParams.set('search', normalizedQuery)
  url.searchParams.set('type', 'publication')
  url.searchParams.set('page', String(page))
  url.searchParams.set('pageSize', String(pageSize))
  url.searchParams.set('sortBy', 'publicationDate DESC')

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'RELIA-Research-Wizard/1.0',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const details = await safeReadText(response)
    throw new Error(`OpenAIRE search failed (${response.status}): ${details}`)
  }

  const payload = (await response.json()) as {
    header?: {
      numFound?: number
      page?: number
      pageSize?: number
      nextCursor?: string
    }
    results?: Array<{
      id?: string
      mainTitle?: string
      descriptions?: string[]
      publicationDate?: string
      authors?: Array<{ fullName?: string }>
      pids?: Array<{ scheme?: string; value?: string }>
      instances?: Array<{
        urls?: string[]
        alternateIdentifiers?: Array<{ scheme?: string; value?: string }>
      }>
    }>
  }

  const articles = (payload.results ?? [])
    .map((item, index) => {
      const title = item.mainTitle?.trim() || 'Untitled paper'
      const abstract = normalizeDescription(item.descriptions) || 'No abstract available.'
      const year = extractYear(item.publicationDate)
      const doi = extractDoi(item)
      const url = extractFirstUrl(item)

      return {
        id: item.id || `openaire-${Date.now()}-${index}`,
        provider: 'openaire' as const,
        title,
        abstract,
        year,
        authors: (item.authors ?? []).map((author) => author.fullName || '').filter(Boolean),
        doi,
        url,
      }
    })
    .filter((item) => item.title || item.abstract)

  const totalResults =
    typeof payload.header?.numFound === 'number' ? payload.header.numFound : undefined
  const resolvedPage =
    typeof payload.header?.page === 'number' && payload.header.page > 0
      ? payload.header.page
      : page
  const resolvedPageSize =
    typeof payload.header?.pageSize === 'number' && payload.header.pageSize > 0
      ? payload.header.pageSize
      : pageSize

  return {
    provider: 'openaire',
    articles,
    pagination: {
      page: resolvedPage,
      pageSize: resolvedPageSize,
      totalResults,
      hasNextPage:
        typeof totalResults === 'number'
          ? resolvedPage * resolvedPageSize < totalResults
          : Boolean(payload.header?.nextCursor) || articles.length === resolvedPageSize,
    },
  }
}

function extractYear(publicationDate?: string): number | undefined {
  if (!publicationDate) return undefined
  const match = publicationDate.match(/^(\d{4})/)
  if (!match) return undefined
  const year = Number(match[1])
  return Number.isNaN(year) ? undefined : year
}

function normalizeDescription(descriptions?: string[]): string | undefined {
  if (!Array.isArray(descriptions)) return undefined
  const value = descriptions.find((item) => typeof item === 'string' && item.trim().length > 0)
  return value?.trim()
}

function extractDoi(item: {
  pids?: Array<{ scheme?: string; value?: string }>
  instances?: Array<{ alternateIdentifiers?: Array<{ scheme?: string; value?: string }> }>
}): string | undefined {
  const directDoi = (item.pids ?? []).find((pid) => pid.scheme?.toLowerCase() === 'doi')?.value
  if (directDoi) return directDoi

  for (const instance of item.instances ?? []) {
    const doi = (instance.alternateIdentifiers ?? []).find(
      (id) => id.scheme?.toLowerCase() === 'doi'
    )?.value
    if (doi) return doi
  }

  return undefined
}

function extractFirstUrl(item: { instances?: Array<{ urls?: string[] }> }): string | undefined {
  for (const instance of item.instances ?? []) {
    const url = (instance.urls ?? []).find((entry) => typeof entry === 'string' && entry.trim())
    if (url) return url
  }
  return undefined
}

function stripMarkup(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function simplifyOpenAIREQuery(query: string): string {
  const cleaned = query
    .replace(/[()"]/g, ' ')
    .replace(/\b(AND|OR|NOT)\b/gi, ' ')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned) {
    return query
  }

  const terms = cleaned
    .split(' ')
    .map((term) => term.trim())
    .filter((term) => term.length >= 3)

  const uniqueTerms = Array.from(new Set(terms.map((term) => term.toLowerCase())))
  const selectedTerms = uniqueTerms.slice(0, 8)

  return selectedTerms.join(' ')
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 300)
  } catch {
    return 'Unable to read error response.'
  }
}

async function runSemanticScholarRequest<T>(operation: () => Promise<T>): Promise<T> {
  let releaseQueue!: () => void
  const previous = semanticScholarQueue
  semanticScholarQueue = new Promise<void>((resolve) => {
    releaseQueue = resolve
  })

  await previous

  try {
    const now = Date.now()
    const waitMs = Math.max(0, semanticScholarNextSlotAt - now)
    if (waitMs > 0) {
      await delay(waitMs)
    }

    semanticScholarNextSlotAt = Date.now() + SEMANTIC_SCHOLAR_MIN_INTERVAL_MS
    return await operation()
  } finally {
    releaseQueue()
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
