import type { SearchArticle } from '@/types/research-workflow'

export type Provider =
  | 'crossref'
  | 'openaire'
  | 'openalex_pt'
  | 'doaj'
  | 'semantic_scholar'
  | 'arxiv'
  | 'pubmed'

/**
 * Order matters: free, key-less and reliable sources first. Semantic Scholar is last because
 * its public tier rate-limits aggressively (HTTP 429) unless an API key is configured.
 */
export const PROVIDER_SEQUENCE: Provider[] = [
  'crossref',
  'openaire',
  'openalex_pt',
  'doaj',
  'semantic_scholar',
  'arxiv',
  'pubmed',
]

export const PROVIDER_INFO: Record<Provider, { label: string; note: { pt: string; en: string } }> = {
  crossref: { label: 'Crossref', note: { pt: 'metadados de DOI', en: 'DOI metadata' } },
  openaire: { label: 'OpenAIRE Graph', note: { pt: 'inclui repositórios portugueses (RCAAP)', en: 'includes Portuguese repositories (RCAAP)' } },
  openalex_pt: { label: 'OpenAlex · Português (PT/BR)', note: { pt: 'acesso livre, só trabalhos em português', en: 'open access, Portuguese-language works only' } },
  doaj: { label: 'DOAJ · Acesso aberto', note: { pt: 'revistas em acesso aberto, vários idiomas', en: 'open access journals, many languages' } },
  semantic_scholar: { label: 'Semantic Scholar', note: { pt: 'pode ter limite de pedidos sem chave de API', en: 'may be rate-limited without an API key' } },
  arxiv: { label: 'arXiv', note: { pt: 'pré-publicações', en: 'preprints' } },
  pubmed: { label: 'PubMed / NCBI', note: { pt: 'biomedicina', en: 'biomedicine' } },
}

export function isProvider(value: string): value is Provider {
  return (PROVIDER_SEQUENCE as string[]).includes(value)
}

export function providerLabel(value: Provider): string {
  return PROVIDER_INFO[value]?.label ?? value
}

/** Short, human reason for a provider failure (shown as a notice, not as an error). */
export function describeProviderFailure(details: string, status?: number, pt = true): string {
  const text = details || ''
  if (status === 429 || /\b429\b|rate.?limit|too many requests/i.test(text)) {
    return pt ? 'limite de pedidos (defina S2_API_KEY para aumentar)' : 'rate limited (set S2_API_KEY to raise the limit)'
  }
  if (status === 401 || status === 403 || /\b40[13]\b|api key|forbidden/i.test(text)) {
    return pt ? 'acesso recusado (verifique a chave de API)' : 'access denied (check the API key)'
  }
  if (/timeout|timed out|abort/i.test(text) || status === 504) {
    return pt ? 'demorou demasiado a responder' : 'took too long to respond'
  }
  return pt ? 'indisponível de momento' : 'temporarily unavailable'
}

/** Merges by article id; later entries win. Keeps first-seen order. */
export function mergeUniqueArticles(existing: SearchArticle[], incoming: SearchArticle[]): SearchArticle[] {
  const byId = new Map<string, SearchArticle>()
  existing.forEach((article) => byId.set(article.id, article))
  incoming.forEach((article) => byId.set(article.id, article))
  return Array.from(byId.values())
}
