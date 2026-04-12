'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import type { CandidateResearchQuestion } from '@/types/research-workflow'
import { useI18n } from '@/components/I18nProvider'

interface Question {
  question: string
  type?: string
  epistemic_type?: string
  rationale?: string
  why_researchable?: string
  challenges?: string
  databases?: string[]
  ibl_score?: number
}

export default function Step0() {
  const { locale, t } = useI18n()
  const {
    projectId,
    topic,
    setCandidates,
    setCandidateResearchQuestions,
    setInput,
    setOutput,
    setWorkflowStep,
  } = useWizardStore()
  const [loading, setLoading] = useState(false)
  const [localTopic, setLocalTopic] = useState(topic)
  const [questions, setQuestions] = useState<Question[]>([])
  const [error, setError] = useState('')

  const runGeneration = async () => {
    if (!localTopic.trim()) {
      setError(t('steps.step0.invalidTopic'))
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          stage: 1,
          promptId: 'rq_generation',
          stepId: 'step0',
          stepLabel: t('workflow.step0_generate.label'),
          topic: localTopic,
          level: 'higher-education',
          locale,
        }),
      })

      const data = await response.json()
      const payload = data?.data ?? data

      if (!response.ok || !data?.ok) {
        throw new Error(data?.details || data?.error || 'Failed to process request')
      }

      setOutput(payload.output)
      setInput(localTopic)

      try {
        const parsed = JSON.parse(payload.output)
        const nextQuestions = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.questions)
            ? parsed.questions
            : []
        const structuredQuestions: CandidateResearchQuestion[] = nextQuestions.map(
          (question: Question, index: number) => ({
            id: `rq-${index + 1}`,
            question: question.question,
            epistemicType: question.type || question.epistemic_type || 'unknown',
            rationale: question.rationale || question.why_researchable || '',
            databases: Array.isArray(question.databases) ? question.databases : [],
            iblScore: typeof question.ibl_score === 'number' ? question.ibl_score : 0,
            challenges: question.challenges,
          })
        )

        setQuestions(nextQuestions)
        setCandidates(nextQuestions.map((question: Question) => question.question))
        setCandidateResearchQuestions(structuredQuestions)
      } catch {
        setQuestions([])
        setCandidates([])
        setCandidateResearchQuestions([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('api.genericFailure'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-semibold">{t('steps.step0.topicLabel')}</label>
        <input
          type="text"
          value={localTopic}
          onChange={(e) => setLocalTopic(e.target.value)}
          placeholder={t('steps.step0.topicPlaceholder')}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-100 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={runGeneration}
        disabled={loading}
        className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
      >
        {loading ? t('steps.step0.generating') : t('steps.step0.generate')}
      </button>

      {questions.length > 0 && (
        <div className="space-y-4 mt-6">
          <h3 className="text-lg font-semibold">{t('steps.step0.candidateTitle')}</h3>
          <p className="text-sm text-slate-600">{t('steps.step0.candidateIntro')}</p>
          {questions.map((q, idx) => (
            <div key={idx} className="rounded-lg border border-gray-200 p-4 transition hover:border-slate-400">
              <div className="mb-2 font-semibold text-slate-900">
                Q{idx + 1}: {q.question}
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold">{t('steps.step0.typeLabel')}:</span>{' '}
                  {q.type || q.epistemic_type || t('common.noData')}
                </div>
                <div>
                  <span className="font-semibold">{t('steps.step0.researchableLabel')}</span>{' '}
                  {q.rationale || q.why_researchable || t('common.noData')}
                </div>
                {q.challenges && (
                  <div>
                    <span className="font-semibold">{t('steps.step0.challengesLabel')}:</span>{' '}
                    {q.challenges}
                  </div>
                )}
                {Array.isArray(q.databases) && q.databases.length > 0 && (
                  <div>
                    <span className="font-semibold">{t('steps.step0.databasesLabel')}:</span>{' '}
                    {q.databases.join(', ')}
                  </div>
                )}
                {typeof q.ibl_score === 'number' && (
                  <div>
                    <span className="font-semibold">{t('steps.step0.scoreLabel')}:</span>{' '}
                    {q.ibl_score}/5
                  </div>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={() => setWorkflowStep('step1_select')}
            className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800"
          >
            {t('steps.step0.continueButton')}
          </button>
        </div>
      )}
    </div>
  )
}
