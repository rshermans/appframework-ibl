'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import type { ExplanationDraft, EvidenceRecord, SearchArticle } from '@/types/research-workflow'
import { useI18n } from '@/components/I18nProvider'
import { parseAiJson } from '@/lib/parseAiJson'
import { safeFetch } from '@/lib/safeFetch'

interface ReviewedReference {
  key: string
  citation: string
  articleUrl?: string
  doiUrl?: string
  provider?: SearchArticle['provider']
}

function formatArticleCitation(article: SearchArticle): string {
  const authorLabel = article.authors.length > 0 ? article.authors.join(', ') : 'Unknown authors'
  const yearLabel = article.year ? String(article.year) : 'n.d.'
  const doiLabel = article.doi ? ` DOI: ${article.doi}` : ''
  const urlLabel = article.url ? ` ${article.url}` : ''
  return `${authorLabel} (${yearLabel}). ${article.title}.${doiLabel}${urlLabel}`.trim()
}

function normalizeUrl(value?: string): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  return undefined
}

function normalizeDoi(value?: string): string | undefined {
  if (!value) return undefined
  const normalized = value
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
  return normalized || undefined
}

function doiToUrl(doi?: string): string | undefined {
  const normalized = normalizeDoi(doi)
  if (!normalized) return undefined
  return `https://doi.org/${normalized}`
}

function extractFirstUrl(text?: string): string | undefined {
  if (!text) return undefined
  const match = text.match(/https?:\/\/[^\s)]+/i)
  return normalizeUrl(match?.[0])
}

function extractDoi(text?: string): string | undefined {
  if (!text) return undefined
  const match = text.match(/\b10\.\d{4,9}\/[^\s"<>]+/i)
  return normalizeDoi(match?.[0])
}

function isLikelyPdf(url: string): boolean {
  return /\.pdf(\?|$)/i.test(url)
}

function buildReviewedReferences(
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

function buildCompleteBibliography(
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

export default function Step5Explanation() {
  const { locale, t } = useI18n()
  const {
    evidenceRecords,
    explanationDraft,
    finalResearchQuestion,
    knowledgeStructure,
    projectId,
    searchArticles,
    setExplanationDraft,
    topic,
  } = useWizardStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [audience, setAudience] = useState<'expert' | 'general'>('expert')
  const isPortuguese = locale === 'pt-PT'
  const reviewedReferences = buildReviewedReferences(evidenceRecords, searchArticles)

  const canRun = Boolean(
    finalResearchQuestion?.approvedByUser &&
    knowledgeStructure &&
    evidenceRecords.length > 0
  )

  const buildExplanationDraft = async () => {
    if (!finalResearchQuestion?.question) {
      setError(t('steps.step5.locked'))
      return
    }
    if (!knowledgeStructure || evidenceRecords.length === 0) {
      setError(t('steps.step5.locked'))
      return
    }

    setLoading(true)
    setError('')

    try {
      const evidenceJson = JSON.stringify(evidenceRecords, null, 2)
      const bibliographySeed = buildCompleteBibliography(evidenceRecords, searchArticles)
      const { response, json: payload } = await safeFetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          stage: 2,
          promptId: 'step9',
          stepId: 'step5_explanation',
          stepLabel: t('workflow.step5_explanation.label'),
          topic,
          rq: finalResearchQuestion.question,
          finalResearchQuestion,
          evidenceRecords,
          knowledgeStructure,
          evidence: evidenceJson,
          bibliographySeed,
          audience,
          locale,
        }),
      })

      const data = payload?.data ?? payload

      if (!response.ok || !payload?.ok) {
        throw new Error((payload?.details || payload?.error || t('api.genericFailure')) as string)
      }

      const parsed = parseAiJson<{
        outline?: string[]
        argument_core?: string
        evidence_references?: string[]
        bibliography?: string[]
        open_issues?: string[]
      }>(data.output)
      const nextDraft: ExplanationDraft = {
        outline: Array.isArray(parsed?.outline) ? parsed.outline : [],
        argumentCore: parsed?.argument_core || '',
        evidenceReferences: Array.isArray(parsed?.evidence_references)
          ? parsed.evidence_references
          : [],
        bibliography:
          Array.isArray(parsed?.bibliography) && parsed.bibliography.length > 0
            ? parsed.bibliography
            : bibliographySeed,
        openIssues: Array.isArray(parsed?.open_issues) ? parsed.open_issues : [],
      }

      if (nextDraft.outline.length === 0 || !nextDraft.argumentCore) {
        throw new Error(t('api.genericFailure'))
      }

      setExplanationDraft(nextDraft)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('api.genericFailure'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-xl font-semibold">{t('steps.step5.title')}</h2>
        <p className="text-sm text-gray-600">{t('steps.step5.intro')}</p>
      </div>

      {!canRun && (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {t('steps.step5.locked')}
        </div>
      )}

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="mb-2 text-sm font-semibold text-slate-700">{t('common.audience')}</div>
        <select
          value={audience}
          onChange={(event) => setAudience(event.target.value as 'expert' | 'general')}
          className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="expert">{t('steps.step5.expert')}</option>
          <option value="general">{t('steps.step5.general')}</option>
        </select>
      </div>

      <button
        onClick={buildExplanationDraft}
        disabled={!canRun || loading}
        className="rounded bg-slate-900 px-4 py-3 text-white disabled:opacity-50"
      >
        {loading ? t('steps.step5.generating') : t('steps.step5.generateButton')}
      </button>

      {explanationDraft && (
        <div className="space-y-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div>
            <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
              {t('steps.step5.outline')}
            </div>
            <ol className="space-y-2">
              {explanationDraft.outline.map((item, index) => (
                <li key={`${item}-${index}`} className="rounded border bg-white px-3 py-2 text-sm">
                  {index + 1}. {item}
                </li>
              ))}
            </ol>
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
              {t('steps.step5.argumentCore')}
            </div>
            <div className="rounded border bg-white p-4 text-sm text-slate-900">
              {explanationDraft.argumentCore}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
                {t('steps.step5.evidenceReferences')}
              </div>
              <ul className="space-y-2">
                {explanationDraft.evidenceReferences.map((reference) => (
                  <li key={reference} className="rounded border bg-white px-3 py-2 text-sm text-slate-900">
                    {reference}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
                {t('steps.step5.openIssues')}
              </div>
              <ul className="space-y-2">
                {explanationDraft.openIssues.map((issue) => (
                  <li key={issue} className="rounded border bg-white px-3 py-2 text-sm text-slate-900">
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
              {isPortuguese ? 'Bibliografia completa' : 'Complete bibliography'}
            </div>
            <ul className="space-y-2">
              {explanationDraft.bibliography.map((entry) => (
                <li key={entry} className="rounded border bg-white px-3 py-2 text-sm text-slate-900">
                  {entry}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
              {isPortuguese ? 'Referências verificáveis (com links)' : 'Verifiable references (with links)'}
            </div>
            <ul className="space-y-2">
              {reviewedReferences.map((reference) => (
                <li key={reference.key} className="rounded border bg-white px-3 py-3 text-sm text-slate-900">
                  <div>{reference.citation}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    {reference.provider && (
                      <span className="rounded bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                        {reference.provider}
                      </span>
                    )}
                    {reference.articleUrl && (
                      <a
                        href={reference.articleUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded bg-blue-100 px-2 py-1 font-semibold text-blue-800 hover:bg-blue-200"
                      >
                        {isPortuguese ? 'Abrir artigo' : 'Open article'}
                      </a>
                    )}
                    {reference.articleUrl && isLikelyPdf(reference.articleUrl) && (
                      <a
                        href={reference.articleUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded bg-emerald-100 px-2 py-1 font-semibold text-emerald-800 hover:bg-emerald-200"
                      >
                        {isPortuguese ? 'Baixar PDF' : 'Download PDF'}
                      </a>
                    )}
                    {reference.doiUrl && (
                      <a
                        href={reference.doiUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded bg-indigo-100 px-2 py-1 font-semibold text-indigo-800 hover:bg-indigo-200"
                      >
                        DOI
                      </a>
                    )}
                    {!reference.articleUrl && !reference.doiUrl && (
                      <span className="rounded bg-amber-100 px-2 py-1 font-semibold text-amber-800">
                        {isPortuguese ? 'Sem link disponível nesta referência' : 'No link available for this reference'}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
