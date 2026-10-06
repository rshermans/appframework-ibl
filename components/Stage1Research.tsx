'use client'

import { useEffect, useRef } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import { getNextRecommendedStep, getStage1LockKey, isStage1StepDone } from '@/lib/flowProgress'
import { getStepContract, resolveWorkflowStepId } from '@/lib/workflow'
import { getIblEthicalTip, getIblStepMeta, type IBLStepKey } from '@/lib/iblFramework'
import { useI18n } from '@/components/I18nProvider'
import EthicalTip from '@/components/EthicalTip'
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
    <div className="mx-auto w-full max-w-[1500px] md:grid md:grid-cols-[17.5rem_minmax(0,1fr)] md:gap-6 md:px-5">
      {/* Steps: a sticky strip on phones, a left rail from md up */}
      <aside
        aria-label={pt ? 'Passos do Stage 1' : 'Stage 1 steps'}
        className="sticky top-0 z-30 border-b border-[var(--outline_variant)] bg-[var(--surface)]/95 backdrop-blur md:z-10 md:max-h-[calc(100dvh-3.5rem)] md:self-start md:overflow-y-auto md:border-0 md:bg-transparent md:py-4 md:backdrop-blur-none"
      >
        <div className="flex snap-x gap-2 overflow-x-auto px-3 py-2 md:flex-col md:gap-1.5 md:overflow-visible md:px-0 md:py-0">
          {visibleSteps.map((stepId, index) => {
            const step = getStepContract(stepId)
            const iblMeta = getIblStepMeta(stepId)
            const isActive = activeStep === stepId
            const lockKey = getStage1LockKey(stepId, flowState)
            const isLocked = lockKey !== null
            const isDone = isStage1StepDone(stepId, flowState)
            const description = t(`workflow.${stepId}.description`) || step.description

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
                title={`${iblMeta.title} — ${lockKey ? t(lockKey) : description}`}
                className={`group flex min-h-[48px] min-w-[11.5rem] snap-start items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-left transition md:min-w-0 ${
                  isActive
                    ? 'bg-[linear-gradient(135deg,rgba(37,99,235,0.12),rgba(22,163,74,0.10))] ring-1 ring-[rgba(37,99,235,0.25)]'
                    : 'bg-[var(--surface_container_low)] hover:bg-[var(--surface_container)]'
                } ${isLocked ? 'cursor-not-allowed opacity-45' : ''}`}
              >
                <span
                  aria-label={isDone ? (pt ? 'Concluído' : 'Completed') : `${index + 1}/${visibleSteps.length}`}
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isActive
                        ? 'primary-gradient text-[var(--on_primary)]'
                        : 'bg-[var(--surface_container_highest)] text-[var(--on_surface)]'
                  }`}
                >
                  {isDone ? '✓' : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-label text-[10px] uppercase tracking-[0.12em] text-[var(--on_surface_variant)]">
                    {t(`workflow.${stepId}.badge`) || iblMeta.badge}
                    {iblMeta.isOptional ? ` · ${t('common.optional')}` : ''}
                  </span>
                  <span className="block truncate text-sm font-semibold leading-tight text-[var(--on_surface)] md:whitespace-normal">
                    {stepLabel(stepId)}
                  </span>
                  {lockKey && (
                    <span className="mt-0.5 hidden text-[11px] leading-snug text-[var(--on_surface_variant)] md:block">
                      {t(lockKey)}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </aside>

      <div className="min-w-0 space-y-4 px-3 pt-4 md:px-0">
        <header className="space-y-2">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--on_surface)] md:text-3xl">
            {t('stage1.title')}
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-700">{t('stage1.intro')}</p>
          <EthicalTip title={t('common.stageEthicalTip')} tip={getIblEthicalTip('stage1', locale)} />
        </header>

        {step0OptionalCompleted && activeStep !== 'step0_generate' && (
          <div className="inline-flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--surface_container)] px-4 py-2.5 text-xs font-semibold text-[var(--on_surface)] ghost-border">
            <span className="opacity-70">{t('common.step0Archived')}</span>
            <button
              type="button"
              onClick={() => setWorkflowStep('step0_generate')}
              className="min-h-[36px] rounded-[var(--radius-md)] bg-[var(--surface_container_lowest)] px-3 py-1 text-[10px] uppercase tracking-[0.1em] text-[var(--on_surface)] transition hover:bg-[var(--surface_container_low)]"
            >
              {t('common.reopen')}
            </button>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold text-[var(--on_surface)]">
              {pt
                ? `Passo ${Math.max(activeIndex + 1, 1)} de ${visibleSteps.length} · ${doneCount} ${doneCount === 1 ? 'concluído' : 'concluídos'}`
                : `Step ${Math.max(activeIndex + 1, 1)} of ${visibleSteps.length} · ${doneCount} completed`}
            </div>
            {nextStepId && nextStepId !== activeStep && (
              <button
                type="button"
                onClick={() => setWorkflowStep(nextStepId)}
                className="min-h-[40px] rounded-[var(--radius-md)] bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-[var(--on_primary)] transition hover:brightness-95"
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

        <div ref={stepContentRef} className="scroll-mt-20 bg-[var(--surface_container_low)] p-1">
          <div className="tonal-card p-4 md:p-8">{renderStep(activeStep)}</div>
        </div>

        {/* Always reachable: no scrolling back up to move on */}
        <div className="sticky bottom-0 z-20 -mx-3 border-t border-[var(--outline_variant)] bg-[var(--surface)]/95 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pr-20 backdrop-blur md:mx-0 md:rounded-t-[var(--radius-md)] md:px-4">
          <div className="flex items-center justify-between gap-2">
            {previousStepId ? (
              <button
                type="button"
                onClick={() => setWorkflowStep(previousStepId)}
                className="min-h-[44px] min-w-0 max-w-[45%] truncate rounded-[var(--radius-md)] bg-[var(--surface_container)] px-4 text-sm font-semibold text-[var(--on_surface)] hover:bg-[var(--surface_container_high)]"
              >
                ← {stepLabel(previousStepId)}
              </button>
            ) : (
              <span />
            )}
            {explanationDraft && (activeStep === 'step9_explanation' || !followingStepId) ? (
              <button
                type="button"
                onClick={() => setStage(2)}
                className="flex min-h-[44px] items-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on_primary)] transition hover:brightness-95 active:scale-95"
              >
                {t('steps.step1B.continueButton')} →
              </button>
            ) : followingStepId ? (
              <button
                type="button"
                onClick={() => setWorkflowStep(followingStepId)}
                className="min-h-[44px] min-w-0 max-w-[55%] truncate rounded-[var(--radius-md)] bg-[var(--surface_container)] px-4 text-sm font-semibold text-[var(--on_surface)] hover:bg-[var(--surface_container_high)]"
              >
                {stepLabel(followingStepId)} →
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
