'use client'

import { useEffect, useRef, useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import type { SearchArticle, SearchDesign } from '@/types/research-workflow'
import { useI18n } from '@/components/I18nProvider'

type Provider = 'semantic_scholar' | 'crossref' | 'openaire' | 'rcaap'

function mergeUniqueArticles(existing: SearchArticle[], incoming: SearchArticle[]): SearchArticle[] {
  const byId = new Map<string, SearchArticle>()
  existing.forEach((article) => byId.set(article.id, article))
  incoming.forEach((article) => byId.set(article.id, article))
  return Array.from(byId.values())
}

export default function Step2Search() {
  const { locale, t } = useI18n()
  const {
    finalResearchQuestion,
    projectId,
    searchDesign,
    searchArticles,
    selectedSearchArticleIds,
    clearSearchArticleSelection,
    setSearchArticles,
    setSelectedSearchArticleIds,
    setSearchDesign,
    setWorkflowStep,
    topic,
    toggleSearchArticleSelection,
  } = useWizardStore()
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [provider, setProvider] = useState<Provider>('rcaap')
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalResults, setTotalResults] = useState<number | undefined>(undefined)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [userRefinementPrompt, setUserRefinementPrompt] = useState('')
  const [userRefinementKeywords, setUserRefinementKeywords] = useState('')
  const articlesRef = useRef<SearchArticle[]>(searchArticles)

  useEffect(() => {
    articlesRef.current = searchArticles
  }, [searchArticles])

  const isApproved = Boolean(finalResearchQuestion?.approvedByUser)
  const isPortuguese = locale === 'pt-PT'

  const providerLabel = (value: Provider) => {
    if (value === 'rcaap') return 'RCAAP'
    if (value === 'openaire') return 'OpenAIRE Graph'
    if (value === 'crossref') return 'Crossref'
    return 'Semantic Scholar'
  }

  const runRetrieval = async (
    query: string,
    requestedPage: number = 1,
    forcedProvider?: Provider,
    options: { replaceExisting?: boolean } = {}
  ): Promise<{ page: number; hasNextPage: boolean } | null> => {
    setSearchLoading(true)
    setError('')

    try {
      const effectiveProvider = forcedProvider ?? provider
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          limit: pageSize,
          page: requestedPage,
          provider: effectiveProvider,
          locale,
        }),
      })
      const payload = await response.json()
      const data = payload?.data ?? payload

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.details || payload?.error || t('api.searchFailure'))
      }

      const incomingArticles = Array.isArray(data.articles) ? data.articles : []
      const nextArticles = options.replaceExisting
        ? incomingArticles
        : mergeUniqueArticles(articlesRef.current, incomingArticles)

      setSearchArticles(nextArticles)
      articlesRef.current = nextArticles
      setPage(typeof data.page === 'number' ? data.page : requestedPage)
      setHasNextPage(Boolean(data.hasNextPage))
      setTotalResults(typeof data.totalResults === 'number' ? data.totalResults : undefined)
      return {
        page: typeof data.page === 'number' ? data.page : requestedPage,
        hasNextPage: Boolean(data.hasNextPage),
      }
    } catch (err) {
      setTotalResults(undefined)
      setHasNextPage(false)
      setError(err instanceof Error ? err.message : t('api.searchFailure'))
      return null
    } finally {
      setSearchLoading(false)
    }
  }

  const runSearchDesign = async () => {
    if (!finalResearchQuestion?.question) {
      setError(t('steps.step2.locked'))
      return
    }

    if (!finalResearchQuestion.approvedByUser) {
      setError(t('steps.step2.locked'))
      return
    }

    setLoading(true)
    setError('')

    const refinementBlock = [
      userRefinementPrompt.trim()
        ? `${isPortuguese ? 'Instrucoes adicionais' : 'Additional instructions'}: ${userRefinementPrompt.trim()}`
        : '',
      userRefinementKeywords.trim()
        ? `${isPortuguese ? 'Palavras complementares' : 'Complementary keywords'}: ${userRefinementKeywords.trim()}`
        : '',
    ]
      .filter(Boolean)
      .join('\n')

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          stage: 1,
          promptId: 'step2',
          stepId: 'step2',
          stepLabel: t('workflow.step2_search_design.label'),
          topic,
          rq: finalResearchQuestion.question,
          finalResearchQuestion,
          content: refinementBlock
            ? `${isPortuguese ? 'Pergunta de investigacao' : 'Research question'}: ${finalResearchQuestion.question}\n${refinementBlock}`
            : undefined,
          locale,
        }),
      })

      const json = await res.json()
      const payload = json?.data ?? json

      if (!res.ok || !json?.ok) {
        throw new Error(json?.details || json?.error || t('api.genericFailure'))
      }

      const parsed = JSON.parse(payload.output)
      const nextSearchDesign: SearchDesign = {
        keywords: Array.isArray(parsed?.keywords) ? parsed.keywords : [],
        synonyms: Array.isArray(parsed?.synonyms) ? parsed.synonyms : [],
        booleanQuery: parsed?.boolean_query || '',
        searchStrings: Array.isArray(parsed?.search_strings) ? parsed.search_strings : [],
        recommendedDatabases: Array.isArray(parsed?.recommended_databases)
          ? parsed.recommended_databases
          : [],
        filters: Array.isArray(parsed?.filters) ? parsed.filters : [],
      }

      if (!nextSearchDesign.booleanQuery || nextSearchDesign.searchStrings.length === 0) {
        throw new Error(t('api.genericFailure'))
      }

      setSearchDesign(nextSearchDesign)
      clearSearchArticleSelection()
      await runRetrieval(nextSearchDesign.booleanQuery, 1, undefined, { replaceExisting: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('api.genericFailure'))
    } finally {
      setLoading(false)
    }
  }

  const changeProvider = async (nextProvider: Provider) => {
    setProvider(nextProvider)
    if (!searchDesign?.booleanQuery) return
    await runRetrieval(searchDesign.booleanQuery, 1, nextProvider)
  }

  const selectAllLoadedArticles = () => {
    const allIds = Array.from(new Set([...selectedSearchArticleIds, ...searchArticles.map((article) => article.id)]))
    setSelectedSearchArticleIds(allIds)
  }

  const loadMoreResults = async () => {
    if (!searchDesign?.booleanQuery || searchLoading || !hasNextPage) return
    await runRetrieval(searchDesign.booleanQuery, page + 1)
  }

  const loadAllRemainingResults = async () => {
    if (!searchDesign?.booleanQuery || searchLoading || bulkLoading || !hasNextPage) return

    setBulkLoading(true)
    let nextPage = page + 1
    let shouldContinue: boolean = hasNextPage
    let safetyCounter = 0

    while (shouldContinue && safetyCounter < 100) {
      const result = await runRetrieval(searchDesign.booleanQuery, nextPage)
      if (!result) break
      shouldContinue = result.hasNextPage
      nextPage = result.page + 1
      safetyCounter += 1
    }

    setBulkLoading(false)
  }

  const proceedToEvidence = () => {
    setWorkflowStep('step3_evidence_extraction')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-xl font-semibold">{t('steps.step2.title')}</h2>
        <p className="text-sm text-gray-600">{t('steps.step2.intro')}</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="mb-2 text-sm font-semibold text-slate-700">
          {t('steps.step2.currentQuestion')}
        </div>
        <div className="font-medium text-slate-900">
          {finalResearchQuestion?.question || t('common.noData')}
        </div>
        <div className="mt-3 text-sm text-slate-600">
          {isApproved ? t('steps.step2.statusApproved') : t('steps.step2.statusPending')}
        </div>
      </div>

      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
        <div className="mb-2 text-sm font-semibold text-indigo-800">
          {isPortuguese ? 'Refazer com contexto do utilizador' : 'Redo with user context'}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={userRefinementPrompt}
            onChange={(event) => setUserRefinementPrompt(event.target.value)}
            placeholder={
              isPortuguese
                ? 'Ex.: foco em estudos europeus e revisoes sistematicas'
                : 'e.g. focus on European studies and systematic reviews'
            }
            className="rounded border border-indigo-200 bg-white px-3 py-2 text-sm"
          />
          <input
            value={userRefinementKeywords}
            onChange={(event) => setUserRefinementKeywords(event.target.value)}
            placeholder={
              isPortuguese
                ? 'Ex.: health literacy, intervention design'
                : 'e.g. health literacy, intervention design'
            }
            className="rounded border border-indigo-200 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      {!isApproved && (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {t('steps.step2.locked')}
        </div>
      )}

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={runSearchDesign}
        disabled={loading || !isApproved}
        className="rounded bg-slate-900 px-4 py-3 text-white disabled:opacity-50"
      >
        {loading ? t('steps.step2.generating') : t('steps.step2.generateButton')}
      </button>

      {searchDesign && (
        <div className="space-y-5 rounded-xl border border-sky-200 bg-sky-50 p-5">
          <div>
            <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-sky-700">
              {t('steps.step2.keywords')}
            </div>
            <div className="flex flex-wrap gap-2">
              {searchDesign.keywords.map((keyword) => (
                <span key={keyword} className="rounded-full bg-white px-3 py-1 text-sm text-slate-900">
                  {keyword}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-sky-700">
              {t('steps.step2.synonyms')}
            </div>
            <div className="flex flex-wrap gap-2">
              {searchDesign.synonyms.map((synonym) => (
                <span key={synonym} className="rounded-full bg-white px-3 py-1 text-sm text-slate-900">
                  {synonym}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-sky-700">
              {t('steps.step2.booleanQuery')}
            </div>
            <div className="rounded border bg-white p-4 font-mono text-sm text-slate-900">
              {searchDesign.booleanQuery}
            </div>
          </div>

          <div className="space-y-3 rounded border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-800">{t('steps.step2.retrievalTitle')}</div>
              <div className="text-xs text-slate-600">
                {isPortuguese
                  ? `Paginacao: ${pageSize} resultados por pagina`
                  : `Paging: ${pageSize} results per page`}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-slate-700">
                {t('steps.step2.providerLabel')}:
                <select
                  value={provider}
                  onChange={(event) => void changeProvider(event.target.value as Provider)}
                  className="ml-2 rounded border border-slate-300 px-2 py-1 text-sm"
                >
                  <option value="rcaap">{providerLabel('rcaap')}</option>
                  <option value="semantic_scholar">{providerLabel('semantic_scholar')}</option>
                  <option value="crossref">{providerLabel('crossref')}</option>
                  <option value="openaire">{providerLabel('openaire')}</option>
                </select>
              </label>
              <button
                onClick={() => runRetrieval(searchDesign.booleanQuery, 1)}
                disabled={searchLoading}
                className="rounded bg-sky-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {searchLoading ? t('steps.step2.retrieving') : t('steps.step2.retrieveButton')}
              </button>
              <label className="text-sm text-slate-700">
                {isPortuguese ? 'Resultados por pagina' : 'Results per page'}:
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className="ml-2 rounded border border-slate-300 px-2 py-1 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={loadMoreResults}
                disabled={searchLoading || bulkLoading || !hasNextPage}
                className="rounded border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 disabled:opacity-50"
              >
                {isPortuguese ? 'Carregar mais' : 'Load more'}
              </button>
              <button
                onClick={loadAllRemainingResults}
                disabled={searchLoading || bulkLoading || !hasNextPage}
                className="rounded border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 disabled:opacity-50"
              >
                {bulkLoading
                  ? isPortuguese
                    ? 'A carregar todas as paginas...'
                    : 'Loading all pages...'
                  : isPortuguese
                    ? 'Carregar todas as paginas'
                    : 'Load all pages'}
              </button>
              <div className="ml-2 text-xs text-slate-600">
                {isPortuguese ? `Pagina ${page}` : `Page ${page}`}
                {typeof totalResults === 'number'
                  ? isPortuguese
                    ? ` de ~${Math.max(1, Math.ceil(totalResults / pageSize))}`
                    : ` of ~${Math.max(1, Math.ceil(totalResults / pageSize))}`
                  : ''}
              </div>
              <div className="text-xs text-slate-500">
                {isPortuguese
                  ? `${searchArticles.length} resultados carregados`
                  : `${searchArticles.length} results loaded`}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-800">
                {isPortuguese
                  ? `${selectedSearchArticleIds.length} selecionado(s) para analise`
                  : `${selectedSearchArticleIds.length} selected for analysis`}
              </div>
              <button
                onClick={selectAllLoadedArticles}
                type="button"
                className="rounded border border-indigo-300 bg-white px-3 py-1 text-xs font-semibold text-indigo-700"
              >
                {isPortuguese ? 'Selecionar todos os carregados' : 'Select all loaded'}
              </button>
              <button
                onClick={clearSearchArticleSelection}
                type="button"
                className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
              >
                {isPortuguese ? 'Limpar selecao' : 'Clear selection'}
              </button>
            </div>

            {searchArticles.length > 0 ? (
              <div className="space-y-3">
                {searchArticles.map((article, index) => (
                  <div
                    key={article.id}
                    className={`rounded border p-3 transition ${
                      selectedSearchArticleIds.includes(article.id)
                        ? 'border-indigo-300 bg-indigo-50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      {t('steps.step2.articleLabel')} {index + 1} | {article.provider}
                    </div>
                    <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-indigo-700">
                      <input
                        type="checkbox"
                        checked={selectedSearchArticleIds.includes(article.id)}
                        onChange={() => toggleSearchArticleSelection(article.id)}
                      />
                      {isPortuguese ? 'Selecionar para analise' : 'Select for analysis'}
                    </label>
                    <div className="mt-1 font-semibold text-slate-900">{article.title}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      {(article.authors || []).slice(0, 3).join(', ') || t('common.unknownAuthors')}
                      {article.year ? ` | ${article.year}` : ''}
                    </div>
                    <div className="mt-2 text-sm text-slate-700">
                      {article.abstract || t('common.noAbstract')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-600">
                {t('steps.step2.noArticles')}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={proceedToEvidence}
              disabled={searchArticles.length === 0 || selectedSearchArticleIds.length === 0}
              className="rounded bg-slate-900 px-4 py-3 text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {t('steps.step2.continueButton')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
