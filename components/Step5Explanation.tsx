'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import type { ExplanationDraft } from '@/types/research-workflow'

export default function Step5Explanation() {
  const {
    evidenceRecords,
    explanationDraft,
    finalResearchQuestion,
    knowledgeStructure,
    projectId,
    setExplanationDraft,
    topic,
  } = useWizardStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [audience, setAudience] = useState<'expert' | 'general'>('expert')

  const canRun = Boolean(
    finalResearchQuestion?.approvedByUser &&
    knowledgeStructure &&
    evidenceRecords.length > 0
  )

  const buildExplanationDraft = async () => {
    if (!finalResearchQuestion?.question) {
      setError('A final research question is required before building the explanation.')
      return
    }
    if (!knowledgeStructure || evidenceRecords.length === 0) {
      setError('Step 5 requires knowledge structure and evidence records.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const evidenceJson = JSON.stringify(evidenceRecords, null, 2)
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          stage: 2,
          promptId: 'step9',
          stepId: 'step5_explanation',
          stepLabel: 'Scientific Explanation',
          topic,
          rq: finalResearchQuestion.question,
          finalResearchQuestion,
          evidenceRecords,
          knowledgeStructure,
          evidence: evidenceJson,
          audience,
        }),
      })

      const payload = await response.json()
      const data = payload?.data ?? payload

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.details || payload?.error || 'Failed to generate explanation draft')
      }

      const parsed = JSON.parse(data.output)
      const nextDraft: ExplanationDraft = {
        outline: Array.isArray(parsed?.outline) ? parsed.outline : [],
        argumentCore: parsed?.argument_core || '',
        evidenceReferences: Array.isArray(parsed?.evidence_references)
          ? parsed.evidence_references
          : [],
        openIssues: Array.isArray(parsed?.open_issues) ? parsed.open_issues : [],
      }

      if (nextDraft.outline.length === 0 || !nextDraft.argumentCore) {
        throw new Error('AI response did not include a valid explanation draft')
      }

      setExplanationDraft(nextDraft)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to build explanation draft')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-xl font-semibold">Step 5 - Scientific Explanation</h2>
        <p className="text-sm text-gray-600">
          Build a rigorous explanation draft from the structured evidence and knowledge map.
        </p>
      </div>

      {!canRun && (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Step 5 is locked until the final question is approved and both evidence and knowledge
          structure are available.
        </div>
      )}

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="mb-2 text-sm font-semibold text-slate-700">Audience</div>
        <select
          value={audience}
          onChange={(event) => setAudience(event.target.value as 'expert' | 'general')}
          className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="expert">Expert</option>
          <option value="general">General</option>
        </select>
      </div>

      <button
        onClick={buildExplanationDraft}
        disabled={!canRun || loading}
        className="rounded bg-slate-900 px-4 py-3 text-white disabled:opacity-50"
      >
        {loading ? 'Building explanation draft...' : 'Generate Explanation Draft'}
      </button>

      {explanationDraft && (
        <div className="space-y-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div>
            <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Outline
            </div>
            <ol className="space-y-2">
              {explanationDraft.outline.map((item, index) => (
                <li key={`${item}-${index}`} className="rounded border bg-white px-3 py-2 text-sm">
                  {index + 1}. {item}
                </li>
              ))}
            </ol>
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Argument Core
            </div>
            <div className="rounded border bg-white p-4 text-sm text-slate-900">
              {explanationDraft.argumentCore}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
                Evidence References
              </div>
              <ul className="space-y-2">
                {explanationDraft.evidenceReferences.map((reference) => (
                  <li key={reference} className="rounded border bg-white px-3 py-2 text-sm text-slate-900">
                    {reference}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
                Open Issues
              </div>
              <ul className="space-y-2">
                {explanationDraft.openIssues.map((issue) => (
                  <li key={issue} className="rounded border bg-white px-3 py-2 text-sm text-slate-900">
                    {issue}
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
