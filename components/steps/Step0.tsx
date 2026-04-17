'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import type { CandidateResearchQuestion } from '@/types/research-workflow'
import { useI18n } from '@/components/I18nProvider'
import StepHeader from '@/components/StepHeader'
import EthicalTip from '@/components/EthicalTip'
import { getIblEthicalTip } from '@/lib/iblFramework'
import { parseAiJson } from '@/lib/parseAiJson'
import { safeFetch } from '@/lib/safeFetch'

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
    setStep0OptionalCompleted,
    setWorkflowStep,
  } = useWizardStore()
  const [loading, setLoading] = useState(false)
  const [localTopic, setLocalTopic] = useState(topic)
  const [questions, setQuestions] = useState<Question[]>([])
  const [manualQuestion, setManualQuestion] = useState('')
  const [generationGuidance, setGenerationGuidance] = useState('')
  const [error, setError] = useState('')

  const isPortuguese = locale === 'pt-PT'

  const syncQuestions = (nextQuestions: Question[]) => {
    setQuestions(nextQuestions)
    setCandidates(nextQuestions.map((question) => question.question))
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
    setCandidateResearchQuestions(structuredQuestions)
  }

  const addManualQuestion = () => {
    const trimmed = manualQuestion.trim()
    if (!trimmed) return

    const alreadyExists = questions.some((question) => question.question.trim() === trimmed)
    if (alreadyExists) {
      setError(isPortuguese ? 'Esta pergunta ja existe na lista.' : 'This question is already in the list.')
      return
    }

    const nextQuestions = [
      ...questions,
      {
        question: trimmed,
        type: isPortuguese ? 'manual' : 'manual',
        rationale: isPortuguese
          ? 'Pergunta inserida manualmente pelo utilizador.'
          : 'Question manually entered by user.',
      },
    ]
    syncQuestions(nextQuestions)
    setManualQuestion('')
    setError('')
  }

  const removeQuestion = (questionToRemove: string) => {
    const nextQuestions = questions.filter((question) => question.question !== questionToRemove)
    syncQuestions(nextQuestions)
  }

  const runGeneration = async () => {
    if (!localTopic.trim()) {
      setError(t('steps.step0.invalidTopic'))
      return
    }

    setLoading(true)
    setError('')

    const refinement = generationGuidance.trim()
      ? `${isPortuguese ? 'Instrucoes adicionais' : 'Additional instructions'}: ${generationGuidance.trim()}`
      : ''

    try {
      const { response, json: data } = await safeFetch('/api/ai', {
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
          content: refinement
            ? `${isPortuguese ? 'Topico' : 'Topic'}: ${localTopic}\n${refinement}`
            : undefined,
          locale,
        }),
      })

      const payload = data?.data ?? data

      if (!response.ok || !data?.ok) {
        throw new Error((data?.details || data?.error || t('api.genericFailure')) as string)
      }

      setOutput(payload.output)
      setInput(localTopic)

      try {
        const parsed = parseAiJson<{ questions?: CandidateResearchQuestion[] }>(payload.output)
        const nextQuestions = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.questions)
            ? parsed.questions
            : []
        syncQuestions(nextQuestions)
      } catch {
        syncQuestions([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('api.genericFailure'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <StepHeader
        stepId="step0_generate"
        title={t('steps.step0.title')}
        showEthicalTip={false}
      />

      <EthicalTip
        title={isPortuguese ? 'Dica Ética — Integridade da Investigação' : 'Ethical Tip — Research Integrity'}
        tip={getIblEthicalTip('step0_generate', locale)}
        className="mb-2"
      />

      <div>
        <label className="mb-2 block text-sm font-semibold text-[var(--on_surface)]">{t('steps.step0.topicLabel')}</label>
        <input
          type="text"
          value={localTopic}
          onChange={(e) => setLocalTopic(e.target.value)}
          placeholder={t('steps.step0.topicPlaceholder')}
          className="ghost-input w-full"
        />
      </div>

      <div className="bg-[var(--surface_container_low)] p-4">
        <div className="mb-2 text-sm font-semibold text-[var(--on_surface)]">
          {isPortuguese ? 'Refazer geracao com orientacoes adicionais' : 'Refine generation with extra guidance'}
        </div>
        <input
          value={generationGuidance}
          onChange={(event) => setGenerationGuidance(event.target.value)}
          placeholder={
            isPortuguese
              ? 'Ex.: perguntas com foco em impacto social e viabilidade metodologica'
              : 'e.g. focus on social impact and methodological feasibility'
          }
          className="ghost-input w-full"
        />
      </div>

      <div className="bg-[var(--surface_container_low)] p-4">
        <div className="mb-2 text-sm font-semibold text-[var(--on_surface)]">
          {isPortuguese ? 'Inserir perguntas manualmente (sem IA)' : 'Insert questions manually (without AI)'}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={manualQuestion}
            onChange={(event) => setManualQuestion(event.target.value)}
            placeholder={
              isPortuguese
                ? 'Escreve uma pergunta de investigacao manual'
                : 'Write a manual research question'
            }
            className="ghost-input min-w-[260px] flex-1"
          />
          <button
            onClick={addManualQuestion}
            className="primary-gradient rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold text-[var(--on_primary)] transition hover:brightness-110"
          >
            {isPortuguese ? 'Adicionar' : 'Add'}
          </button>
        </div>
      </div>

      {error && (
        <div className="ai-needs-validation rounded-[var(--radius-md)] p-3 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={runGeneration}
        disabled={loading}
        title={isPortuguese ? 'Executar geracao assistida por IA para criar perguntas candidatas.' : 'Run AI-assisted generation to create candidate questions.'}
        className="primary-gradient w-full rounded-[var(--radius-md)] px-4 py-3 font-semibold text-[var(--on_primary)] transition hover:brightness-110 disabled:opacity-50"
      >
        {loading ? t('steps.step0.generating') : t('steps.step0.generate')}
      </button>

      <button
        type="button"
        onClick={() => {
          setStep0OptionalCompleted(true)
          setWorkflowStep('step1_select')
        }}
        className="w-full bg-[var(--surface_container)] px-4 py-2 text-sm font-semibold text-[var(--on_surface)] transition hover:bg-[var(--surface_container_low)]"
      >
        {isPortuguese ? 'Ignorar Step 0 (opcional)' : 'Skip Step 0 (optional)'}
      </button>

      {questions.length > 0 && (
        <div className="space-y-4 mt-6">
          <h3 className="text-lg font-semibold">{t('steps.step0.candidateTitle')}</h3>
          <p className="text-sm text-slate-600">{t('steps.step0.candidateIntro')}</p>
          {questions.map((q, idx) => (
            <div key={`${q.question}-${idx}`} className="tonal-card p-4 transition hover:bg-[var(--surface_container_low)]">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="font-semibold text-[var(--on_surface)]">
                  Q{idx + 1}: {q.question}
                </div>
                <button
                  onClick={() => removeQuestion(q.question)}
                  className="rounded-[var(--radius-md)] bg-[var(--surface_container)] px-2 py-1 text-xs text-[var(--on_surface)] opacity-60 hover:opacity-100"
                >
                  {isPortuguese ? 'Remover' : 'Remove'}
                </button>
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
            onClick={() => {
              setStep0OptionalCompleted(true)
              setWorkflowStep('step1_select')
            }}
            className="primary-gradient w-full rounded-[var(--radius-md)] px-4 py-3 font-semibold text-[var(--on_primary)] transition hover:brightness-110"
          >
            {t('steps.step0.continueButton')}
          </button>
        </div>
      )}
    </div>
  )
}

