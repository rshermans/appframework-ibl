'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import type { SearchDesign } from '@/types/research-workflow'
import { useI18n } from '@/components/I18nProvider'

export default function Step2Search() {
  const { locale, t } = useI18n()
  const {
    finalResearchQuestion,
    projectId,
    searchDesign,
    searchArticles,
    setSearchArticles,
    setSearchDesign,
    setWorkflowStep,
    topic,
  } = useWizardStore()
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [provider, setProvider] = useState<'semantic_scholar' | 'crossref'>('semantic_scholar')
  const [error, setError] = useState('')

  const isApproved = Boolean(finalResearchQuestion?.approvedByUser)

  const runRetrieval = async (query: string) => {
    setSearchLoading(true)
    setError('')

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          limit: 5,
          provider,
          locale,
        }),
      })
      const payload = await response.json()
      const data = payload?.data ?? payload

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.details || payload?.error || t('api.searchFailure'))
      }

      setSearchArticles(Array.isArray(data.articles) ? data.articles : [])
    } catch (err) {
      setSearchArticles([])
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
      await runRetrieval(nextSearchDesign.booleanQuery)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('api.genericFailure'))
    } finally {
      setLoading(false)
    }
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

          <div>
            <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-sky-700">
              {t('steps.step2.searchStrings')}
            </div>
            <div className="space-y-3">
              {searchDesign.searchStrings.map((item) => (
                <div key={`${item.database}-${item.query}`} className="rounded border bg-white p-4">
                  <div className="mb-2 font-semibold text-slate-900">{item.database}</div>
                  <div className="font-mono text-sm text-slate-700">{item.query}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-sky-700">
                {t('steps.step2.recommendedDatabases')}
              </div>
              <ul className="space-y-2 text-sm text-slate-800">
                {searchDesign.recommendedDatabases.map((database) => (
                  <li key={database} className="rounded border bg-white px-3 py-2">
                    {database}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-sky-700">
                {t('steps.step2.filters')}
              </div>
              <ul className="space-y-2 text-sm text-slate-800">
                {searchDesign.filters.map((filter) => (
                  <li key={filter} className="rounded border bg-white px-3 py-2">
                    {filter}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-3 rounded border border-slate-200 bg-white p-4">
            <div className="text-sm font-semibold text-slate-800">{t('steps.step2.retrievalTitle')}</div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-slate-700">
                {t('steps.step2.providerLabel')}:
                <select
                  value={provider}
                  onChange={(event) =>
                    setProvider(event.target.value as 'semantic_scholar' | 'crossref')
                  }
                  className="ml-2 rounded border border-slate-300 px-2 py-1 text-sm"
                >
                  <option value="semantic_scholar">Semantic Scholar</option>
                  <option value="crossref">Crossref</option>
                </select>
              </label>
              <button
                onClick={() => runRetrieval(searchDesign.booleanQuery)}
                disabled={searchLoading}
                className="rounded bg-sky-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {searchLoading ? t('steps.step2.retrieving') : t('steps.step2.retrieveButton')}
              </button>
            </div>

            {searchArticles.length > 0 ? (
              <div className="space-y-3">
                {searchArticles.map((article, index) => (
                  <div key={article.id} className="rounded border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      {t('steps.step2.articleLabel')} {index + 1} | {article.provider}
                    </div>
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
              onClick={() => setWorkflowStep('step3_evidence_extraction')}
              disabled={searchArticles.length === 0}
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
