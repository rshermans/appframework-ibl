import type { EvidenceRecord, SearchArticle } from '@/types/research-workflow'
import { PROVIDER_SEQUENCE, type Provider } from '@/lib/searchProviders'

export type { Provider }

export function buildSourcePayload(article: SearchArticle): string {
  return [
    `Title: ${article.title}`,
    `Provider: ${article.provider}`,
    `Year: ${article.year ?? 'Unknown'}`,
    `Authors: ${article.authors.join(', ') || 'Unknown authors'}`,
    `DOI: ${article.doi || 'N/A'}`,
    `URL: ${article.url || 'N/A'}`,
    '',
    'Abstract:',
    article.abstract || 'No abstract available.',
  ].join('\n')
}

export function simplifyRelatedQuery(value: string): string {
  return value
    .replace(/[()"]/g, ' ')
    .replace(/\b(AND|OR|NOT)\b/gi, ' ')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function uniqueProviders(preferred: Provider): Provider[] {
  return Array.from(new Set([preferred, ...PROVIDER_SEQUENCE]))
}

export function buildRelatedQueryCandidates(
  booleanQuery: string,
  finalQuestion: string | undefined,
  searchArticles: SearchArticle[],
  customQuery?: string
): string[] {
  const titleTerms = searchArticles
    .slice(0, 3)
    .flatMap((article) => article.title.split(/\s+/))
    .filter((term) => term.length >= 5)
    .slice(0, 8)
    .join(' ')

  return Array.from(
    new Set(
      [
        customQuery || '',
        booleanQuery,
        simplifyRelatedQuery(booleanQuery),
        finalQuestion || '',
        titleTerms,
      ]
        .map((query) => query.trim())
        .filter((query) => query.length > 0)
    )
  )
}

export const ITEMS_PER_PAGE = 10

export function paginate<T>(items: T[], page: number, perPage: number = ITEMS_PER_PAGE) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage))
  const safePage = Math.min(Math.max(1, page), totalPages)
  return {
    totalPages,
    page: safePage,
    pageItems: items.slice((safePage - 1) * perPage, safePage * perPage),
  }
}

export function filterArticlesByText(articles: SearchArticle[], text: string): SearchArticle[] {
  const needle = text.trim().toLowerCase()
  if (!needle) return articles
  return articles.filter(
    (article) =>
      article.title.toLowerCase().includes(needle) ||
      (article.authors || []).some((author) => author.toLowerCase().includes(needle))
  )
}

export function filterEvidenceByText(records: EvidenceRecord[], text: string): EvidenceRecord[] {
  const needle = text.trim().toLowerCase()
  if (!needle) return records
  return records.filter(
    (record) => record.title.toLowerCase().includes(needle) || record.claim.toLowerCase().includes(needle)
  )
}

export interface RawEvidenceExtraction {
  title?: string
  source_type?: string
  claim?: string
  methodology?: string
  findings?: string[]
  limitations?: string[]
  relevance_score?: number
  citation?: string
}

/** An extraction is usable only with a claim and at least one finding. */
export function isCompleteEvidenceExtraction(value: RawEvidenceExtraction | null | undefined): boolean {
  const findings = Array.isArray(value?.findings) ? value.findings.filter(Boolean) : []
  return Boolean(value?.claim?.trim()) && findings.length > 0
}

export function buildEvidenceRecord(
  parsed: RawEvidenceExtraction | null | undefined,
  sourceArticle?: SearchArticle,
  id: string = `evidence-${Date.now()}`
): EvidenceRecord {
  const sourceType =
    parsed?.source_type === 'paper' ||
    parsed?.source_type === 'report' ||
    parsed?.source_type === 'website' ||
    parsed?.source_type === 'book'
      ? parsed.source_type
      : 'unknown'

  return {
    id,
    title: parsed?.title || 'Untitled source',
    sourceType,
    sourceArticleId: sourceArticle?.id,
    sourceProvider: sourceArticle?.provider,
    sourceArticleTitle: sourceArticle?.title,
    claim: parsed?.claim || '',
    methodology: parsed?.methodology || '',
    findings: Array.isArray(parsed?.findings) ? parsed.findings : [],
    limitations: Array.isArray(parsed?.limitations) ? parsed.limitations : [],
    relevanceScore: typeof parsed?.relevance_score === 'number' ? parsed.relevance_score : 0,
    citation: parsed?.citation || '',
  }
}
