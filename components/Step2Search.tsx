'use client'

import { useEffect, useRef, useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import type { SearchArticle, SearchDesign } from '@/types/research-workflow'
import { useI18n } from '@/components/I18nProvider'
import StepHeader from '@/components/StepHeader'
import QualityRating from '@/components/QualityRating'
import { parseAiJsonWithOptions } from '@/lib/parseAiJson'
import { safeFetch } from '@/lib/safeFetch'
import { persistInteractionEvent } from '@/lib/interactionClient'

type Provider = 'semantic_scholar' | 'crossref' | 'openaire' | 'arxiv' | 'pubmed'

const PROVIDER_SEQUENCE: Provider[] = ['crossref', 'openaire', 'semantic_scholar', 'arxiv', 'pubmed']

function mergeUniqueArticles(existing: SearchArticle[], incoming: SearchArticle[]): SearchArticle[] {
  const byId = new Map<string, SearchArticle>()
  existing.forEach((article) => byId.set(article.id, article))
  incoming.forEach((article) => byId.set(article.id, article))
  return Array.from(byId.values())
}

export default function Step2Search() {
  const { locale, t } = useI18n()
  const {
    addInteraction,
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
  const [provider, setProvider] = useState<Provider>('crossref')
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalResults, setTotalResults] = useState<number | undefined>(undefined)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [userRefinementPrompt, setUserRefinementPrompt] = useState('')
  const [userRefinementKeywords, setUserRefinementKeywords] = useState('')
  const [qualityRating, setQualityRating] = useState<number | null>(null)
  const [articleFilterText, setArticleFilterText] = useState('')
  const [articleDisplayPage, setArticleDisplayPage] = useState(1)
  const articlesRef = useRef<SearchArticle[]>(searchArticles)

  useEffect(() => {
    articlesRef.current = searchArticles
  }, [searchArticles])

  const isApproved = Boolean(finalResearchQuestion?.approvedByUser)
  const isPortuguese = locale === 'pt-PT'

  const ITEMS_PER_PAGE = 10
  const filteredArticles = searchArticles.filter((a) =>
    articleFilterText.trim() === '' ||
    a.title.toLowerCase().includes(articleFilterText.toLowerCase()) ||
    (a.authors || []).some((auth) => auth.toLowerCase().includes(articleFilterText.toLowerCase()))
  )
  const articleTotalDisplayPages = Math.max(1, Math.ceil(filteredArticles.length / ITEMS_PER_PAGE))
  const pagedDisplayArticles = filteredArticles.slice(
    (articleDisplayPage - 1) * ITEMS_PER_PAGE,
    articleDisplayPage * ITEMS_PER_PAGE
  )

  const providerLabel = (value: Provider) => {
    if (value === 'arxiv') return 'arXiv'
    if (value === 'pubmed') return 'PubMed / NCBI'
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
      const { response, json: payload } = await safeFetch('/api/search', {
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
      const data = payload?.data ?? payload

      if (!response.ok || !payload?.ok) {
        throw new Error((payload?.details || payload?.error || t('api.searchFailure')) as string)
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

  const runRetrievalAcrossProviders = async (
    query: string,
    requestedPage: number = 1,
    options: { replaceExisting?: boolean } = {}
  ): Promise<void> => {
    setSearchLoading(true)
    setError('')

    try {
      let mergedArticles = options.replaceExisting ? [] : articlesRef.current
      const providerErrors: string[] = []

      for (const providerCandidate of PROVIDER_SEQUENCE) {
        const { response, json: payload } = await safeFetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            limit: pageSize,
            page: requestedPage,
            provider: providerCandidate,
            locale,
          }),
        })

        const data = payload?.data ?? payload
        if (!response.ok || !payload?.ok) {
          providerErrors.push(providerLabel(providerCandidate))
          continue
        }

        const incomingArticles = Array.isArray(data.articles) ? data.articles : []
        mergedArticles = mergeUniqueArticles(mergedArticles, incomingArticles)
      }

      setSearchArticles(mergedArticles)
      articlesRef.current = mergedArticles
      setPage(requestedPage)
      setHasNextPage(false)
      setTotalResults(mergedArticles.length)

      if (providerErrors.length === PROVIDER_SEQUENCE.length) {
        throw new Error(
          isPortuguese
            ? 'Todos os fornecedores falharam nesta tentativa.'
            : 'All providers failed in this attempt.'
        )
      }

      if (providerErrors.length > 0) {
        setError(
          isPortuguese
            ? `Alguns fornecedores falharam: ${providerErrors.join(', ')}.`
            : `Some providers failed: ${providerErrors.join(', ')}.`
        )
      }
    } catch (err) {
      setTotalResults(undefined)
      setHasNextPage(false)
      setError(err instanceof Error ? err.message : t('api.searchFailure'))
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
      const { response: res, json } = await safeFetch('/api/ai', {
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
            ? `${isPortuguese ? 'Pergunta de investigacao' : 'Research question'}: ${finalResearchQuestion.question}\n${refinementBlock}\n\n${isPortuguese ? 'Devolve obrigatoriamente um JSON com os campos \"boolean_query\" (string nao vazia) e \"search_strings\" (array com pelo menos 2 entradas).' : 'You MUST return JSON with non-empty "boolean_query" (string) and "search_strings" (array with at least 2 entries).'}`
            : undefined,
          locale,
        }),
      })

      const payload = json?.data ?? json

      if (!res.ok || !json?.ok) {
        throw new Error((json?.details || json?.error || t('api.genericFailure')) as string)
      }

      const parsed = parseAiJsonWithOptions<{
        keywords?: string[]
        synonyms?: string[]
        boolean_query?: string
        booleanQuery?: string
        query?: string
        search_query?: string
        search_strings?: SearchDesign['searchStrings']
        searchStrings?: SearchDesign['searchStrings']
        strings?: SearchDesign['searchStrings']
        recommended_databases?: string[]
        recommendedDatabases?: string[]
        filters?: string[]
      }>(payload.output, {
        validate: (value) => {
          const booleanQuery = value?.boolean_query || value?.booleanQuery || value?.search_query || value?.query || ''
          const searchStrings =
            (Array.isArray(value?.search_strings) && value.search_strings) ||
            (Array.isArray(value?.searchStrings) && value.searchStrings) ||
            (Array.isArray(value?.strings) && value.strings) ||
            []
          return typeof booleanQuery === 'string' && booleanQuery.trim().length > 0 && searchStrings.length > 0
        },
        errorMessage: isPortuguese
          ? 'A IA devolveu um desenho de pesquisa incompleto. O resultado precisa de incluir boolean_query e search_strings utilizáveis.'
          : 'AI returned an incomplete search design. The result must include usable boolean_query and search_strings.',
      })

      const normalizedSearchStrings =
        (Array.isArray(parsed?.search_strings) && parsed.search_strings) ||
        (Array.isArray(parsed?.searchStrings) && parsed.searchStrings) ||
        (Array.isArray(parsed?.strings) && parsed.strings) ||
        []

      const normalizedBooleanQuery =
        parsed?.boolean_query || parsed?.booleanQuery || parsed?.search_query || parsed?.query || ''

      // Fallback: build boolean_query from keywords if model omitted it
      const fallbackBooleanQuery = normalizedBooleanQuery
        || (Array.isArray(parsed?.keywords) && parsed.keywords.length > 0
          ? parsed.keywords.join(' AND ')
          : '')

      // Fallback: build a single search_strings entry from the boolean query
      const fallbackSearchStrings = normalizedSearchStrings.length > 0
        ? normalizedSearchStrings
        : fallbackBooleanQuery
          ? [{ database: 'General', query: fallbackBooleanQuery }]
          : []

      const nextSearchDesign: SearchDesign = {
        keywords: Array.isArray(parsed?.keywords) ? parsed.keywords : [],
        synonyms: Array.isArray(parsed?.synonyms) ? parsed.synonyms : [],
        booleanQuery: fallbackBooleanQuery,
        searchStrings: fallbackSearchStrings,
        recommendedDatabases: Array.isArray(parsed?.recommended_databases)
          ? parsed.recommended_databases
          : Array.isArray(parsed?.recommendedDatabases)
            ? parsed.recommendedDatabases
          : [],
        filters: Array.isArray(parsed?.filters) ? parsed.filters : [],
      }

      if (!nextSearchDesign.booleanQuery || nextSearchDesign.searchStrings.length === 0) {
        throw new Error(
          isPortuguese
            ? 'A IA devolveu JSON sem os campos obrigatorios (boolean_query e search_strings). Tente um refinamento mais especifico.'
            : 'AI returned JSON without required fields (boolean_query and search_strings). Try a more specific refinement.'
        )
      }

      setSearchDesign(nextSearchDesign)
      clearSearchArticleSelection()
      addInteraction({
        id: `interaction-${Date.now()}`,
        stage: 1,
        stepId: 'step2_search_design',
        stepLabel: t('workflow.step2_search_design.label'),
        promptId: 'step2',
        eventType: searchDesign ? 'redo' : 'generate',
        userInput: refinementBlock || finalResearchQuestion.question,
        aiOutput: JSON.stringify(nextSearchDesign),
        mode: 'standard',
        success: true,
        metadata: {
          keywordCount: nextSearchDesign.keywords.length,
          searchStringCount: nextSearchDesign.searchStrings.length,
        },
        createdAt: new Date().toISOString(),
      })
      await runRetrievalAcrossProviders(nextSearchDesign.booleanQuery, 1, { replaceExisting: true })
    } catch (err) {
      addInteraction({
        id: `interaction-${Date.now()}`,
        stage: 1,
        stepId: 'step2_search_design',
        stepLabel: t('workflow.step2_search_design.label'),
        promptId: 'step2',
        eventType: searchDesign ? 'redo' : 'generate',
        userInput: refinementBlock || finalResearchQuestion.question,
        aiOutput: err instanceof Error ? err.message : t('api.genericFailure'),
        mode: 'standard',
        success: false,
        createdAt: new Date().toISOString(),
      })
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

  const handleQualityRating = (rating: number) => {
    setQualityRating(rating)
    if (!searchDesign) return

    addInteraction({
      id: `interaction-${Date.now()}`,
      stage: 1,
      stepId: 'step2_search_design',
      stepLabel: t('workflow.step2_search_design.label'),
      promptId: 'step2',
      eventType: 'rate',
      userInput: finalResearchQuestion?.question || topic,
      aiOutput: searchDesign.booleanQuery,
      mode: 'standard',
      success: true,
      metadata: {
        rating,
        searchStringCount: searchDesign.searchStrings.length,
      },
      createdAt: new Date().toISOString(),
    })

    if (projectId) {
      void persistInteractionEvent({
        projectId,
        stage: 1,
        stepId: 'step2_search_design',
        stepLabel: t('workflow.step2_search_design.label'),
        userInput: finalResearchQuestion?.question || topic,
        aiOutput: JSON.stringify({
          eventType: 'rate',
          rating,
          booleanQuery: searchDesign.booleanQuery,
          searchStringCount: searchDesign.searchStrings.length,
        }),
        topic,
        mode: 'standard',
        locale,
      }).catch(() => null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <StepHeader
          stepId="step2_search_design"
          title={t('steps.step2.title')}
          subtitle={t('steps.step2.intro')}
        />
      </div>

      <div className="tonal-card rq-active-accent p-4">
        <div className="font-label mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--on_surface)] opacity-60">
          {t('steps.step2.currentQuestion')}
        </div>
        <div className="font-semibold text-[var(--on_surface)]">
          {finalResearchQuestion?.question || t('common.noData')}
        </div>
        <div className="mt-3 text-sm opacity-60">
          {isApproved ? t('steps.step2.statusApproved') : t('steps.step2.statusPending')}
        </div>
      </div>

      <div className="bg-[var(--surface_container_low)] p-4">
        <div className="mb-2 text-sm font-semibold text-[var(--on_surface)]">
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
            className="ghost-input"
          />
          <input
            value={userRefinementKeywords}
            onChange={(event) => setUserRefinementKeywords(event.target.value)}
            placeholder={
              isPortuguese
                ? 'Ex.: health literacy, intervention design'
                : 'e.g. health literacy, intervention design'
            }
            className="ghost-input"
          />
        </div>
      </div>

      {!isApproved && (
        <div className="ai-needs-validation rounded-[var(--radius-md)] p-3 text-sm">
          {t('steps.step2.locked')}
        </div>
      )}

      {error && (
        <div className="ai-needs-validation rounded-[var(--radius-md)] p-3 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={runSearchDesign}
        disabled={loading || !isApproved}
        className="primary-gradient rounded-[var(--radius-md)] px-5 py-3 font-semibold text-[var(--on_primary)] transition hover:brightness-110 disabled:opacity-50"
      >
        {loading ? t('steps.step2.generating') : t('steps.step2.generateButton')}
      </button>

      {searchDesign && (
        <div className="tonal-card space-y-6 p-6">
          <QualityRating
            label={isPortuguese ? 'Como avalias este desenho de pesquisa?' : 'How do you rate this search design?'}
            helperText={isPortuguese ? '1 = refazer quase tudo, 5 = pronto para usar.' : '1 = needs a major redo, 5 = ready to use.'}
            value={qualityRating}
            onChange={handleQualityRating}
          />

          <div>
            <div className="font-label mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--secondary)]">
              {t('steps.step2.keywords')}
            </div>
            <div className="flex flex-wrap gap-2">
              {searchDesign.keywords.map((keyword) => (
                <span key={keyword} className="bg-[var(--surface_container_low)] px-3 py-1 text-sm text-[var(--on_surface)]">
                  {keyword}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="font-label mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--secondary)]">
              {t('steps.step2.synonyms')}
            </div>
            <div className="flex flex-wrap gap-2">
              {searchDesign.synonyms.map((synonym) => (
                <span key={synonym} className="bg-[var(--surface_container_low)] px-3 py-1 text-sm text-[var(--on_surface)]">
                  {synonym}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="font-label mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--secondary)]">
              {t('steps.step2.booleanQuery')}
            </div>
            <div className="bg-[var(--surface_container_high)] p-4 font-mono text-sm text-[var(--on_surface)]">
              {searchDesign.booleanQuery}
            </div>
          </div>

          <div className="space-y-3 bg-[var(--surface_container_low)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-800">{t('steps.step2.retrievalTitle')}</div>
              <div className="text-xs text-slate-600">
                {isPortuguese
                  ? `Paginacao: ${pageSize} resultados por pagina`
                  : `Paging: ${pageSize} results per page`}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-[var(--on_surface)]">
                {t('steps.step2.providerLabel')}:
                <select
                  value={provider}
                  onChange={(event) => void changeProvider(event.target.value as Provider)}
                  className="ghost-input ml-2 inline-block w-auto"
                >
                  <option value="crossref">{providerLabel('crossref')}</option>
                  <option value="openaire">{providerLabel('openaire')}</option>
                  <option value="semantic_scholar">{providerLabel('semantic_scholar')}</option>
                  <option value="arxiv">{providerLabel('arxiv')}</option>
                  <option value="pubmed">{providerLabel('pubmed')}</option>
                </select>
              </label>
              <button
                onClick={() => runRetrieval(searchDesign.booleanQuery, 1)}
                disabled={searchLoading}
                className="primary-gradient rounded-[var(--radius-md)] px-3 py-2 text-sm font-semibold text-[var(--on_primary)] transition hover:brightness-110 disabled:opacity-50"
              >
                {searchLoading ? t('steps.step2.retrieving') : t('steps.step2.retrieveButton')}
              </button>
              <label className="text-sm text-[var(--on_surface)] opacity-70">
                {isPortuguese ? 'Resultados por pagina' : 'Results per page'}:
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className="ghost-input ml-2 inline-block w-auto"
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
                className="bg-[var(--surface_container)] px-3 py-1.5 text-sm text-[var(--on_surface)] transition hover:bg-[var(--surface_container_high)] disabled:opacity-40"
              >
                {isPortuguese ? 'Carregar mais' : 'Load more'}
              </button>
              <button
                onClick={loadAllRemainingResults}
                disabled={searchLoading || bulkLoading || !hasNextPage}
                className="bg-[var(--surface_container)] px-3 py-1.5 text-sm text-[var(--on_surface)] transition hover:bg-[var(--surface_container_high)] disabled:opacity-40"
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
              <div className="rounded-[var(--radius-md)] bg-[var(--secondary_container)] px-2 py-1 text-xs font-semibold text-[var(--on_secondary_container)]">
                {isPortuguese
                  ? `${selectedSearchArticleIds.length} selecionado(s) para analise`
                  : `${selectedSearchArticleIds.length} selected for analysis`}
              </div>
              <button
                onClick={selectAllLoadedArticles}
                type="button"
                className="bg-[var(--surface_container)] px-3 py-1 text-xs font-semibold text-[var(--on_surface)] transition hover:bg-[var(--surface_container_high)]"
              >
                {isPortuguese ? 'Selecionar todos os carregados' : 'Select all loaded'}
              </button>
              <button
                onClick={clearSearchArticleSelection}
                type="button"
                className="bg-[var(--surface_container)] px-3 py-1 text-xs font-semibold text-[var(--on_surface)] transition hover:bg-[var(--surface_container_high)]"
              >
                {isPortuguese ? 'Limpar selecao' : 'Clear selection'}
              </button>
            </div>

            {searchArticles.length > 10 && (
              <input
                value={articleFilterText}
                onChange={(e) => { setArticleFilterText(e.target.value); setArticleDisplayPage(1) }}
                placeholder={isPortuguese ? 'Filtrar por título ou autor…' : 'Filter by title or author…'}
                className="ghost-input w-full"
              />
            )}
            {searchArticles.length > 0 ? (
              <div className="space-y-3">
                {pagedDisplayArticles.map((article, index) => {
                  const globalIndex = (articleDisplayPage - 1) * ITEMS_PER_PAGE + index
                  return (
                    <div
                      key={article.id}
                      className={`p-4 transition-all duration-200 ${
                        selectedSearchArticleIds.includes(article.id)
                          ? 'ai-user-decided rq-active-accent'
                          : 'bg-[var(--surface_container)] ghost-border hover:bg-[var(--surface_container_low)]'
                      }`}
                    >
                      <div className={`font-label text-[10px] uppercase tracking-[0.1em] ${
                        selectedSearchArticleIds.includes(article.id) ? 'text-[var(--on_primary)] opacity-70' : 'opacity-50'
                      }`}>
                        {t('steps.step2.articleLabel')} {globalIndex + 1} | {article.provider}
                      </div>
                      <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold">
                        <input
                          type="checkbox"
                          checked={selectedSearchArticleIds.includes(article.id)}
                          onChange={() => toggleSearchArticleSelection(article.id)}
                        />
                        {isPortuguese ? 'Selecionar para analise' : 'Select for analysis'}
                      </label>
                      <div className={`mt-1 font-semibold ${selectedSearchArticleIds.includes(article.id) ? 'text-[var(--on_primary)]' : 'text-[var(--on_surface)]'}`}>{article.title}</div>
                      <div className="mt-1 text-sm opacity-60">
                        {(article.authors || []).slice(0, 3).join(', ') || t('common.unknownAuthors')}
                        {article.year ? ` | ${article.year}` : ''}
                      </div>
                      <div className="mt-2 text-sm text-slate-700">
                        {article.abstract || t('common.noAbstract')}
                      </div>
                    </div>
                  )
                })}
                {articleTotalDisplayPages > 1 && (
                  <div className="flex items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      disabled={articleDisplayPage === 1}
                      onClick={() => setArticleDisplayPage((p) => p - 1)}
                      className="rounded-[var(--radius-md)] border border-[var(--outline_variant)] px-3 py-1.5 text-xs disabled:opacity-40"
                    >
                      {isPortuguese ? '← Anterior' : '← Prev'}
                    </button>
                    <span className="text-xs text-[var(--on_surface_variant)]">
                      {isPortuguese
                        ? `Página ${articleDisplayPage} de ${articleTotalDisplayPages} · ${filteredArticles.length} artigos`
                        : `Page ${articleDisplayPage} of ${articleTotalDisplayPages} · ${filteredArticles.length} articles`}
                    </span>
                    <button
                      type="button"
                      disabled={articleDisplayPage === articleTotalDisplayPages}
                      onClick={() => setArticleDisplayPage((p) => p + 1)}
                      className="rounded-[var(--radius-md)] border border-[var(--outline_variant)] px-3 py-1.5 text-xs disabled:opacity-40"
                    >
                      {isPortuguese ? 'Seguinte →' : 'Next →'}
                    </button>
                  </div>
                )}
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
              className="primary-gradient rounded-[var(--radius-md)] px-5 py-3 font-semibold text-[var(--on_primary)] transition hover:brightness-110 disabled:opacity-50"
            >
              {t('steps.step2.continueButton')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
