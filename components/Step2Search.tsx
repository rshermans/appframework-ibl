'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import type { SearchDesign } from '@/types/research-workflow'

export default function Step2Search() {
  const { finalResearchQuestion, projectId, searchDesign, setSearchDesign, topic } = useWizardStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isApproved = Boolean(finalResearchQuestion?.approvedByUser)

  const runSearchDesign = async () => {
    if (!finalResearchQuestion?.question) {
      setError('A final research question is required before designing the search strategy.')
      return
    }

    if (!finalResearchQuestion.approvedByUser) {
      setError('Approve the final research question before moving to search design.')
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
          stepLabel: 'Search Design',
          topic,
          rq: finalResearchQuestion.question,
          finalResearchQuestion,
        }),
      })

      const json = await res.json()
      const payload = json?.data ?? json

      if (!res.ok || !json?.ok) {
        throw new Error(json?.details || json?.error || 'Failed to generate search design')
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
        throw new Error('AI response did not include a valid search design payload')
      }

      setSearchDesign(nextSearchDesign)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate search design')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-xl font-semibold">Step 2 - Search Design</h2>
        <p className="text-sm text-gray-600">
          Turn the approved final research question into keywords, boolean strings, databases, and
          filters.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="mb-2 text-sm font-semibold text-slate-700">Current final research question</div>
        <div className="font-medium text-slate-900">
          {finalResearchQuestion?.question || 'No final research question available'}
        </div>
        <div className="mt-3 text-sm text-slate-600">
          Status: {isApproved ? 'Approved by user' : 'Pending user approval'}
        </div>
      </div>

      {!isApproved && (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Search design is locked until the final research question is explicitly approved in Step 1B.
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
        {loading ? 'Designing search strategy...' : 'Generate Search Design'}
      </button>

      {searchDesign && (
        <div className="space-y-5 rounded-xl border border-sky-200 bg-sky-50 p-5">
          <div>
            <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-sky-700">
              Keywords
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
              Synonyms
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
              Boolean Query
            </div>
            <div className="rounded border bg-white p-4 font-mono text-sm text-slate-900">
              {searchDesign.booleanQuery}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-sky-700">
              Ready-to-use Search Strings
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
                Recommended Databases
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
                Filters
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
        </div>
      )}
    </div>
  )
}
