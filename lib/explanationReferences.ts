import type { EvidenceRecord, SearchArticle } from '@/types/research-workflow'

export interface ReviewedReference {
  key: string
  citation: string
  articleUrl?: string
  doiUrl?: string
  provider?: SearchArticle['provider']
}

export function formatArticleCitation(article: SearchArticle): string {
  const authorLabel = article.authors.length > 0 ? article.authors.join(', ') : 'Unknown authors'
  const yearLabel = article.year ? String(article.year) : 'n.d.'
  const doiLabel = article.doi ? ` DOI: ${article.doi}` : ''
  const urlLabel = article.url ? ` ${article.url}` : ''
  return `${authorLabel} (${yearLabel}). ${article.title}.${doiLabel}${urlLabel}`.trim()
}

export function normalizeUrl(value?: string): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  return undefined
}

export function normalizeDoi(value?: string): string | undefined {
  if (!value) return undefined
  const normalized = value
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
  return normalized || undefined
}

export function doiToUrl(doi?: string): string | undefined {
  const normalized = normalizeDoi(doi)
  if (!normalized) return undefined
  return `https://doi.org/${normalized}`
}

export function extractFirstUrl(text?: string): string | undefined {
  if (!text) return undefined
  const match = text.match(/https?:\/\/[^\s)]+/i)
  return normalizeUrl(match?.[0])
}

export function extractDoi(text?: string): string | undefined {
  if (!text) return undefined
  const match = text.match(/\b10\.\d{4,9}\/[^\s"<>]+/i)
  return normalizeDoi(match?.[0])
}

export function isLikelyPdf(url: string): boolean {
  return /\.pdf(\?|$)/i.test(url)
}

export function buildReviewedReferences(
  evidenceRecords: EvidenceRecord[],
  searchArticles: SearchArticle[]
): ReviewedReference[] {
  const linkedArticles = new Map(searchArticles.map((article) => [article.id, article] as const))
  const referencesByKey = new Map<string, ReviewedReference>()

  evidenceRecords.forEach((record, index) => {
    const sourceArticle = record.sourceArticleId ? linkedArticles.get(record.sourceArticleId) : undefined
    const fallbackCitation =
      record.citation?.trim() ||
      (sourceArticle ? formatArticleCitation(sourceArticle) : record.sourceArticleTitle?.trim()) ||
      `Source ${index + 1}`
    const articleUrl = normalizeUrl(sourceArticle?.url) || extractFirstUrl(record.citation)
    const doiUrl = doiToUrl(sourceArticle?.doi || extractDoi(record.citation))
    const dedupeKey =
      record.sourceArticleId ||
      `${fallbackCitation}|${sourceArticle?.provider || ''}|${articleUrl || ''}|${doiUrl || ''}`

    referencesByKey.set(dedupeKey, {
      key: dedupeKey,
      citation: fallbackCitation,
      articleUrl,
      doiUrl,
      provider: sourceArticle?.provider || record.sourceProvider,
    })
  })

  return Array.from(referencesByKey.values())
}

export function buildCompleteBibliography(
  evidenceRecords: EvidenceRecord[],
  searchArticles: SearchArticle[]
): string[] {
  const references = buildReviewedReferences(evidenceRecords, searchArticles)
  const entries = references.map((reference) => {
    const links = [reference.articleUrl ? `URL: ${reference.articleUrl}` : '', reference.doiUrl ? `DOI: ${reference.doiUrl}` : '']
      .filter(Boolean)
      .join(' | ')
    return links ? `${reference.citation} (${links})` : reference.citation
  })

  return Array.from(new Set(entries))
}

export function buildFallbackOutline(isPortuguese: boolean): string[] {
  return isPortuguese
    ? [
        'Enquadramento da pergunta de investigacao',
        'Sintese da evidencia principal',
        'Analise critica dos achados',
        'Implicacoes e proximos passos',
        'Conclusao',
      ]
    : [
        'Research question framing',
        'Synthesis of the main evidence',
        'Critical analysis of findings',
        'Implications and next steps',
        'Conclusion',
      ]
}

export function buildFallbackArgumentCore(
  evidenceRecords: EvidenceRecord[],
  topic: string,
  isPortuguese: boolean
): string {
  const evidenceCount = evidenceRecords.length
  return isPortuguese
    ? `Com base em ${evidenceCount} registos de evidencia analisados sobre ${topic || 'o tema em estudo'}, observa-se um padrao consistente que sustenta uma explicacao cientifica inicial, ainda sujeita a refinamento critico.`
    : `Based on ${evidenceCount} analyzed evidence records about ${topic || 'the current topic'}, the available findings support an initial scientific explanation that can be refined further.`
}
