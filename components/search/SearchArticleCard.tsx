'use client'

import { useI18n } from '@/components/I18nProvider'
import type { SearchArticle } from '@/types/research-workflow'

interface SearchArticleCardProps {
  article: SearchArticle
  /** 0-based position across all pages. */
  index: number
  selected: boolean
  onToggle: (articleId: string) => void
  onOpenDetails: (article: SearchArticle) => void
}

export default function SearchArticleCard({ article, index, selected, onToggle, onOpenDetails }: SearchArticleCardProps) {
  const { locale, t } = useI18n()
  const isPortuguese = locale === 'pt-PT'

  return (
    <div
      className={`p-4 transition-all duration-200 ${
        selected
          ? 'ai-user-decided rq-active-accent'
          : 'bg-[var(--surface_container)] ghost-border hover:bg-[var(--surface_container_low)]'
      }`}
    >
      <div className={`font-label text-[10px] uppercase tracking-[0.1em] ${
        selected ? 'text-[var(--on_primary)] opacity-70' : 'opacity-50'
      }`}>
        {t('steps.step2.articleLabel')} {index + 1} | {article.provider}
      </div>
      <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(article.id)}
        />
        {isPortuguese ? 'Selecionar para analise' : 'Select for analysis'}
      </label>
      <div className={`mt-1 font-semibold ${selected ? 'text-[var(--on_primary)]' : 'text-[var(--on_surface)]'}`}>{article.title}</div>
      <div className="mt-1 text-sm opacity-60">
        {(article.authors || []).slice(0, 3).join(', ') || t('common.unknownAuthors')}
        {article.year ? ` | ${article.year}` : ''}
      </div>
      <div className="mt-2 line-clamp-3 text-sm text-slate-700">
        {article.abstract || t('common.noAbstract')}
      </div>
      <button
        type="button"
        onClick={() => onOpenDetails(article)}
        aria-label={`${isPortuguese ? 'Ver detalhes' : 'View details'}: ${article.title}`}
        className="mt-2 min-h-[40px] rounded-[var(--radius-md)] bg-[var(--surface_container_lowest)] px-3 py-1.5 text-xs font-semibold text-[var(--on_surface)] ring-1 ring-[var(--outline_variant)] transition hover:bg-[var(--surface_container_low)]"
      >
        {isPortuguese ? 'Ver detalhes' : 'View details'}
      </button>
    </div>
  )
}
