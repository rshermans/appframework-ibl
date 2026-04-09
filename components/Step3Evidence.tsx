'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import type { EvidenceRecord, SearchArticle } from '@/types/research-workflow'

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

export default function Step3Evidence() {
  const {
    addEvidenceRecord,
    evidenceRecords,
    finalResearchQuestion,
    projectId,
    searchArticles,
    searchDesign,
    setWorkflowStep,
    topic,
  } = useWizardStore()
  const [sourceText, setSourceText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null)

  const canRun = Boolean(finalResearchQuestion?.approvedByUser && searchDesign)

  const extractFromSource = async (source: string, sourceId: string) => {
    if (!finalResearchQuestion?.question) {
      setError('A final research question is required before extracting evidence.')
      return
    }

    if (!searchDesign) {
      setError('Generate the search design before extracting evidence.')
      return
    }

    if (!source.trim()) {
      setError('A source text is required for extraction.')
      return
    }

    setLoading(true)
    setActiveSourceId(sourceId)
    setError('')

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          stage: 1,
          promptId: 'step4',
          stepId: 'step3',
          stepLabel: 'Evidence Extraction',
          topic,
          rq: finalResearchQuestion.question,
          finalResearchQuestion,
          searchDesign,
          source,
        }),
      })

      const json = await res.json()
      const payload = json?.data ?? json

      if (!res.ok || !json?.ok) {
        throw new Error(json?.details || json?.error || 'Failed to extract evidence')
      }

      const parsed = JSON.parse(payload.output)
      const nextEvidenceRecord: EvidenceRecord = {
        id: `evidence-${Date.now()}`,
        title: parsed?.title || 'Untitled source',
        sourceType: parsed?.source_type || 'unknown',
        claim: parsed?.claim || '',
        methodology: parsed?.methodology || '',
        findings: Array.isArray(parsed?.findings) ? parsed.findings : [],
        limitations: Array.isArray(parsed?.limitations) ? parsed.limitations : [],
        relevanceScore:
          typeof parsed?.relevance_score === 'number' ? parsed.relevance_score : 0,
        citation: parsed?.citation || '',
      }

      if (!nextEvidenceRecord.claim || nextEvidenceRecord.findings.length === 0) {
        throw new Error('AI response did not include a valid evidence record')
      }

      addEvidenceRecord(nextEvidenceRecord)
      if (sourceId === 'manual') {
        setSourceText('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract evidence')
    } finally {
      setLoading(false)
      setActiveSourceId(null)
    }
  }

  const runManualExtraction = async () => {
    await extractFromSource(sourceText, 'manual')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-xl font-semibold">Step 3 - Evidence Extraction</h2>
        <p className="text-sm text-gray-600">
          Analyse retrieved scientific articles with one click, or paste custom text when needed.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="mb-2 text-sm font-semibold text-slate-700">Research anchor</div>
        <div className="font-medium text-slate-900">
          {finalResearchQuestion?.question || 'No final research question available'}
        </div>
      </div>

      {!canRun && (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Evidence extraction is locked until the final research question is approved and a search
          design exists.
        </div>
      )}

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          Retrieved Articles
        </div>
        {searchArticles.length === 0 ? (
          <div className="text-sm text-slate-600">
            No retrieved articles available. Go back to Step 2 and run article retrieval.
          </div>
        ) : (
          <div className="space-y-3">
            {searchArticles.map((article, index) => {
              const sourceId = `article-${article.id}`
              const isCurrent = activeSourceId === sourceId
              return (
                <div key={article.id} className="rounded border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Article {index + 1} | {article.provider}
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">{article.title}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {(article.authors || []).slice(0, 4).join(', ') || 'Unknown authors'}
                    {article.year ? ` | ${article.year}` : ''}
                  </div>
                  <div className="mt-2 text-sm text-slate-700">
                    {article.abstract || 'No abstract available.'}
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() => extractFromSource(buildSourcePayload(article), sourceId)}
                      disabled={!canRun || loading}
                      className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {isCurrent && loading ? 'Analysing...' : 'Analyse this article'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          Manual Source Fallback
        </div>
        <textarea
          value={sourceText}
          onChange={(event) => setSourceText(event.target.value)}
          rows={8}
          disabled={!canRun || loading}
          placeholder="Paste a custom source abstract, excerpt, or notes."
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
        />
        <button
          onClick={runManualExtraction}
          disabled={!canRun || loading || !sourceText.trim()}
          className="rounded bg-slate-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {activeSourceId === 'manual' && loading ? 'Analysing...' : 'Analyse Manual Source'}
        </button>
      </div>

      {evidenceRecords.length > 0 && (
        <div className="space-y-4">
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Extracted Evidence Records
          </div>

          {evidenceRecords.map((record, index) => (
            <div key={record.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">
                Evidence {index + 1}
              </div>
              <div className="text-lg font-semibold text-slate-900">{record.title}</div>
              <div className="mt-2 text-sm text-slate-600">
                Type: {record.sourceType} | Relevance: {record.relevanceScore}/5
              </div>

              <div className="mt-4 space-y-4 text-sm text-slate-800">
                <div>
                  <div className="mb-1 font-semibold">Claim</div>
                  <div>{record.claim}</div>
                </div>

                <div>
                  <div className="mb-1 font-semibold">Methodology</div>
                  <div>{record.methodology}</div>
                </div>

                <div>
                  <div className="mb-1 font-semibold">Findings</div>
                  <ul className="space-y-1">
                    {record.findings.map((finding) => (
                      <li key={finding} className="rounded border bg-slate-50 px-3 py-2">
                        {finding}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="mb-1 font-semibold">Limitations</div>
                  <ul className="space-y-1">
                    {record.limitations.map((limitation) => (
                      <li key={limitation} className="rounded border bg-slate-50 px-3 py-2">
                        {limitation}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="mb-1 font-semibold">Citation</div>
                  <div className="rounded border bg-slate-50 p-3">{record.citation}</div>
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-end">
            <button
              onClick={() => setWorkflowStep('step4_knowledge_structure')}
              className="rounded bg-slate-900 px-4 py-3 text-white hover:bg-slate-800"
            >
              Continue to Step 4
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
