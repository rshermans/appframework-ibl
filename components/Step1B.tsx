'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import type { FinalResearchQuestion } from '@/types/research-workflow'
import { useI18n } from '@/components/I18nProvider'

export default function Step1B() {
  const { locale, t } = useI18n()
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
      setError(t('steps.step1B.invalidState'))
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
          stepLabel: t('workflow.step1b_synthesize.label'),
          topic,
          selectedQuestions: selectedRQs,
          comparisonResult,
          content: JSON.stringify(comparisonResult, null, 2),
          locale,
        }),
      })

      const json = await res.json()
      const payload = json?.data ?? json

      if (!res.ok || !json?.ok) {
        throw new Error(json?.details || json?.error || t('api.genericFailure'))
      }

      const parsed = JSON.parse(payload.output)
      const nextFinalQuestion: FinalResearchQuestion = {
        question: parsed?.final_question || '',
        justification: parsed?.justification || '',
        derivedFromQuestions: selectedRQs,
        approvedByUser: false,
      }

      if (!nextFinalQuestion.question || !nextFinalQuestion.justification) {
        throw new Error(t('api.genericFailure'))
      }

      setFinalResearchQuestion(nextFinalQuestion)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('api.genericFailure'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-xl font-semibold">{t('steps.step1B.title')}</h2>
        <p className="text-sm text-gray-600">{t('steps.step1B.intro')}</p>
      </div>

      {comparisonResult ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 text-sm font-semibold text-slate-700">
            {t('steps.step1B.recommendedTitle')}
          </div>
          <div className="font-medium text-slate-900">
            {comparisonResult.recommendedQuestion || t('common.noData')}
          </div>
          <div className="mt-2 text-sm text-slate-600">
            {comparisonResult.recommendationReason || t('common.noData')}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {t('steps.step1B.noComparison')}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 p-4">
        <div className="mb-3 text-sm font-semibold text-slate-700">
          {t('steps.step1B.selectedTitle')}
        </div>
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
        {loading ? t('steps.step1B.creating') : t('steps.step1B.createButton')}
      </button>

      {finalResearchQuestion && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
            {t('workflow.step1b_synthesize.label')}
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
              {t('steps.step1B.approveButton')}
            </button>
            <div className="rounded border border-emerald-300 bg-white px-3 py-2 text-sm text-emerald-900">
              {t('steps.step1B.statusLabel')}: {finalResearchQuestion.approvedByUser ? t('common.approved') : t('common.pendingApproval')}
            </div>
            {finalResearchQuestion.approvedByUser && (
              <button
                onClick={() => setWorkflowStep('step2_search_design')}
                className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {t('steps.step1B.continueButton')}
              </button>
            )}
          </div>
          <div className="mt-4 rounded border border-emerald-300 bg-white p-3 text-sm text-emerald-900">
            {t('steps.step1B.anchorNote')}
          </div>
        </div>
      )}
    </div>
  )
}
