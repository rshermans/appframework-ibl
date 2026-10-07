import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseDoaj, parseOpenAlex, reconstructAbstract } from '@/lib/searchOpenAccess'
import { searchScientificArticles, isSearchProvider, SUPPORTED_PROVIDERS } from '@/lib/search'
import { PROVIDER_SEQUENCE, describeProviderFailure, providerLabel } from '@/lib/searchProviders'

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })

// Shapes follow the public OpenAlex / DOAJ API documentation.
const openAlexPayload = {
  meta: { count: 42, page: 1, per_page: 20 },
  results: [
    {
      id: 'https://openalex.org/W123',
      doi: 'https://doi.org/10.1234/abc',
      title: 'Branqueamento de corais em Portugal',
      publication_year: 2021,
      authorships: [{ author: { display_name: 'Ana Silva' } }, { author: { display_name: 'Rui Costa' } }],
      abstract_inverted_index: { Os: [0], corais: [1], branqueiam: [2], com: [3], o: [4], aquecimento: [5] },
      primary_location: { landing_page_url: 'https://repositorio.example.pt/123' },
    },
    { id: 'https://openalex.org/W999', title: null, display_name: null, abstract_inverted_index: null },
  ],
}

const doajPayload = {
  total: 7,
  page: 1,
  pageSize: 20,
  results: [
    {
      id: 'abc123',
      bibjson: {
        title: 'Acidificación de los océanos',
        abstract: '<p>Resumen   del <b>estudio</b>.</p>',
        year: '2020',
        author: [{ name: 'María López' }],
        identifier: [{ type: 'eissn', id: '1234-5678' }, { type: 'doi', id: '10.5555/xyz' }],
        link: [{ type: 'fulltext', url: 'https://revista.example/es/1' }],
      },
    },
    { id: 'empty', bibjson: {} },
  ],
}

describe('OpenAlex (Portuguese focus)', () => {
  it('rebuilds an abstract from the inverted index in word order', () => {
    expect(reconstructAbstract({ b: [1], a: [0], c: [2, 4], d: [3] })).toBe('a b c d c')
    expect(reconstructAbstract(null)).toBe('')
    expect(reconstructAbstract({ x: [-1, 99999] })).toBe('')
  })

  it('maps works to articles, skipping those without title and abstract', () => {
    const out = parseOpenAlex(openAlexPayload, 1, 20)
    expect(out.articles).toHaveLength(1)
    expect(out.articles[0]).toMatchObject({
      id: 'openalex_pt:W123', provider: 'openalex_pt', title: 'Branqueamento de corais em Portugal', year: 2021,
      authors: ['Ana Silva', 'Rui Costa'], doi: '10.1234/abc', url: 'https://repositorio.example.pt/123',
      abstract: 'Os corais branqueiam com o aquecimento',
    })
    expect(out.pagination).toEqual({ page: 1, pageSize: 20, totalResults: 42, hasNextPage: true })
  })

  it('requests only Portuguese-language works with paging and a trimmed field list', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(openAlexPayload))
    const result = await searchScientificArticles({ query: '("coral reefs" AND bleaching)', limit: 20, page: 2, provider: 'openalex_pt' })
    const url = new URL(String(fetchMock.mock.calls[0][0]))
    expect(url.origin + url.pathname).toBe('https://api.openalex.org/works')
    expect(url.searchParams.get('filter')).toBe('language:pt')
    expect(url.searchParams.get('page')).toBe('2')
    expect(url.searchParams.get('per-page')).toBe('20')
    expect(url.searchParams.get('select')).toContain('abstract_inverted_index')
    expect(url.searchParams.get('search')).toBe('coral reefs bleaching') // boolean syntax removed
    expect(result.provider).toBe('openalex_pt')
    expect(result.articles).toHaveLength(1)
  })

  it('reports the HTTP status when the service fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('slow down', { status: 429 }))
    await expect(searchScientificArticles({ query: 'coral', provider: 'openalex_pt' })).rejects.toThrow(/OpenAlex search failed \(429\)/)
  })
})

describe('DOAJ (open access, multilingual)', () => {
  it('maps results: strips markup, picks the DOI identifier and the full-text link', () => {
    const out = parseDoaj(doajPayload, 1, 20)
    expect(out.articles).toHaveLength(1)
    expect(out.articles[0]).toMatchObject({
      id: 'doaj:abc123', provider: 'doaj', title: 'Acidificación de los océanos', year: 2020, authors: ['María López'],
      doi: '10.5555/xyz', url: 'https://revista.example/es/1', abstract: 'Resumen del estudio.',
    })
    expect(out.pagination).toMatchObject({ totalResults: 7, hasNextPage: false })
  })

  it('queries the articles endpoint with the encoded query and paging', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(doajPayload))
    await searchScientificArticles({ query: 'ocean acidification', limit: 10, page: 3, provider: 'doaj' })
    const url = new URL(String(fetchMock.mock.calls[0][0]))
    expect(url.pathname).toBe('/api/search/articles/ocean%20acidification')
    expect(url.searchParams.get('page')).toBe('3')
    expect(url.searchParams.get('pageSize')).toBe('10')
  })
})

describe('Semantic Scholar rate limiting', () => {
  it('waits and retries once on HTTP 429 instead of failing immediately', async () => {
    vi.useFakeTimers()
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('Too Many Requests', { status: 429, headers: { 'retry-after': '1' } }))
      .mockResolvedValueOnce(json({ total: 1, data: [{ paperId: 'p1', title: 'Coral paper', abstract: 'abs', year: 2020, authors: [{ name: 'A' }], externalIds: { DOI: '10.1/x' } }] }))
    const pending = searchScientificArticles({ query: 'coral', provider: 'semantic_scholar' })
    await vi.advanceTimersByTimeAsync(8000)
    const result = await pending
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.articles[0]).toMatchObject({ id: 'semantic_scholar:p1', doi: '10.1/x' })
  })

  it('gives a 429 message that can be classified when the retry is limited too', async () => {
    vi.useFakeTimers()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Too Many Requests', { status: 429 }))
    const pending = searchScientificArticles({ query: 'coral', provider: 'semantic_scholar' })
    const assertion = expect(pending).rejects.toThrow(/\(429\)/)
    await vi.advanceTimersByTimeAsync(8000)
    await assertion
  })
})

describe('provider registry', () => {
  it('exposes the new providers everywhere the API validates them', () => {
    expect(SUPPORTED_PROVIDERS).toEqual(PROVIDER_SEQUENCE)
    expect(isSearchProvider('openalex_pt')).toBe(true)
    expect(isSearchProvider('doaj')).toBe(true)
    expect(isSearchProvider('nope')).toBe(false)
    expect(providerLabel('openalex_pt')).toMatch(/Português/)
    expect(providerLabel('doaj')).toMatch(/DOAJ/)
  })

  it('tries key-less sources first and leaves rate-limited Semantic Scholar late', () => {
    expect(PROVIDER_SEQUENCE.indexOf('semantic_scholar')).toBeGreaterThan(PROVIDER_SEQUENCE.indexOf('crossref'))
    expect(PROVIDER_SEQUENCE.indexOf('semantic_scholar')).toBeGreaterThan(PROVIDER_SEQUENCE.indexOf('doaj'))
  })

  it('turns raw failures into short, actionable reasons', () => {
    expect(describeProviderFailure('Semantic Scholar search failed (429): Too Many Requests', 500)).toMatch(/limite de pedidos/)
    expect(describeProviderFailure('', 429, false)).toMatch(/rate limited/)
    expect(describeProviderFailure('forbidden', 403)).toMatch(/chave de API/)
    expect(describeProviderFailure('Request timeout after 28000ms')).toMatch(/demorou/)
    expect(describeProviderFailure('boom')).toMatch(/indisponível/)
  })
})
