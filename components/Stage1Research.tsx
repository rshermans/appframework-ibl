'use client'

import { useWizardStore } from '@/store/wizardStore'
import { getStepContract, resolveWorkflowStepId } from '@/lib/workflow'
import StepSelect from './StepSelect'
import Step1A from './Step1A'
import Step1B from './Step1B'
import Step2Search from './Step2Search'
import Step3Evidence from './Step3Evidence'
import Step4Structure from './Step4Structure'
import Step5Explanation from './Step5Explanation'
import Step0 from './steps/Step0'

const ACTIVE_WORKFLOW_STEPS = [
  'step0_generate',
  'step1_select',
  'step1a_compare',
  'step1b_synthesize',
  'step2_search_design',
  'step3_evidence_extraction',
  'step4_knowledge_structure',
  'step5_explanation',
] as const

const STEP_BADGES: Record<(typeof ACTIVE_WORKFLOW_STEPS)[number], string> = {
  step0_generate: 'Step 0',
  step1_select: 'Step 1',
  step1a_compare: 'Step 1A',
  step1b_synthesize: 'Step 1B',
  step2_search_design: 'Step 2',
  step3_evidence_extraction: 'Step 3',
  step4_knowledge_structure: 'Step 4',
  step5_explanation: 'Step 5',
}

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
    case 'step4_knowledge_structure':
      return <Step4Structure />
    case 'step5_explanation':
      return <Step5Explanation />
    default:
      return <Step0 />
  }
}

export default function Stage1Research() {
  const {
    evidenceRecords,
    knowledgeStructure,
    finalResearchQuestion,
    searchArticles,
    searchDesign,
    stage,
    workflowStep,
    setWorkflowStep,
  } = useWizardStore()

  if (stage !== 1) return null

  const activeStep = resolveWorkflowStepId(workflowStep)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold">Stage 1: Ask and Research</h2>
        <p className="text-gray-600">
          Generate, select, compare, synthesise, and operationalise a rigorous research question
          before moving into evidence work.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-8">
        {ACTIVE_WORKFLOW_STEPS.map((stepId) => {
          const step = getStepContract(stepId)
          const isActive = activeStep === stepId
          const isStep2Locked =
            stepId === 'step2_search_design' && !finalResearchQuestion?.approvedByUser
          const isStep3Locked =
            stepId === 'step3_evidence_extraction' && (!searchDesign || searchArticles.length === 0)
          const isStep4Locked = stepId === 'step4_knowledge_structure' && evidenceRecords.length === 0
          const isStep5Locked =
            stepId === 'step5_explanation' && (!knowledgeStructure || evidenceRecords.length === 0)
          const isLocked = isStep2Locked || isStep3Locked || isStep4Locked || isStep5Locked

          return (
            <button
              key={stepId}
              onClick={() => {
                if (!isLocked) {
                  setWorkflowStep(stepId)
                }
              }}
              disabled={isLocked}
              className={`rounded-xl border p-4 text-left transition ${
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-900 hover:border-slate-400'
              } ${isLocked ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <div
                className={`text-xs uppercase tracking-wide ${
                  isActive ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                {STEP_BADGES[stepId]}
              </div>
              <div className="mt-1 font-semibold">{step.label}</div>
              <div className={`mt-2 text-sm ${isActive ? 'text-slate-200' : 'text-slate-600'}`}>
                {isStep2Locked
                  ? 'Locked until the final research question is approved.'
                  : isStep3Locked
                    ? 'Locked until search design retrieves at least one article.'
                  : isStep4Locked
                      ? 'Locked until at least one evidence record is extracted.'
                    : isStep5Locked
                      ? 'Locked until knowledge structure exists.'
                    : step.description}
              </div>
            </button>
          )
        })}
      </div>

      <div className="rounded-xl bg-white p-6 shadow">{renderStep(activeStep)}</div>
    </div>
  )
}
