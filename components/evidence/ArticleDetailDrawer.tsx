'use client'

import Drawer from '@/components/ui/Drawer'
import { useI18n } from '@/components/I18nProvider'
import type { SearchArticle } from '@/types/research-workflow'

interface ArticleDetailDrawerProps {
  article: SearchArticle | null
  onClose: () => void
  /** Primary action for this article (analyse, select...), pinned below the text. */
  action?: React.ReactNode
}

function doiHref(doi: string): string {
  return `https://doi.org/${doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '')}`
}

/** Full metadata and abstract of a retrieved article, without leaving the list. */
export default function ArticleDetailDrawer({ article, onClose, action }: ArticleDetailDrawerProps) {
  const { locale, t } = useI18n()
  const isPortuguese = locale === 'pt-PT'
  if (!article) return null

  const linkClass = 'break-all font-medium text-[var(--primary)] underline'

  return (
    <Drawer
      open
      onClose={onClose}
      size="lg"
      title={isPortuguese ? 'Detalhes do artigo' : 'Article details'}
      closeLabel={isPortuguese ? 'Fechar' : 'Close'}
      footer={action}
    >
      <article className="space-y-4 text-sm text-[var(--on_surface)]">
        <div>
          <div className="font-label text-[10px] uppercase tracking-[0.12em] text-[var(--secondary)]">{article.provider}</div>
          <h3 className="mt-1 font-display text-lg font-semibold leading-snug">{article.title}</h3>
          <p className="mt-1 opacity-70">
            {(article.authors || []).join(', ') || t('common.unknownAuthors')}
            {article.year ? ` | ${article.year}` : ''}
          </p>
        </div>

        {(article.doi || article.url) && (
          <ul className="space-y-1">
            {article.doi && (
              <li>
                DOI:{' '}
                <a href={doiHref(article.doi)} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {article.doi}
                </a>
              </li>
            )}
            {article.url && (
              <li>
                URL:{' '}
                <a href={article.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {article.url}
                </a>
              </li>
            )}
          </ul>
        )}

        <div>
          <div className="mb-1 font-semibold">{isPortuguese ? 'Resumo' : 'Abstract'}</div>
          <p className="whitespace-pre-line leading-7">{article.abstract || t('common.noAbstract')}</p>
        </div>
      </article>
    </Drawer>
  )
}
