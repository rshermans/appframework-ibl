'use client'

import { useEffect, useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import type { EvidenceRecord, SearchArticle } from '@/types/research-workflow'
import { useI18n } from '@/components/I18nProvider'

type Provider = 'semantic_scholar' | 'crossref' | 'openaire'

function buildSourcePayload(article: SearchArticle): string {
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

export default function Step3Evidence() {
  const { locale, t } = useI18n()
  const {
    addEvidenceRecord,
    evidenceRecords,
    finalResearchQuestion,
    projectId,
    searchArticles,
    searchDesign,
    setSearchArticles,
    setWorkflowStep,
    topic,
  } = useWizardStore()
  const [sourceText, setSourceText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null)
  const [analyzedSourceIds, setAnalyzedSourceIds] = useState<Set<string>>(new Set())
  const [relatedLoading, setRelatedLoading] = useState(false)
  const [relatedPage, setRelatedPage] = useState(2)
  const [hasMoreRelated, setHasMoreRelated] = useState(true)
  const [relatedProvider, setRelatedProvider] = useState<Provider>('semantic_scholar')
  const [relatedFeedback, setRelatedFeedback] = useState('')

  const canRun = Boolean(finalResearchQuestion?.approvedByUser && searchDesign)
  const isPortuguese = locale === 'pt-PT'

  useEffect(() => {
    const firstProvider = searchArticles.find((article) =>
      article.provider === 'semantic_scholar' ||
      article.provider === 'crossref' ||
      article.provider === 'openaire'
    )?.provider

    if (firstProvider === 'semantic_scholar' || firstProvider === 'crossref' || firstProvider === 'openaire') {
      setRelatedProvider(firstProvider)
    }
  }, [searchArticles])

  useEffect(() => {
    setRelatedPage(2)
    setHasMoreRelated(true)
    setRelatedFeedback('')
  }, [searchDesign?.booleanQuery])

  const extractFromSource = async (source: string, sourceId: string) => {
    if (!finalResearchQuestion?.question) {
      setError(t('steps.step3.locked'))
      return
    }

    if (!searchDesign) {
      setError(t('steps.step3.locked'))
      return
    }

    if (!source.trim()) {
      setError(t('steps.step3.sourceRequired'))
      return
    }

    setLoading(true)
    setActiveSourceId(sourceId)
    setError('')

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          stage: 1,
          promptId: 'step4',
          stepId: 'step3',
          stepLabel: t('workflow.step3_evidence_extraction.label'),
          topic,
          rq: finalResearchQuestion.question,
          finalResearchQuestion,
          searchDesign,
          source,
          locale,
        }),
      })

      const json = await res.json()
      const payload = json?.data ?? json

      if (!res.ok || !json?.ok) {
        throw new Error(json?.details || json?.error || t('api.genericFailure'))
      }

      const parsed = JSON.parse(payload.output)
      const nextEvidenceRecord: EvidenceRecord = {
        id: `evidence-${Date.now()}`,
        title: parsed?.title || 'Untitled source',
        sourceType: parsed?.source_type || 'unknown',
        claim: parsed?.claim || '',
        methodology: parsed?.methodology || '',
        findings: Array.isArray(parsed?.findings) ? parsed.findings : [],
        limitations: Array.isArray(parsed?.limitations) ? parsed.limitations : [],
        relevanceScore:
          typeof parsed?.relevance_score === 'number' ? parsed.relevance_score : 0,
        citation: parsed?.citation || '',
      }

      if (!nextEvidenceRecord.claim || nextEvidenceRecord.findings.length === 0) {
        throw new Error(t('api.genericFailure'))
      }

      addEvidenceRecord(nextEvidenceRecord)
      if (sourceId === 'manual') {
        setSourceText('')
      } else {
        setAnalyzedSourceIds((current) => {
          const next = new Set(current)
          next.add(sourceId)
          return next
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('api.genericFailure'))
    } finally {
      setLoading(false)
      setActiveSourceId(null)
    }
  }

  const runManualExtraction = async () => {
    await extractFromSource(sourceText, 'manual')
  }

  const fetchRelatedArticles = async () => {
    if (!searchDesign?.booleanQuery) {
      setError(t('steps.step3.noRetrievedArticles'))
      return
    }

    setRelatedLoading(true)
    setRelatedFeedback('')
    setError('')

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchDesign.booleanQuery,
          provider: relatedProvider,
          page: relatedPage,
          limit: 5,
          locale,
        }),
      })

      const payload = await response.json()
      const data = payload?.data ?? payload

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.details || payload?.error || t('api.searchFailure'))
      }

      const incoming = Array.isArray(data.articles) ? data.articles : []
      const existingIds = new Set(searchArticles.map((article) => article.id))
      const deduped = incoming.filter((article: SearchArticle) => !existingIds.has(article.id))

      if (deduped.length > 0) {
        setSearchArticles([...searchArticles, ...deduped])
        setRelatedFeedback(
          isPortuguese
            ? `${deduped.length} novo(s) artigo(s) relacionado(s) adicionado(s).`
            : `${deduped.length} new related article(s) added.`
        )
      } else {
        setRelatedFeedback(
          isPortuguese
            ? 'Nao surgiram novos artigos nesta pagina.'
            : 'No new articles were found on this page.'
        )
      }

      setHasMoreRelated(Boolean(data.hasNextPage))
      setRelatedPage((current) => current + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('api.searchFailure'))
    } finally {
      setRelatedLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-xl font-semibold">{t('steps.step3.title')}</h2>
        <p className="text-sm text-gray-600">{t('steps.step3.intro')}</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="mb-2 text-sm font-semibold text-slate-700">{t('steps.step3.anchor')}</div>
        <div className="font-medium text-slate-900">
          {finalResearchQuestion?.question || t('common.noData')}
        </div>
      </div>

      {!canRun && (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {t('steps.step3.locked')}
        </div>
      )}

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          {t('steps.step3.retrievedArticles')}
        </div>
        {searchArticles.length === 0 ? (
          <div className="text-sm text-slate-600">
            {t('steps.step3.noRetrievedArticles')}
          </div>
        ) : (
          <div className="space-y-3">
            {searchArticles.map((article, index) => {
              const sourceId = `article-${article.id}`
              const isCurrent = activeSourceId === sourceId
              const isAnalyzed = analyzedSourceIds.has(sourceId)
              return (
                <div
                  key={article.id}
                  className={`rounded border p-4 transition ${
                    isAnalyzed
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-wide text-slate-500">
                    <div>
                      {t('steps.step3.evidenceLabel')} {index + 1} | {article.provider}
                    </div>
                    {isAnalyzed && (
                      <div className="rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white">
                        {isPortuguese ? 'Analisado' : 'Analysed'}
                      </div>
                    )}
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">{article.title}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {(article.authors || []).slice(0, 4).join(', ') || t('common.unknownAuthors')}
                    {article.year ? ` | ${article.year}` : ''}
                  </div>
                  <div className="mt-2 text-sm text-slate-700">
                    {article.abstract || t('common.noAbstract')}
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() => extractFromSource(buildSourcePayload(article), sourceId)}
                      disabled={!canRun || loading}
                      className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {isCurrent && loading
                        ? t('steps.step3.analyzing')
                        : isAnalyzed
                          ? isPortuguese
                            ? 'Reanalisar este artigo'
                            : 'Reanalyse this article'
                          : t('steps.step3.analyzeButton')}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          {t('steps.step3.manualTitle')}
        </div>
        <div className="rounded border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800">
          {isPortuguese
            ? 'Se precisares de mais fontes, usa "Trazer novo artigo relacionado" para adicionar novos artigos antes da analise manual.'
            : 'If you need more sources, use "Fetch new related article" to add fresh papers before manual analysis.'}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-700">
            {isPortuguese ? 'Fonte relacionada' : 'Related source'}:
            <select
              value={relatedProvider}
              onChange={(event) => setRelatedProvider(event.target.value as Provider)}
              className="ml-2 rounded border border-slate-300 px-2 py-1 text-sm"
            >
              <option value="semantic_scholar">Semantic Scholar</option>
              <option value="crossref">Crossref</option>
              <option value="openaire">OpenAIRE Graph</option>
            </select>
          </label>
          <button
            onClick={fetchRelatedArticles}
            disabled={!canRun || relatedLoading || !hasMoreRelated}
            className="rounded bg-indigo-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {relatedLoading
              ? isPortuguese
                ? 'A procurar...'
                : 'Searching...'
              : isPortuguese
                ? 'Trazer novo artigo relacionado'
                : 'Fetch new related article'}
          </button>
        </div>

        {relatedFeedback && (
          <div className="rounded border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">
            {relatedFeedback}
          </div>
        )}

        <textarea
          value={sourceText}
          onChange={(event) => setSourceText(event.target.value)}
          rows={8}
          disabled={!canRun || loading}
          placeholder={t('steps.step3.manualPlaceholder')}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
        />
        <button
          onClick={runManualExtraction}
          disabled={!canRun || loading || !sourceText.trim()}
          className="rounded bg-slate-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {activeSourceId === 'manual' && loading ? t('steps.step3.analyzing') : t('steps.step3.analyzeManual')}
        </button>
      </div>

      {evidenceRecords.length > 0 && (
        <div className="space-y-4">
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            {t('steps.step3.evidenceTitle')}
          </div>

          {evidenceRecords.map((record, index) => (
            <div key={record.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">
                {t('steps.step3.evidenceLabel')} {index + 1}
              </div>
              <div className="text-lg font-semibold text-slate-900">{record.title}</div>
              <div className="mt-2 text-sm text-slate-600">
                {t('steps.step3.typeLabel')}: {record.sourceType} | {t('steps.step3.relevanceLabel')}:{' '}
                {record.relevanceScore}/5
              </div>

              <div className="mt-4 space-y-4 text-sm text-slate-800">
                <div>
                  <div className="mb-1 font-semibold">{t('steps.step3.claim')}</div>
                  <div>{record.claim}</div>
                </div>

                <div>
                  <div className="mb-1 font-semibold">{t('steps.step3.methodology')}</div>
                  <div>{record.methodology}</div>
                </div>

                <div>
                  <div className="mb-1 font-semibold">{t('steps.step3.findings')}</div>
                  <ul className="space-y-1">
                    {record.findings.map((finding) => (
                      <li key={finding} className="rounded border bg-slate-50 px-3 py-2">
                        {finding}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="mb-1 font-semibold">{t('steps.step3.limitations')}</div>
                  <ul className="space-y-1">
                    {record.limitations.map((limitation) => (
                      <li key={limitation} className="rounded border bg-slate-50 px-3 py-2">
                        {limitation}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="mb-1 font-semibold">{t('steps.step3.citation')}</div>
                  <div className="rounded border bg-slate-50 p-3">{record.citation}</div>
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-end">
            <button
              onClick={() => setWorkflowStep('step4_knowledge_structure')}
              className="rounded bg-slate-900 px-4 py-3 text-white hover:bg-slate-800"
            >
              {t('steps.step3.continueButton')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
