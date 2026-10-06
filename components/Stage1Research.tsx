'use client'

import { useEffect, useRef } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import { getNextRecommendedStep, getStage1LockKey, isStage1StepDone } from '@/lib/flowProgress'
import { getStepContract, resolveWorkflowStepId } from '@/lib/workflow'
import { getIblEthicalTip, getIblStepMeta, type IBLStepKey } from '@/lib/iblFramework'
import { useI18n } from '@/components/I18nProvider'
import InfoTooltip from '@/components/InfoTooltip'
import EthicalTip from '@/components/EthicalTip'
import AppBrand from '@/components/AppBrand'
import StepSelect from './StepSelect'
import Step1A from './Step1A'
import Step1B from './Step1B'
import Step2Search from './Step2Search'
import Step3Evidence from './Step3Evidence'
import Step4Structure from './Step4Structure'
import Step5Explanation from './Step5Explanation'
import Step0 from './steps/Step0'
import Step5SourceSelection from './Step5SourceSelection'
import Step8Glossary from './Step8Glossary'

const ACTIVE_WORKFLOW_STEPS = [
  'step0_generate',
  'step1_select',
  'step1a_compare',
  'step1b_synthesize',
  'step2_search_design',
  'step3_evidence_extraction',
  'step5_source_selection',
  'step4_knowledge_structure',
  'step8_glossary',
  'step9_explanation',
] as const satisfies readonly IBLStepKey[]

function renderStep(stepId: ReturnType<typeof resolveWorkflowStepId>) {
  switch (stepId) {
    case 'step0_generate':
      return <Step0 />
    case 'step1_select':
      return <StepSelect />
    case 'step1a_compare':
      return <Step1A />
    case 'step1b_synthesize':
      return <Step1B />
    case 'step2_search_design':
      return <Step2Search />
    case 'step3_evidence_extraction':
      return <Step3Evidence />
    case 'step5_source_selection':
      return <Step5SourceSelection />
    case 'step4_knowledge_structure':
      return <Step4Structure />
    case 'step8_glossary':
      return <Step8Glossary />
    case 'step9_explanation':
      return <Step5Explanation />
    default:
      return <Step0 />
  }
}

export default function Stage1Research() {
  const { t, locale } = useI18n()
  const {
    evidenceRecords,
    explanationDraft,
    knowledgeStructure,
    finalResearchQuestion,
    searchArticles,
    searchDesign,
    step0OptionalCompleted,
    candidateResearchQuestions,
    rqCandidates,
    selectedRQs,
    comparisonResult,
    stage,
    workflowStep,
    setStage,
    setWorkflowStep,
  } = useWizardStore()
  const stepContentRef = useRef<HTMLDivElement | null>(null)
  const userHasInteracted = useRef(false)

  // Only scroll after the learner has interacted: restoring persisted state on load
  // also changes workflowStep and must not move the page.
  useEffect(() => {
    const markInteracted = () => {
      userHasInteracted.current = true
    }
    window.addEventListener('pointerdown', markInteracted, { once: true })
    window.addEventListener('keydown', markInteracted, { once: true })
    return () => {
      window.removeEventListener('pointerdown', markInteracted)
      window.removeEventListener('keydown', markInteracted)
    }
  }, [])

  // Bring the new step into view when navigating (the stepper sits above long forms).
  useEffect(() => {
    if (!userHasInteracted.current) return
    stepContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [workflowStep])

  if (stage !== 1) return null

  const flowState = {
    candidateResearchQuestions,
    rqCandidates,
    step0OptionalCompleted,
    selectedRQs,
    comparisonResult,
    finalResearchQuestion,
    searchDesign,
    searchArticles,
    evidenceRecords,
    knowledgeStructure,
    explanationDraft,
  }

  const activeStep = resolveWorkflowStepId(workflowStep)
  const visibleSteps =
    step0OptionalCompleted && activeStep !== 'step0_generate'
      ? ACTIVE_WORKFLOW_STEPS.filter((stepId) => stepId !== 'step0_generate')
      : ACTIVE_WORKFLOW_STEPS

  const pt = locale === 'pt-PT'
  const doneCount = visibleSteps.filter((stepId) => isStage1StepDone(stepId, flowState)).length
  const progressPct = Math.round((doneCount / visibleSteps.length) * 100)
  const nextStepId = getNextRecommendedStep(flowState)
  const activeIndex = (visibleSteps as readonly IBLStepKey[]).indexOf(activeStep)
  const unlockedSteps = visibleSteps.filter((stepId) => getStage1LockKey(stepId, flowState) === null)
  const activeUnlockedIndex = (unlockedSteps as readonly IBLStepKey[]).indexOf(activeStep)
  const previousStepId = activeUnlockedIndex > 0 ? unlockedSteps[activeUnlockedIndex - 1] : null
  const followingStepId =
    activeUnlockedIndex >= 0 && activeUnlockedIndex < unlockedSteps.length - 1
      ? unlockedSteps[activeUnlockedIndex + 1]
      : null
  const stepLabel = (stepId: IBLStepKey) => t(`workflow.${stepId}.label`) || getStepContract(stepId).label

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden bg-[var(--surface_container_low)] p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(27,38,59,0.12)_0%,rgba(27,38,59,0.03)_52%,rgba(120,89,27,0.12)_100%)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3">
            <AppBrand />
            <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--on_surface)] md:text-4xl">
              {t('stage1.title')}
            </h2>
            <p className="max-w-3xl text-slate-700">{t('stage1.intro')}</p>
            <EthicalTip title={t('common.stageEthicalTip')} tip={getIblEthicalTip('stage1', locale)} />
          </div>
        </div>
      </section>

      {step0OptionalCompleted && activeStep !== 'step0_generate' && (
        <div className="inline-flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--surface_container)] px-4 py-2.5 text-xs font-semibold text-[var(--on_surface)] ghost-border">
          <span className="opacity-70">{t('common.step0Archived')}</span>
          <button
            type="button"
            onClick={() => setWorkflowStep('step0_generate')}
            className="rounded-[var(--radius-md)] bg-[var(--surface_container_lowest)] px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-[var(--on_surface)] transition hover:bg-[var(--surface_container_low)]"
          >
            {t('common.reopen')}
          </button>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-semibold text-[var(--on_surface)]">
            {pt
              ? `Passo ${Math.max(activeIndex + 1, 1)} de ${visibleSteps.length} · ${doneCount} ${doneCount === 1 ? 'concluído' : 'concluídos'}`
              : `Step ${Math.max(activeIndex + 1, 1)} of ${visibleSteps.length} · ${doneCount} completed`}
          </div>
          {nextStepId && nextStepId !== activeStep && (
            <button
              type="button"
              onClick={() => setWorkflowStep(nextStepId)}
              className="rounded-[var(--radius-md)] bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-[var(--on_primary)] transition hover:brightness-95"
            >
              {pt ? 'Próximo passo recomendado: ' : 'Recommended next step: '}
              {stepLabel(nextStepId)} →
            </button>
          )}
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPct}
          className="h-1.5 w-full bg-[var(--surface_container)]"
        >
          <div className="primary-gradient h-1.5 transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 md:mx-0 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-7">
        {visibleSteps.map((stepId, index) => {
          const step = getStepContract(stepId)
          const iblMeta = getIblStepMeta(stepId)
          const isActive = activeStep === stepId
          const lockKey = getStage1LockKey(stepId, flowState)
          const isLocked = lockKey !== null
          const isDone = isStage1StepDone(stepId, flowState)

          return (
            <button
              key={stepId}
              onClick={() => {
                if (!isLocked) {
                  setWorkflowStep(stepId)
                }
              }}
              disabled={isLocked}
              aria-current={isActive ? 'step' : undefined}
              title={iblMeta.title}
              className={`group relative flex min-h-[140px] min-w-[210px] snap-start flex-col p-4 text-left transition-all duration-200 md:min-w-0 ${
                isActive
                  ? 'bg-[linear-gradient(135deg,rgba(37,99,235,0.10),rgba(22,163,74,0.10))] ambient-shadow rq-active-accent ring-1 ring-[rgba(37,99,235,0.18)]'
                  : 'tonal-card ghost-border hover:bg-[var(--surface_container_low)]'
              } ${isLocked ? 'cursor-not-allowed opacity-40' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className={`font-label text-[10px] uppercase tracking-[0.12em] ${
                    isActive ? 'text-[var(--primary_container)]' : 'text-[var(--outline_variant)]'
                  }`}
                >
                  {t(`workflow.${stepId}.badge`) || iblMeta.badge}
                </div>
                <span
                  className={`text-[10px] font-semibold ${isDone ? 'text-[var(--secondary)]' : 'text-[var(--outline_variant)]'}`}
                  aria-label={isDone ? (pt ? 'Concluído' : 'Completed') : `${index + 1}/${visibleSteps.length}`}
                >
                  {isDone ? '✓' : `${index + 1}/${visibleSteps.length}`}
                </span>
              </div>
              <div className="mt-1.5 flex items-start justify-between gap-2">
                <span className="text-sm font-semibold leading-tight text-[var(--on_surface)]">
                  {stepLabel(stepId)}
                </span>
                <InfoTooltip
                  label=""
                  description={t(`workflow.${stepId}.description`) || iblMeta.title}
                  className="mt-0.5 flex-shrink-0"
                />
              </div>
              <div className={`mt-2 text-[11px] leading-relaxed text-[var(--on_surface)] ${isActive ? 'opacity-90' : 'opacity-70'}`}>
                {lockKey ? t(lockKey) : (t(`workflow.${stepId}.description`) || step.description)}
              </div>
              {iblMeta.isOptional && (
                <span className="mt-3 inline-flex rounded-[var(--radius-md)] bg-[var(--secondary_container)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--on_secondary_container)]">
                  {t('common.optional')}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div ref={stepContentRef} className="scroll-mt-4 bg-[var(--surface_container_low)] p-1">
        <div className="tonal-card p-6 md:p-10">
          {renderStep(activeStep)}
        </div>
      </div>

      {(previousStepId || followingStepId) && (
        <div className="flex items-center justify-between gap-3">
          {previousStepId ? (
            <button
              type="button"
              onClick={() => setWorkflowStep(previousStepId)}
              className="tonal-card ghost-border rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold text-[var(--on_surface)] hover:bg-[var(--surface_container_low)]"
            >
              ← {stepLabel(previousStepId)}
            </button>
          ) : <span />}
          {followingStepId && (
            <button
              type="button"
              onClick={() => setWorkflowStep(followingStepId)}
              className="tonal-card ghost-border rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold text-[var(--on_surface)] hover:bg-[var(--surface_container_low)]"
            >
              {stepLabel(followingStepId)} →
            </button>
          )}
        </div>
      )}

      {explanationDraft && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setStage(2)}
            className="rounded-[var(--radius-md)] bg-[var(--primary)] px-8 py-3.5 text-sm font-semibold text-[var(--on_primary)] shadow-lg transition hover:brightness-95 active:scale-95 flex items-center gap-2"
          >
            {t('steps.step1B.continueButton')} →
          </button>
        </div>
      )}
    </div>
  )
}
