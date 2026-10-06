import type { SearchArticle } from '@/types/research-workflow'

export type Provider = 'semantic_scholar' | 'crossref' | 'openaire' | 'arxiv' | 'pubmed'

export const PROVIDER_SEQUENCE: Provider[] = ['crossref', 'openaire', 'semantic_scholar', 'arxiv', 'pubmed']

export function providerLabel(value: Provider): string {
  if (value === 'arxiv') return 'arXiv'
  if (value === 'pubmed') return 'PubMed / NCBI'
  if (value === 'openaire') return 'OpenAIRE Graph'
  if (value === 'crossref') return 'Crossref'
  return 'Semantic Scholar'
}

/** Merges by article id; later entries win. Keeps first-seen order. */
export function mergeUniqueArticles(existing: SearchArticle[], incoming: SearchArticle[]): SearchArticle[] {
  const byId = new Map<string, SearchArticle>()
  existing.forEach((article) => byId.set(article.id, article))
  incoming.forEach((article) => byId.set(article.id, article))
  return Array.from(byId.values())
}
