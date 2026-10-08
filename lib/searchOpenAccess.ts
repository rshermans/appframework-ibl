import type { SearchArticle, SearchPagination } from '@/types/research-workflow'

export interface OpenAccessOutput {
  provider: 'openalex_pt' | 'doaj'
  articles: SearchArticle[]
  pagination: SearchPagination
}

const USER_AGENT = 'IBL-AI/1.0'

/** OpenAlex ships abstracts as an inverted index ({ word: [positions] }); rebuild the text. */
export function reconstructAbstract(index: Record<string, number[]> | null | undefined): string {
  if (!index || typeof index !== 'object') return ''
  const words: string[] = []
  for (const [word, positions] of Object.entries(index)) {
    if (!Array.isArray(positions)) continue
    for (const position of positions) {
      if (Number.isInteger(position) && position >= 0 && position < 20000) words[position] = word
    }
  }
  return words.filter((word) => word !== undefined).join(' ').trim()
}

interface OpenAlexWork {
  id?: string
  doi?: string | null
  title?: string | null
  display_name?: string | null
  publication_year?: number | null
  authorships?: Array<{ author?: { display_name?: string | null } }>
  abstract_inverted_index?: Record<string, number[]> | null
  primary_location?: { landing_page_url?: string | null } | null
}

export interface OpenAlexPayload {
  meta?: { count?: number; page?: number; per_page?: number }
  results?: OpenAlexWork[]
}

function stripDoiPrefix(doi?: string | null): string | undefined {
  if (!doi) return undefined
  return doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '') || undefined
}

export function parseOpenAlex(payload: OpenAlexPayload, page: number, pageSize: number): OpenAccessOutput {
  const articles = (payload.results ?? [])
    .map((work, index): SearchArticle | null => {
      const title = (work.title || work.display_name || '').trim()
      const abstract = reconstructAbstract(work.abstract_inverted_index)
      if (!title && !abstract) return null
      const doi = stripDoiPrefix(work.doi)
      return {
        id: `openalex_pt:${(work.id || '').replace('https://openalex.org/', '') || `openalex-${page}-${index}`}`,
        provider: 'openalex_pt',
        title: title || 'Untitled paper',
        abstract: abstract || 'No abstract available.',
        year: work.publication_year ?? undefined,
        authors: (work.authorships ?? []).map((a) => a.author?.display_name?.trim() || '').filter(Boolean),
        doi,
        url: work.primary_location?.landing_page_url || (doi ? `https://doi.org/${doi}` : work.id),
      }
    })
    .filter((article): article is SearchArticle => article !== null)

  const total = payload.meta?.count
  return {
    provider: 'openalex_pt',
    articles,
    pagination: {
      page,
      pageSize,
      totalResults: typeof total === 'number' ? total : undefined,
      hasNextPage: typeof total === 'number' ? page * pageSize < total : articles.length === pageSize,
    },
  }
}

export async function searchOpenAlexPortuguese(query: string, pageSize: number, page: number): Promise<OpenAccessOutput> {
  const url = new URL('https://api.openalex.org/works')
  url.searchParams.set('search', query)
  url.searchParams.set('filter', 'language:pt')
  url.searchParams.set('per-page', String(Math.min(pageSize, 100)))
  url.searchParams.set('page', String(page))
  url.searchParams.set('select', 'id,doi,title,display_name,publication_year,authorships,abstract_inverted_index,primary_location')
  const mailto = process.env.OPENALEX_MAILTO || process.env.CONTACT_EMAIL
  if (mailto) url.searchParams.set('mailto', mailto) // "polite pool": faster, more reliable

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`OpenAlex search failed (${response.status}): ${(await response.text().catch(() => '')).slice(0, 200)}`)
  }
  return parseOpenAlex((await response.json()) as OpenAlexPayload, page, Math.min(pageSize, 100))
}

interface DoajResult {
  id?: string
  bibjson?: {
    title?: string
    abstract?: string
    year?: string | number
    author?: Array<{ name?: string }>
    identifier?: Array<{ type?: string; id?: string }>
    link?: Array<{ type?: string; url?: string }>
  }
}

export interface DoajPayload {
  total?: number
  page?: number
  pageSize?: number
  results?: DoajResult[]
}

export function parseDoaj(payload: DoajPayload, page: number, pageSize: number): OpenAccessOutput {
  const articles = (payload.results ?? [])
    .map((item, index): SearchArticle | null => {
      const bib = item.bibjson
      if (!bib || (!bib.title && !bib.abstract)) return null
      const doi = bib.identifier?.find((entry) => entry.type?.toLowerCase() === 'doi')?.id
      const fulltext = bib.link?.find((entry) => entry.type === 'fulltext')?.url || bib.link?.[0]?.url
      const year = Number(bib.year)
      return {
        id: `doaj:${item.id || `doaj-${page}-${index}`}`,
        provider: 'doaj',
        title: (bib.title || '').trim() || 'Untitled paper',
        abstract:
          (bib.abstract || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/\s+([.,;:!?])/g, '$1').trim() ||
          'No abstract available.',
        year: Number.isFinite(year) && year > 0 ? year : undefined,
        authors: (bib.author ?? []).map((a) => a.name?.trim() || '').filter(Boolean),
        doi,
        url: fulltext || (doi ? `https://doi.org/${doi}` : undefined),
      }
    })
    .filter((article): article is SearchArticle => article !== null)

  const total = payload.total
  return {
    provider: 'doaj',
    articles,
    pagination: {
      page,
      pageSize,
      totalResults: typeof total === 'number' ? total : undefined,
      hasNextPage: typeof total === 'number' ? page * pageSize < total : articles.length === pageSize,
    },
  }
}

export async function searchDoaj(query: string, pageSize: number, page: number): Promise<OpenAccessOutput> {
  const url = new URL(`https://doaj.org/api/search/articles/${encodeURIComponent(query)}`)
  url.searchParams.set('page', String(page))
  url.searchParams.set('pageSize', String(Math.min(pageSize, 100)))

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`DOAJ search failed (${response.status}): ${(await response.text().catch(() => '')).slice(0, 200)}`)
  }
  return parseDoaj((await response.json()) as DoajPayload, page, Math.min(pageSize, 100))
}
