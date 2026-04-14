'use client'

import { useEffect, useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import type { EvidenceRecord, SearchArticle } from '@/types/research-workflow'
import { useI18n } from '@/components/I18nProvider'
import StepHeader from '@/components/StepHeader'
import { parseAiJson } from '@/lib/parseAiJson'
import { safeFetch } from '@/lib/safeFetch'

type Provider = 'semantic_scholar' | 'crossref' | 'openaire' | 'rcaap'

const PROVIDER_SEQUENCE: Provider[] = ['rcaap', 'crossref', 'semantic_scholar', 'openaire']

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

function simplifyRelatedQuery(value: string): string {
  return value
    .replace(/[()"]/g, ' ')
    .replace(/\b(AND|OR|NOT)\b/gi, ' ')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function uniqueProviders(preferred: Provider): Provider[] {
  return Array.from(new Set([preferred, ...PROVIDER_SEQUENCE]))
}

function buildRelatedQueryCandidates(
  booleanQuery: string,
  finalQuestion: string | undefined,
  searchArticles: SearchArticle[]
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

export default function Step3Evidence() {
  const { locale, t } = useI18n()
  const {
    addEvidenceRecord,
    evidenceRecords,
    finalResearchQuestion,
    projectId,
    selectedSearchArticleIds,
    searchArticles,
    searchDesign,
    setSelectedSearchArticleIds,
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
  const [relatedProvider, setRelatedProvider] = useState<Provider>('rcaap')
  const [relatedPageByProvider, setRelatedPageByProvider] = useState<Record<Provider, number>>({
    semantic_scholar: 1,
    crossref: 1,
    openaire: 1,
    rcaap: 1,
  })
  const [relatedFeedback, setRelatedFeedback] = useState('')

  const canRun = Boolean(finalResearchQuestion?.approvedByUser && searchDesign)
  const isPortuguese = locale === 'pt-PT'
  const articlesForAnalysis =
    selectedSearchArticleIds.length > 0
      ? searchArticles.filter((article) => selectedSearchArticleIds.includes(article.id))
      : searchArticles

  useEffect(() => {
    const firstProvider = searchArticles.find(
      (article) =>
        article.provider === 'semantic_scholar' ||
        article.provider === 'crossref' ||
        article.provider === 'openaire' ||
        article.provider === 'rcaap'
    )?.provider

    if (
      firstProvider === 'semantic_scholar' ||
      firstProvider === 'crossref' ||
      firstProvider === 'openaire' ||
      firstProvider === 'rcaap'
    ) {
      setRelatedProvider(firstProvider)
    }
  }, [searchArticles])

  useEffect(() => {
    setRelatedPageByProvider({
      semantic_scholar: searchArticles.some((article) => article.provider === 'semantic_scholar') ? 2 : 1,
      crossref: searchArticles.some((article) => article.provider === 'crossref') ? 2 : 1,
      openaire: searchArticles.some((article) => article.provider === 'openaire') ? 2 : 1,
      rcaap: searchArticles.some((article) => article.provider === 'rcaap') ? 2 : 1,
    })
    setRelatedFeedback('')
  }, [searchArticles, searchDesign?.booleanQuery])

  const extractFromSource = async (
    source: string,
    sourceId: string,
    sourceArticle?: SearchArticle
  ) => {
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
      const { response: res, json } = await safeFetch('/api/ai', {
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

      const payload = json?.data ?? json

      if (!res.ok || !json?.ok) {
        throw new Error((json?.details || json?.error || t('api.genericFailure')) as string)
      }

      const parsed = parseAiJson<{
        title?: string
        source_type?: string
        claim?: string
        methodology?: string
        findings?: string[]
        limitations?: string[]
        relevance_score?: number
        citation?: string
      }>(payload.output)
      const sourceType =
        parsed?.source_type === 'paper' ||
        parsed?.source_type === 'report' ||
        parsed?.source_type === 'website' ||
        parsed?.source_type === 'book'
          ? parsed.source_type
          : 'unknown'

      const nextEvidenceRecord: EvidenceRecord = {
        id: `evidence-${Date.now()}`,
        title: parsed?.title || 'Untitled source',
        sourceType,
        sourceArticleId: sourceArticle?.id,
        sourceProvider: sourceArticle?.provider,
        sourceArticleTitle: sourceArticle?.title,
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

  const requestRelatedCandidates = async (
    provider: Provider,
    query: string,
    page: number
  ): Promise<{ page: number; hasNextPage: boolean; articles: SearchArticle[] }> => {
    const { response, json: payload } = await safeFetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        provider,
        page,
        limit: 20,
        locale,
      }),
    })
    const data = payload?.data ?? payload

    if (!response.ok || !payload?.ok) {
      throw new Error((payload?.details || payload?.error || t('api.searchFailure')) as string)
    }

    return {
      page: typeof data.page === 'number' ? data.page : page,
      hasNextPage: Boolean(data.hasNextPage),
      articles: Array.isArray(data.articles) ? (data.articles as SearchArticle[]) : [],
    }
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
      const providerCandidates = uniqueProviders(relatedProvider)
      const queryCandidates = buildRelatedQueryCandidates(
        searchDesign.booleanQuery,
        finalResearchQuestion?.question,
        searchArticles
      )
      const existingIds = new Set(searchArticles.map((article) => article.id))
      let addedArticles: SearchArticle[] = []
      let successfulProvider: Provider | null = null
      let usedFallbackQuery = false

      for (const providerCandidate of providerCandidates) {
        for (let queryIndex = 0; queryIndex < queryCandidates.length; queryIndex += 1) {
          let pageToTry = relatedPageByProvider[providerCandidate] ?? 1

          for (let attempt = 0; attempt < 2; attempt += 1) {
            const result = await requestRelatedCandidates(
              providerCandidate,
              queryCandidates[queryIndex],
              pageToTry
            )

            setRelatedPageByProvider((current) => ({
              ...current,
              [providerCandidate]: result.page + 1,
            }))

            const deduped = result.articles.filter((article) => !existingIds.has(article.id))
            if (deduped.length > 0) {
              addedArticles = deduped
              successfulProvider = providerCandidate
              usedFallbackQuery = queryIndex > 0
              break
            }

            if (!result.hasNextPage) {
              break
            }

            pageToTry = result.page + 1
          }

          if (addedArticles.length > 0) {
            break
          }
        }

        if (addedArticles.length > 0) {
          break
        }
      }

      if (addedArticles.length > 0) {
        setSearchArticles([...searchArticles, ...addedArticles])
        setSelectedSearchArticleIds(
          Array.from(new Set([...selectedSearchArticleIds, ...addedArticles.map((article) => article.id)]))
        )
        setRelatedFeedback(
          isPortuguese
            ? `${addedArticles.length} novo(s) artigo(s) relacionado(s) adicionado(s) via ${successfulProvider}${usedFallbackQuery ? ' com pesquisa simplificada' : ''}.`
            : `${addedArticles.length} new related article(s) added via ${successfulProvider}${usedFallbackQuery ? ' using a simplified query' : ''}.`
        )
      } else {
        setRelatedFeedback(
          isPortuguese
            ? 'Nao encontrei novos artigos reutilizaveis. Tenta mudar o fornecedor ou adicionar palavras complementares.'
            : 'No reusable new articles were found. Try changing provider or adding complementary keywords.'
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('api.searchFailure'))
    } finally {
      setRelatedLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <StepHeader
          stepId="step3_evidence_extraction"
          title={t('steps.step3.title')}
          subtitle={t('steps.step3.intro')}
        />
      </div>

      <div className="bg-[var(--surface_container_low)] p-4">
        <div className="mb-2 text-sm font-semibold text-[var(--on_surface)] opacity-70">{t('steps.step3.anchor')}</div>
        <div className="font-medium text-[var(--on_surface)]">
          {finalResearchQuestion?.question || t('common.noData')}
        </div>
      </div>

      {!canRun && (
        <div className="ai-needs-validation rounded-[var(--radius-md)] p-3 text-sm">
          {t('steps.step3.locked')}
        </div>
      )}

      {error && (
        <div className="ai-needs-validation rounded-[var(--radius-md)] p-3 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3 tonal-card p-5">
        <div className="font-label text-[10px] uppercase tracking-[0.12em] text-[var(--secondary)]">
          {t('steps.step3.retrievedArticles')}
        </div>
        <div className="text-xs text-[var(--on_surface)] opacity-70">
          {isPortuguese
            ? `${articlesForAnalysis.length} artigo(s) selecionado(s) para analise`
            : `${articlesForAnalysis.length} selected article(s) for analysis`}
        </div>
        {articlesForAnalysis.length === 0 ? (
          <div className="text-sm text-[var(--on_surface)] opacity-70">
            {selectedSearchArticleIds.length > 0
              ? t('steps.step3.noRetrievedArticles')
              : isPortuguese
                ? 'Sem artigos selecionados. Volta ao passo anterior para selecionar artigos.'
                : 'No articles selected. Go back to the previous step and select articles.'}
          </div>
        ) : (
          <div className="space-y-3">
            {articlesForAnalysis.map((article, index) => {
              const sourceId = article.id
              const isCurrent = activeSourceId === sourceId
              const isAnalyzed = analyzedSourceIds.has(sourceId)
              return (
                <div
                  key={article.id}
                  className={`rounded-[var(--radius-md)] p-4 transition ${
                    isAnalyzed
                      ? 'ai-user-decided rq-active-accent'
                      : 'bg-[var(--surface_container_low)]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 font-label text-[10px] uppercase tracking-[0.12em] text-[var(--secondary)]">
                    <div>
                      {t('steps.step3.evidenceLabel')} {index + 1} | {article.provider}
                    </div>
                    {isAnalyzed && (
                      <div className="primary-gradient rounded-[var(--radius-md)] px-2 py-1 text-[10px] font-semibold text-[var(--on_primary)]">
                        {isPortuguese ? 'Analisado' : 'Analysed'}
                      </div>
                    )}
                  </div>
                  <div className="mt-1 font-semibold text-[var(--on_surface)]">{article.title}</div>
                  <div className="mt-1 text-sm text-[var(--on_surface)] opacity-70">
                    {(article.authors || []).slice(0, 4).join(', ') || t('common.unknownAuthors')}
                    {article.year ? ` | ${article.year}` : ''}
                  </div>
                  <div className="mt-2 text-sm text-[var(--on_surface)] opacity-70">
                    {article.abstract || t('common.noAbstract')}
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() => extractFromSource(buildSourcePayload(article), sourceId, article)}
                      disabled={!canRun || loading}
                      className="primary-gradient rounded-[var(--radius-md)] px-3 py-2 text-sm font-semibold text-[var(--on_primary)] transition hover:brightness-110 disabled:opacity-50"
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

      <div className="space-y-3 tonal-card p-5">
        <div className="font-label text-[10px] uppercase tracking-[0.12em] text-[var(--secondary)]">
          {t('steps.step3.manualTitle')}
        </div>
        <div className="bg-[var(--surface_container_low)] p-3 text-sm text-[var(--on_surface)]">
          {isPortuguese
            ? 'Se precisares de mais fontes, este botao tenta automaticamente varios fornecedores e uma pesquisa simplificada antes da analise manual.'
            : 'If you need more sources, this button automatically tries several providers and a simplified query before manual analysis.'}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-[var(--on_surface)] opacity-70">
            {isPortuguese ? 'Fonte relacionada' : 'Related source'}:
            <select
              value={relatedProvider}
              onChange={(event) => setRelatedProvider(event.target.value as Provider)}
              className="ml-2 ghost-input inline-block w-auto"
            >
              <option value="rcaap">RCAAP</option>
              <option value="semantic_scholar">Semantic Scholar</option>
              <option value="crossref">Crossref</option>
              <option value="openaire">OpenAIRE Graph</option>
            </select>
          </label>
          <button
            onClick={fetchRelatedArticles}
            disabled={!canRun || relatedLoading}
            className="primary-gradient rounded-[var(--radius-md)] px-3 py-2 text-sm font-semibold text-[var(--on_primary)] transition hover:brightness-110 disabled:opacity-50"
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
          <div className="ai-user-decided rq-active-accent p-2 text-sm">
            {relatedFeedback}
          </div>
        )}

        <textarea
          value={sourceText}
          onChange={(event) => setSourceText(event.target.value)}
          rows={8}
          disabled={!canRun || loading}
          placeholder={t('steps.step3.manualPlaceholder')}
          className="ghost-input w-full disabled:opacity-50"
        />
        <button
          onClick={runManualExtraction}
          disabled={!canRun || loading || !sourceText.trim()}
          className="primary-gradient rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold text-[var(--on_primary)] transition hover:brightness-110 disabled:opacity-50"
        >
          {activeSourceId === 'manual' && loading ? t('steps.step3.analyzing') : t('steps.step3.analyzeManual')}
        </button>
      </div>

      {evidenceRecords.length > 0 && (
        <div className="space-y-4">
          <div className="font-label text-[10px] uppercase tracking-[0.12em] text-[var(--secondary)]">
            {t('steps.step3.evidenceTitle')}
          </div>

          {evidenceRecords.map((record, index) => (
            <div key={record.id} className="tonal-card p-5">
              <div className="mb-1 font-label text-[10px] uppercase tracking-[0.12em] text-[var(--secondary)]">
                {t('steps.step3.evidenceLabel')} {index + 1}
              </div>
              <div className="text-lg font-semibold text-[var(--on_surface)]">{record.title}</div>
              <div className="mt-2 text-sm text-[var(--on_surface)] opacity-70">
                {t('steps.step3.typeLabel')}: {record.sourceType} | {t('steps.step3.relevanceLabel')}:{' '}
                {record.relevanceScore}/5
              </div>

              <div className="mt-4 space-y-4 text-sm text-[var(--on_surface)]">
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
                      <li key={finding} className="bg-[var(--surface_container)] px-3 py-2">
                        {finding}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="mb-1 font-semibold">{t('steps.step3.limitations')}</div>
                  <ul className="space-y-1">
                    {record.limitations.map((limitation) => (
                      <li key={limitation} className="bg-[var(--surface_container)] px-3 py-2">
                        {limitation}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="mb-1 font-semibold">{t('steps.step3.citation')}</div>
                  <div className="bg-[var(--surface_container)] p-3">{record.citation}</div>
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-end">
            <button
              onClick={() => setWorkflowStep('step4_knowledge_structure')}
              className="primary-gradient rounded-[var(--radius-md)] px-4 py-3 text-[var(--on_primary)] transition hover:brightness-110"
            >
              {t('steps.step3.continueButton')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
