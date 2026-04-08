'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import type { FinalResearchQuestion } from '@/types/research-workflow'

export default function Step1B() {
  const {
    comparisonResult,
    finalResearchQuestion,
    projectId,
    selectedRQs,
    setFinalResearchQuestion,
    setWorkflowStep,
    topic,
  } = useWizardStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const runSynthesis = async () => {
    if (!comparisonResult || selectedRQs.length === 0) {
      setError('Run the comparison step before synthesising the final research question.')
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
          promptId: 'rq_synthesis',
          stepId: 'step1b',
          stepLabel: 'RQ Synthesis',
          topic,
          selectedQuestions: selectedRQs,
          comparisonResult,
          content: JSON.stringify(comparisonResult, null, 2),
        }),
      })

      const json = await res.json()
      const payload = json?.data ?? json

      if (!res.ok || !json?.ok) {
        throw new Error(json?.details || json?.error || 'Failed to synthesise final question')
      }

      const parsed = JSON.parse(payload.output)
      const nextFinalQuestion: FinalResearchQuestion = {
        question: parsed?.final_question || '',
        justification: parsed?.justification || '',
        derivedFromQuestions: selectedRQs,
        approvedByUser: false,
      }

      if (!nextFinalQuestion.question || !nextFinalQuestion.justification) {
        throw new Error('AI response did not include a valid final question and justification')
      }

      setFinalResearchQuestion(nextFinalQuestion)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to synthesise final question')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-xl font-semibold">Step 1B - Synthesize Final Research Question</h2>
        <p className="text-sm text-gray-600">
          This is the anchor point of the project. The AI proposes one final research question, but
          the user still owns the decision.
        </p>
      </div>

      {comparisonResult ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 text-sm font-semibold text-slate-700">Recommended from comparison</div>
          <div className="font-medium text-slate-900">
            {comparisonResult.recommendedQuestion || 'No recommendation available'}
          </div>
          <div className="mt-2 text-sm text-slate-600">
            {comparisonResult.recommendationReason || 'No recommendation reason available'}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          No structured comparison result is available yet.
        </div>
      )}

      <div className="rounded-lg border border-slate-200 p-4">
        <div className="mb-3 text-sm font-semibold text-slate-700">Selected questions</div>
        <div className="space-y-2">
          {selectedRQs.map((rq, index) => (
            <div key={rq} className="rounded border bg-white p-3 text-sm">
              <span className="font-semibold">RQ {index + 1}:</span> {rq}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={runSynthesis}
        disabled={loading || !comparisonResult}
        className="rounded bg-slate-900 px-4 py-3 text-white disabled:opacity-50"
      >
        {loading ? 'Synthesising...' : 'Create Final Research Question'}
      </button>

      {finalResearchQuestion && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Final Research Question
          </div>
          <div className="text-lg font-semibold text-slate-900">{finalResearchQuestion.question}</div>
          <div className="mt-3 text-sm text-slate-700">{finalResearchQuestion.justification}</div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() =>
                setFinalResearchQuestion({
                  ...finalResearchQuestion,
                  approvedByUser: true,
                })
              }
              className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Approve Final Question
            </button>
            <div className="rounded border border-emerald-300 bg-white px-3 py-2 text-sm text-emerald-900">
              Status: {finalResearchQuestion.approvedByUser ? 'Approved by user' : 'Pending user approval'}
            </div>
            {finalResearchQuestion.approvedByUser && (
              <button
                onClick={() => setWorkflowStep('step2_search_design')}
                className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Continue to Step 2
              </button>
            )}
          </div>
          <div className="mt-4 rounded border border-emerald-300 bg-white p-3 text-sm text-emerald-900">
            Step 2 can now use this question as the canonical anchor for search design.
          </div>
        </div>
      )}
    </div>
  )
}
