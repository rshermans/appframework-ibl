'use client'

import { useWizardStore } from '@/store/wizardStore'
import { getStepContract, resolveWorkflowStepId } from '@/lib/workflow'
import StepSelect from './StepSelect'
import Step1A from './Step1A'
import Step1B from './Step1B'
import Step2Search from './Step2Search'
import Step0 from './steps/Step0'

const ACTIVE_WORKFLOW_STEPS = [
  'step0_generate',
  'step1_select',
  'step1a_compare',
  'step1b_synthesize',
  'step2_search_design',
] as const

const STEP_BADGES: Record<(typeof ACTIVE_WORKFLOW_STEPS)[number], string> = {
  step0_generate: 'Step 0',
  step1_select: 'Step 1',
  step1a_compare: 'Step 1A',
  step1b_synthesize: 'Step 1B',
  step2_search_design: 'Step 2',
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
    default:
      return <Step0 />
  }
}

export default function Stage1Research() {
  const { finalResearchQuestion, stage, workflowStep, setWorkflowStep } = useWizardStore()

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

      <div className="grid gap-3 md:grid-cols-5">
        {ACTIVE_WORKFLOW_STEPS.map((stepId) => {
          const step = getStepContract(stepId)
          const isActive = activeStep === stepId
          const isStep2Locked =
            stepId === 'step2_search_design' && !finalResearchQuestion?.approvedByUser

          return (
            <button
              key={stepId}
              onClick={() => {
                if (!isStep2Locked) {
                  setWorkflowStep(stepId)
                }
              }}
              disabled={isStep2Locked}
              className={`rounded-xl border p-4 text-left transition ${
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-900 hover:border-slate-400'
              } ${isStep2Locked ? 'cursor-not-allowed opacity-50' : ''}`}
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
