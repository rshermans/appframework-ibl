'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import type { SearchDesign } from '@/types/research-workflow'
import { useI18n } from '@/components/I18nProvider'
import StepHeader from '@/components/StepHeader'
import QualityRating from '@/components/QualityRating'
import Pager from '@/components/Pager'
import SearchArticleCard from '@/components/search/SearchArticleCard'
import { useSearchRetrieval } from '@/components/search/useSearchRetrieval'
import { parseAiJsonWithOptions } from '@/lib/parseAiJson'
import { safeFetch } from '@/lib/safeFetch'
import { persistInteractionEvent } from '@/lib/interactionClient'
import { ITEMS_PER_PAGE, filterArticlesByText, paginate } from '@/lib/evidenceHelpers'
import { providerLabel, type Provider } from '@/lib/searchProviders'
import { isUsableRawSearchDesign, normalizeSearchDesign, type RawSearchDesign } from '@/lib/searchDesign'

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
  const [error, setError] = useState('')
  const [userRefinementPrompt, setUserRefinementPrompt] = useState('')
  const [userRefinementKeywords, setUserRefinementKeywords] = useState('')
  const [qualityRating, setQualityRating] = useState<number | null>(null)
  const [articleFilterText, setArticleFilterText] = useState('')
  const [articleDisplayPage, setArticleDisplayPage] = useState(1)
  const {
    searchLoading,
    provider,
    page,
    pageSize,
    setPageSize,
    totalResults,
    hasNextPage,
    bulkLoading,
    runRetrieval,
    runRetrievalAcrossProviders,
    changeProvider,
    selectAllLoadedArticles,
    loadMoreResults,
    loadAllRemainingResults,
  } = useSearchRetrieval(setError)

  const isApproved = Boolean(finalResearchQuestion?.approvedByUser)
  const isPortuguese = locale === 'pt-PT'

  const filteredArticles = filterArticlesByText(searchArticles, articleFilterText)
  const { totalPages: articleTotalDisplayPages, pageItems: pagedDisplayArticles } = paginate(
    filteredArticles,
    articleDisplayPage
  )

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

      const parsed = parseAiJsonWithOptions<RawSearchDesign>(payload.output, {
        validate: (value) => isUsableRawSearchDesign(value),
        errorMessage: isPortuguese
          ? 'A IA devolveu um desenho de pesquisa incompleto. O resultado precisa de incluir boolean_query e search_strings utilizáveis.'
          : 'AI returned an incomplete search design. The result must include usable boolean_query and search_strings.',
      })

      const nextSearchDesign: SearchDesign = normalizeSearchDesign(parsed)

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
                {pagedDisplayArticles.map((article, index) => (
                  <SearchArticleCard
                    key={article.id}
                    article={article}
                    index={(articleDisplayPage - 1) * ITEMS_PER_PAGE + index}
                    selected={selectedSearchArticleIds.includes(article.id)}
                    onToggle={toggleSearchArticleSelection}
                  />
                ))}
                <Pager
                  page={articleDisplayPage}
                  totalPages={articleTotalDisplayPages}
                  summary={
                    isPortuguese
                      ? `Página ${articleDisplayPage} de ${articleTotalDisplayPages} · ${filteredArticles.length} artigos`
                      : `Page ${articleDisplayPage} of ${articleTotalDisplayPages} · ${filteredArticles.length} articles`
                  }
                  prevLabel={isPortuguese ? '← Anterior' : '← Prev'}
                  nextLabel={isPortuguese ? 'Seguinte →' : 'Next →'}
                  onChange={setArticleDisplayPage}
                />
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
