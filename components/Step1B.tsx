'use client'

import { useEffect, useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import type { FinalResearchQuestion } from '@/types/research-workflow'
import { useI18n } from '@/components/I18nProvider'
import StepHeader from '@/components/StepHeader'
import { parseAiJson } from '@/lib/parseAiJson'
import { safeFetch } from '@/lib/safeFetch'

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
  const [selectedRQChoice, setSelectedRQChoice] = useState('')
  const [manualJustification, setManualJustification] = useState('')
  const [rewriteDraft, setRewriteDraft] = useState('')
  const [refinementPrompt, setRefinementPrompt] = useState('')
  const [refinementKeywords, setRefinementKeywords] = useState('')

  const isPortuguese = locale === 'pt-PT'

  useEffect(() => {
    if (!selectedRQChoice && selectedRQs.length > 0) {
      setSelectedRQChoice(selectedRQs[0])
    }
  }, [selectedRQs, selectedRQChoice])

  useEffect(() => {
    if (finalResearchQuestion?.question) {
      setRewriteDraft(finalResearchQuestion.question)
    }
  }, [finalResearchQuestion?.question])

  const runSynthesis = async () => {
    if (!comparisonResult || selectedRQs.length === 0) {
      setError(t('steps.step1B.invalidState'))
      return
    }

    setLoading(true)
    setError('')

    const refinementInstructions = [
      refinementPrompt.trim()
        ? `${isPortuguese ? 'Instrucoes de melhoria' : 'Refinement instructions'}: ${refinementPrompt.trim()}`
        : '',
      refinementKeywords.trim()
        ? `${isPortuguese ? 'Palavras complementares' : 'Complementary keywords'}: ${refinementKeywords.trim()}`
        : '',
    ]
      .filter(Boolean)
      .join('\n')

    try {
      const { response: res, json } = await safeFetch('/api/ai', {
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
          content: refinementInstructions
            ? `${JSON.stringify(comparisonResult, null, 2)}\n${refinementInstructions}`
            : JSON.stringify(comparisonResult, null, 2),
          locale,
        }),
      })

      const payload = json?.data ?? json

      if (!res.ok || !json?.ok) {
        throw new Error((json?.details || json?.error || t('api.genericFailure')) as string)
      }

      const parsed = parseAiJson<{
        final_question?: string
        justification?: string
      }>(payload.output)
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
      setRewriteDraft(nextFinalQuestion.question)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('api.genericFailure'))
    } finally {
      setLoading(false)
    }
  }

  const useSelectedQuestionAsFinal = () => {
    if (!selectedRQChoice.trim()) {
      setError(isPortuguese ? 'Seleciona uma pergunta antes de continuar.' : 'Select one question before continuing.')
      return
    }

    const nextFinalQuestion: FinalResearchQuestion = {
      question: selectedRQChoice.trim(),
      justification:
        manualJustification.trim() ||
        comparisonResult?.recommendationReason ||
        (isPortuguese ? 'Pergunta selecionada manualmente pelo utilizador.' : 'Question manually selected by user.'),
      derivedFromQuestions: selectedRQs,
      approvedByUser: false,
    }

    setFinalResearchQuestion(nextFinalQuestion)
    setRewriteDraft(nextFinalQuestion.question)
    setError('')
  }

  const applyRewrite = () => {
    if (!finalResearchQuestion) {
      setError(isPortuguese ? 'Primeiro cria ou seleciona uma pergunta final.' : 'Create or select a final question first.')
      return
    }

    if (!rewriteDraft.trim()) {
      setError(isPortuguese ? 'A reformulacao nao pode estar vazia.' : 'Rewrite cannot be empty.')
      return
    }

    setFinalResearchQuestion({
      ...finalResearchQuestion,
      question: rewriteDraft.trim(),
      approvedByUser: false,
    })
    setError('')
  }

  return (
    <div className="space-y-6">
      <div>
        <StepHeader
          stepId="step1b_synthesize"
          title={t('steps.step1B.title')}
          subtitle={t('steps.step1B.intro')}
        />
      </div>

      <div className="bg-[var(--surface_container_low)] p-4">
        <div className="mb-2 text-sm font-semibold text-[var(--on_surface)]">
          {isPortuguese ? 'Escolha humana da RQ final (sem geracao automatica)' : 'Human selection of the final RQ (no auto-generation)'}
        </div>
        <div className="space-y-3">
          {selectedRQs.map((rq) => (
            <label key={rq} className="flex cursor-pointer items-start gap-2 tonal-card ghost-border p-3">
              <input
                type="radio"
                name="manual-final-rq"
                checked={selectedRQChoice === rq}
                onChange={() => setSelectedRQChoice(rq)}
                className="mt-1"
              />
              <span className="text-sm text-[var(--on_surface)]">{rq}</span>
            </label>
          ))}
        </div>
        <input
          value={manualJustification}
          onChange={(event) => setManualJustification(event.target.value)}
          placeholder={
            isPortuguese
              ? 'Justificacao opcional para esta escolha manual'
              : 'Optional justification for this manual choice'
          }
          className="ghost-input mt-3 w-full"
        />
        <button
          onClick={useSelectedQuestionAsFinal}
          className="primary-gradient mt-3 rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold text-[var(--on_primary)] transition hover:brightness-110"
        >
          {isPortuguese ? 'Usar pergunta selecionada' : 'Use selected question'}
        </button>
      </div>

      {comparisonResult ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 text-sm font-semibold text-slate-700">
            {t('steps.step1B.recommendedTitle')}
          </div>
          <div className="font-medium text-slate-900">
            {comparisonResult.recommendedQuestion || t('common.noData')}
          </div>
          <div className="mt-2 text-sm opacity-70">
            {comparisonResult.recommendationReason || t('common.noData')}
          </div>
        </div>
      ) : (
        <div className="ai-needs-validation rounded-[var(--radius-md)] p-4 text-sm">
          {t('steps.step1B.noComparison')}
        </div>
      )}

      <div className="bg-[var(--surface_container_low)] p-4">
        <div className="mb-2 text-sm font-semibold text-[var(--on_surface)]">
          {isPortuguese ? 'Refazer sintese com input do utilizador' : 'Redo synthesis with user input'}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={refinementPrompt}
            onChange={(event) => setRefinementPrompt(event.target.value)}
            placeholder={
              isPortuguese
                ? 'Ex.: foco em contexto europeu e resultados aplicados'
                : 'e.g. focus on European context and applied outcomes'
            }
            className="ghost-input"
          />
          <input
            value={refinementKeywords}
            onChange={(event) => setRefinementKeywords(event.target.value)}
            placeholder={
              isPortuguese
                ? 'Ex.: intervention, longitudinal, mixed-methods'
                : 'e.g. intervention, longitudinal, mixed-methods'
            }
            className="ghost-input"
          />
        </div>
        <button
          onClick={runSynthesis}
          disabled={loading || !comparisonResult}
          className="primary-gradient mt-3 rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold text-[var(--on_primary)] transition hover:brightness-110 disabled:opacity-50"
        >
          {loading
            ? t('steps.step1B.creating')
            : isPortuguese
              ? 'Gerar ou refazer pergunta final'
              : 'Generate or redo final question'}
        </button>
      </div>

      {error && (
        <div className="ai-needs-validation rounded-[var(--radius-md)] p-3 text-sm">
          {error}
        </div>
      )}

      {finalResearchQuestion && (
        <div className="tonal-card rq-active-accent p-6 space-y-4">
          <div className="font-label text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--secondary)]">
            {t('workflow.step1b_synthesize.label')}
          </div>
          <div className="font-display text-lg font-semibold text-[var(--on_surface)]">{finalResearchQuestion.question}</div>
          <div className="text-sm leading-7 opacity-70 text-justified">{finalResearchQuestion.justification}</div>

          <div className="bg-[var(--surface_container_low)] p-4">
            <div className="mb-2 text-sm font-semibold text-[var(--on_surface)]">
              {isPortuguese
                ? 'Reformular antes de aprovar'
                : 'Rewrite before approval'}
            </div>
            <textarea
              value={rewriteDraft}
              onChange={(event) => setRewriteDraft(event.target.value)}
              rows={3}
              className="ghost-input w-full"
            />
            <button
              onClick={applyRewrite}
              className="mt-2 rounded-[var(--radius-md)] bg-[var(--surface_container)] px-3 py-2 text-sm font-semibold text-[var(--on_surface)] transition hover:bg-[var(--surface_container_high)]"
            >
              {isPortuguese ? 'Aplicar reformulacao' : 'Apply rewrite'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() =>
                setFinalResearchQuestion({
                  ...finalResearchQuestion,
                  approvedByUser: true,
                })
              }
              className="primary-gradient rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold text-[var(--on_primary)] transition hover:brightness-110"
            >
              {t('steps.step1B.approveButton')}
            </button>
            <div className={`rounded-[var(--radius-md)] px-3 py-2 text-sm font-semibold ${finalResearchQuestion.approvedByUser ? 'ai-user-decided' : 'ai-needs-validation'}`}>
              {t('steps.step1B.statusLabel')}: {finalResearchQuestion.approvedByUser ? t('common.approved') : t('common.pendingApproval')}
            </div>
            {finalResearchQuestion.approvedByUser && (
              <button
                onClick={() => setWorkflowStep('step2_search_design')}
                className="primary-gradient rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold text-[var(--on_primary)] transition hover:brightness-110"
              >
                {t('steps.step1B.continueButton')}
              </button>
            )}
          </div>
          <div className="bg-[var(--surface_container_low)] p-3 text-sm opacity-70">
            {t('steps.step1B.anchorNote')}
          </div>
        </div>
      )}
    </div>
  )
}

