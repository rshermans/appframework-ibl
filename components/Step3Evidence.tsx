'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import { useI18n } from '@/components/I18nProvider'
import StepHeader from '@/components/StepHeader'
import Pager from '@/components/Pager'
import ArticleAnalysisCard from '@/components/evidence/ArticleAnalysisCard'
import EvidenceRecordRow from '@/components/evidence/EvidenceRecordRow'
import EvidenceDetailDrawer from '@/components/evidence/EvidenceDetailDrawer'
import ArticleDetailDrawer from '@/components/evidence/ArticleDetailDrawer'
import { useEvidenceExtraction } from '@/components/evidence/useEvidenceExtraction'
import { useRelatedArticles } from '@/components/evidence/useRelatedArticles'
import {
  ITEMS_PER_PAGE,
  buildSourcePayload,
  filterArticlesByText,
  filterEvidenceByText,
  paginate,
  type Provider,
} from '@/lib/evidenceHelpers'

export default function Step3Evidence() {
  const { locale, t } = useI18n()
  const {
    evidenceRecords,
    finalResearchQuestion,
    selectedSearchArticleIds,
    searchArticles,
    searchDesign,
    setWorkflowStep,
  } = useWizardStore()
  const {
    sourceText,
    setSourceText,
    loading,
    error,
    setError,
    activeSourceId,
    analyzedSourceIds,
    extractFromSource,
    runManualExtraction,
  } = useEvidenceExtraction()
  const {
    relatedLoading,
    relatedProvider,
    setRelatedProvider,
    relatedQueryInput,
    setRelatedQueryInput,
    relatedFeedback,
    fetchRelatedArticles,
  } = useRelatedArticles(setError)
  const [articleFilterText, setArticleFilterText] = useState('')
  const [articlePage, setArticlePage] = useState(1)
  const [evidenceFilterText, setEvidenceFilterText] = useState('')
  const [evidencePage, setEvidencePage] = useState(1)
  const [openEvidenceId, setOpenEvidenceId] = useState<string | null>(null)
  const [openArticleId, setOpenArticleId] = useState<string | null>(null)
  const openArticle = searchArticles.find((candidate) => candidate.id === openArticleId) ?? null

  const canRun = Boolean(finalResearchQuestion?.approvedByUser && searchDesign)
  const isPortuguese = locale === 'pt-PT'
  const articlesForAnalysis =
    selectedSearchArticleIds.length > 0
      ? searchArticles.filter((article) => selectedSearchArticleIds.includes(article.id))
      : searchArticles

  const filteredArticlesForAnalysis = filterArticlesByText(articlesForAnalysis, articleFilterText)
  const { totalPages: articleTotalPages, pageItems: pagedArticles } = paginate(
    filteredArticlesForAnalysis,
    articlePage
  )
  const filteredEvidenceRecords = filterEvidenceByText(evidenceRecords, evidenceFilterText)
  const { totalPages: evidenceTotalPages, pageItems: pagedEvidenceRecords } = paginate(
    filteredEvidenceRecords,
    evidencePage
  )

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
        {articlesForAnalysis.length > 10 && (
          <input
            value={articleFilterText}
            onChange={(e) => { setArticleFilterText(e.target.value); setArticlePage(1) }}
            placeholder={isPortuguese ? 'Filtrar por título ou autor…' : 'Filter by title or author…'}
            className="ghost-input w-full"
          />
        )}
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
            {pagedArticles.map((article, index) => (
              <ArticleAnalysisCard
                key={article.id}
                article={article}
                index={(articlePage - 1) * ITEMS_PER_PAGE + index}
                isCurrent={activeSourceId === article.id}
                isAnalyzed={analyzedSourceIds.has(article.id)}
                loading={loading}
                canRun={canRun}
                onAnalyze={(target) => extractFromSource(buildSourcePayload(target), target.id, target)}
                onOpenDetails={(target) => setOpenArticleId(target.id)}
              />
            ))}
            <Pager
              page={articlePage}
              totalPages={articleTotalPages}
              summary={
                isPortuguese
                  ? `Página ${articlePage} de ${articleTotalPages} · ${filteredArticlesForAnalysis.length} artigos`
                  : `Page ${articlePage} of ${articleTotalPages} · ${filteredArticlesForAnalysis.length} articles`
              }
              prevLabel={isPortuguese ? '← Anterior' : '← Prev'}
              nextLabel={isPortuguese ? 'Seguinte →' : 'Next →'}
              onChange={setArticlePage}
            />
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

        <input
          value={relatedQueryInput}
          onChange={(event) => setRelatedQueryInput(event.target.value)}
          placeholder={
            isPortuguese
              ? 'Palavras-chave adicionais para procurar novos artigos (opcional)'
              : 'Additional keywords to search for new articles (optional)'
          }
          className="ghost-input w-full"
        />

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-[var(--on_surface)] opacity-70">
            {isPortuguese ? 'Fonte relacionada' : 'Related source'}:
            <select
              value={relatedProvider}
              onChange={(event) => setRelatedProvider(event.target.value as Provider)}
              className="ml-2 ghost-input inline-block w-auto"
            >
              <option value="crossref">Crossref</option>
              <option value="openaire">OpenAIRE Graph</option>
              <option value="semantic_scholar">Semantic Scholar</option>
              <option value="arxiv">arXiv</option>
              <option value="pubmed">PubMed / NCBI</option>
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

          {evidenceRecords.length > 10 && (
            <input
              value={evidenceFilterText}
              onChange={(e) => { setEvidenceFilterText(e.target.value); setEvidencePage(1) }}
              placeholder={isPortuguese ? 'Filtrar evidências por título ou tese…' : 'Filter evidence by title or claim…'}
              className="ghost-input w-full"
            />
          )}

          {pagedEvidenceRecords.map((record, index) => (
            <EvidenceRecordRow
              key={record.id}
              record={record}
              index={(evidencePage - 1) * ITEMS_PER_PAGE + index}
              onOpen={(target) => setOpenEvidenceId(target.id)}
            />
          ))}

          <Pager
            page={evidencePage}
            totalPages={evidenceTotalPages}
            summary={
              isPortuguese
                ? `Página ${evidencePage} de ${evidenceTotalPages} · ${filteredEvidenceRecords.length} evidências`
                : `Page ${evidencePage} of ${evidenceTotalPages} · ${filteredEvidenceRecords.length} evidence records`
            }
            prevLabel={isPortuguese ? '← Anterior' : '← Prev'}
            nextLabel={isPortuguese ? 'Seguinte →' : 'Next →'}
            onChange={setEvidencePage}
          />

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

      <EvidenceDetailDrawer
        records={filteredEvidenceRecords}
        openId={openEvidenceId}
        onNavigate={setOpenEvidenceId}
        onClose={() => setOpenEvidenceId(null)}
      />
      <ArticleDetailDrawer
        article={openArticle}
        onClose={() => setOpenArticleId(null)}
        action={
          openArticle ? (
            <button
              type="button"
              disabled={!canRun || loading}
              onClick={() => {
                setOpenArticleId(null)
                void extractFromSource(buildSourcePayload(openArticle), openArticle.id, openArticle)
              }}
              className="primary-gradient min-h-[44px] w-full rounded-[var(--radius-md)] px-4 text-sm font-semibold text-[var(--on_primary)] transition hover:brightness-110 disabled:opacity-50"
            >
              {analyzedSourceIds.has(openArticle.id)
                ? isPortuguese ? 'Reanalisar este artigo' : 'Reanalyse this article'
                : t('steps.step3.analyzeButton')}
            </button>
          ) : null
        }
      />
    </div>
  )
}
