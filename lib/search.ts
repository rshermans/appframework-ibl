import type { SearchArticle } from '@/types/research-workflow'

export type SearchProvider = 'semantic_scholar' | 'crossref'

interface SearchInput {
  query: string
  limit?: number
  provider?: SearchProvider
}

interface SearchOutput {
  provider: SearchProvider
  articles: SearchArticle[]
}

export async function searchScientificArticles(input: SearchInput): Promise<SearchOutput> {
  const provider = input.provider ?? 'semantic_scholar'
  const limit = clampLimit(input.limit)

  if (provider === 'crossref') {
    const articles = await searchCrossref(input.query, limit)
    return { provider, articles }
  }

  const articles = await searchSemanticScholar(input.query, limit)
  return { provider, articles }
}

function clampLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) return 5
  return Math.max(1, Math.min(20, Math.trunc(limit)))
}

async function searchSemanticScholar(query: string, limit: number): Promise<SearchArticle[]> {
  const url = new URL('https://api.semanticscholar.org/graph/v1/paper/search')
  url.searchParams.set('query', query)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set(
    'fields',
    'paperId,title,abstract,year,authors,url,externalIds'
  )

  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  const apiKey =
    process.env.SEMANTIC_SCHOLAR_API_KEY || process.env.S2_API_KEY || ''
  if (apiKey) {
    headers['x-api-key'] = apiKey
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers,
    cache: 'no-store',
  })

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
  }

  return (payload.data ?? [])
    .filter((item) => item.title || item.abstract)
    .map((item, index) => ({
      id: item.paperId || `semantic-${Date.now()}-${index}`,
      provider: 'semantic_scholar',
      title: item.title?.trim() || 'Untitled paper',
      abstract: item.abstract?.trim() || 'No abstract available.',
      year: item.year,
      authors: (item.authors ?? []).map((author) => author.name || '').filter(Boolean),
      doi: item.externalIds?.DOI,
      url: item.url,
    }))
}

async function searchCrossref(query: string, limit: number): Promise<SearchArticle[]> {
  const url = new URL('https://api.crossref.org/works')
  url.searchParams.set('query', query)
  url.searchParams.set('rows', String(limit))
  url.searchParams.set('select', 'DOI,title,abstract,published-print,author,URL')

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
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
        'published-print'?: {
          'date-parts'?: number[][]
        }
      }>
    }
  }

  return (payload.message?.items ?? [])
    .filter((item) => item.title?.length || item.abstract)
    .map((item, index) => {
      const year = item['published-print']?.['date-parts']?.[0]?.[0]
      return {
        id: item.DOI || `crossref-${Date.now()}-${index}`,
        provider: 'crossref',
        title: item.title?.[0]?.trim() || 'Untitled paper',
        abstract: stripMarkup(item.abstract || 'No abstract available.'),
        year,
        authors: (item.author ?? [])
          .map((author) => `${author.given || ''} ${author.family || ''}`.trim())
          .filter(Boolean),
        doi: item.DOI,
        url: item.URL,
      }
    })
}

function stripMarkup(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 300)
  } catch {
    return 'Unable to read error response.'
  }
}
