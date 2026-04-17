import type { SearchArticle, SearchPagination } from '@/types/research-workflow'

export type SearchProvider = 'semantic_scholar' | 'crossref' | 'openaire' | 'rcaap'

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
  const provider = input.provider ?? 'crossref'
  const pageSize = clampLimit(input.limit)
  const page = clampPage(input.page)

  if (provider === 'crossref') {
    return searchCrossref(input.query, pageSize, page)
  }

  if (provider === 'openaire') {
    return searchOpenAIRE(input.query, pageSize, page)
  }

  if (provider === 'rcaap') {
    return searchRCAAP(input.query, pageSize, page)
  }

  return searchSemanticScholar(input.query, pageSize, page)
}

function clampLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) return 20
  return Math.max(1, Math.min(100, Math.trunc(limit)))
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
    'User-Agent': 'IBL-AI/1.0',
  }

  const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY || process.env.S2_API_KEY || ''
  if (apiKey) {
    headers['x-api-key'] = apiKey
  }

  let resolvedPage = page
  let resolvedPageSize = pageSize
  let response = await runSemanticScholarRequest(() =>
    fetch(url.toString(), {
      method: 'GET',
      headers,
      cache: 'no-store',
    })
  )

  if (!response.ok) {
    const details = await safeReadText(response)
    const offsetUnavailable =
      response.status === 400 &&
      /Requested data for this limit and\/or offset is not available/i.test(details)

    if (offsetUnavailable) {
      const fallbackUrl = new URL('https://api.semanticscholar.org/graph/v1/paper/search')
      resolvedPage = 1
      resolvedPageSize = Math.min(pageSize, 10)
      fallbackUrl.searchParams.set('query', query)
      fallbackUrl.searchParams.set('limit', String(resolvedPageSize))
      fallbackUrl.searchParams.set('offset', '0')
      fallbackUrl.searchParams.set('fields', 'paperId,title,abstract,year,authors,url,externalIds')

      response = await runSemanticScholarRequest(() =>
        fetch(fallbackUrl.toString(), {
          method: 'GET',
          headers,
          cache: 'no-store',
        })
      )

      if (!response.ok) {
        const retryDetails = await safeReadText(response)
        throw new Error(`Semantic Scholar search failed (${response.status}): ${retryDetails}`)
      }
    } else if (response.status === 500 || response.status === 400) {
      const simplifiedQuery = simplifySemanticScholarQuery(query)
      if (simplifiedQuery && simplifiedQuery !== query) {
        console.warn(`[Search API] Semantic Scholar failed, retrying with simplified query: ${simplifiedQuery}`)
        return searchSemanticScholar(simplifiedQuery, pageSize, page)
      }
      throw new Error(`Semantic Scholar search failed (${response.status}): ${details}`)
    } else {
      throw new Error(`Semantic Scholar search failed (${response.status}): ${details}`)
    }
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
      id: `semantic_scholar:${item.paperId || `semantic-${Date.now()}-${index}`}`,
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
      page: resolvedPage,
      pageSize: resolvedPageSize,
      totalResults,
      hasNextPage:
        totalResults !== undefined
          ? resolvedPage * resolvedPageSize < totalResults
          : articles.length === resolvedPageSize,
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
      'User-Agent': 'IBL-AI/1.0 (mailto:support@example.com)',
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
        id: `crossref:${item.DOI || `crossref-${Date.now()}-${index}`}`,
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
      'User-Agent': 'IBL-AI/1.0',
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
        id: `openaire:${item.id || `openaire-${Date.now()}-${index}`}`,
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

async function searchRCAAP(
  query: string,
  pageSize: number,
  page: number
): Promise<SearchOutput> {
  const normalizedQuery = simplifyPortalQuery(query)
  const url = new URL('https://www.rcaap.pt/search')
  url.searchParams.set('formname', 'TAGCLOUD')
  url.searchParams.set('includeAll', 'yes')
  url.searchParams.set('text', normalizedQuery)
  url.searchParams.set('page', String(page))

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'IBL-AI/1.0',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const details = await safeReadText(response)
    throw new Error(`RCAAP search failed (${response.status}): ${details}`)
  }

  const html = await response.text()
  const detailUrls = extractRcaapDetailUrls(html)
  const plainText = normalizeHtmlToText(html)
  const parsed = parseRcaapPlainText(plainText, detailUrls)

  return {
    provider: 'rcaap',
    articles: parsed.articles.slice(0, pageSize),
    pagination: {
      page,
      pageSize,
      totalResults: parsed.totalResults,
      hasNextPage:
        typeof parsed.totalResults === 'number'
          ? page * pageSize < parsed.totalResults
          : parsed.articles.length >= pageSize,
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

function simplifySemanticScholarQuery(query: string): string {
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

  return Array.from(new Set(terms)).slice(0, 10).join(' ')
}

function simplifyPortalQuery(query: string): string {
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

  return Array.from(new Set(terms)).slice(0, 10).join(' ')
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

function extractRcaapDetailUrls(html: string): string[] {
  const matches = Array.from(
    html.matchAll(/href=["']([^"']*detail\.jsp\?id=[^"']+)["']/gi),
    (match) => match[1]
  )

  const absoluteUrls = matches.map((value) => {
    try {
      return new URL(value, 'https://www.rcaap.pt').toString()
    } catch {
      return ''
    }
  })

  return Array.from(new Set(absoluteUrls.filter(Boolean)))
}

function normalizeHtmlToText(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6]|\/section|\/article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')

  return decodeHtmlEntities(withoutScripts)
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function parseRcaapPlainText(
  plainText: string,
  detailUrls: string[]
): { totalResults?: number; articles: SearchArticle[] } {
  const totalMatch = plainText.match(/([\d.,]+)\s+documents found,\s+page\s+\d+\s+of\s+\d+/i)
  const totalResults = totalMatch ? parseLooseInteger(totalMatch[1]) : undefined
  const rawBlocks = plainText.split(/More info\./i)
  const articles: SearchArticle[] = []
  let urlIndex = 0

  for (const rawBlock of rawBlocks) {
    if (!/Date:\s*/i.test(rawBlock)) continue

    const dateMatch = rawBlock.match(/Date:\s*([^\n|]+)\|\s*Origin:\s*([^\n]+)/i)
    const year = extractYear(dateMatch?.[1]?.trim())
    const beforeDate = rawBlock.split(/Date:\s*/i)[0]
    const lines = beforeDate
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !isRcaapNoiseLine(line))

    if (lines.length === 0) continue

    const title = lines[0]
    const authorsLine = lines.length > 1 && !looksLikeAbstractLine(lines[1]) ? lines[1] : ''
    const abstractStartIndex = authorsLine ? 2 : 1
    const abstract = lines.slice(abstractStartIndex).join(' ').trim() || 'No abstract available.'
    const authors = authorsLine
      ? authorsLine.split(/\s*;\s*/).map((author) => author.trim()).filter(Boolean)
      : []
    const url = detailUrls[urlIndex]
    urlIndex += 1

    if (!title || title.length < 6) continue

    articles.push({
      id: `rcaap:${url || `${title}-${year || 'n.d.'}`}`.slice(0, 240),
      provider: 'rcaap',
      title,
      abstract,
      year,
      authors,
      url,
    })
  }

  return {
    totalResults,
    articles,
  }
}

function parseLooseInteger(value?: string): number | undefined {
  if (!value) return undefined
  const digits = value.replace(/[^\d]/g, '')
  if (!digits) return undefined
  const parsed = Number(digits)
  return Number.isNaN(parsed) ? undefined : parsed
}

function isRcaapNoiseLine(line: string): boolean {
  return /^(Search by|Sort by|RSS feed search results|Go to|Showing results|Subscribe RSS|Home|Help)$/i.test(
    line
  )
}

function looksLikeAbstractLine(line: string): boolean {
  return line.length > 140 || /\b(abstract|description|summary|the|this|study|paper)\b/i.test(line)
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
