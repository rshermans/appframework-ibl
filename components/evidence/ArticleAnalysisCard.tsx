'use client'

import { useI18n } from '@/components/I18nProvider'
import type { SearchArticle } from '@/types/research-workflow'

interface ArticleAnalysisCardProps {
  article: SearchArticle
  /** 0-based position across all pages. */
  index: number
  isCurrent: boolean
  isAnalyzed: boolean
  loading: boolean
  canRun: boolean
  onAnalyze: (article: SearchArticle) => void
}

export default function ArticleAnalysisCard({
  article,
  index,
  isCurrent,
  isAnalyzed,
  loading,
  canRun,
  onAnalyze,
}: ArticleAnalysisCardProps) {
  const { locale, t } = useI18n()
  const isPortuguese = locale === 'pt-PT'

  return (
        <div
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
              onClick={() => onAnalyze(article)}
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
}
