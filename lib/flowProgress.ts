import type { IBLStepKey } from '@/lib/iblFramework'

/** Minimal slice of the wizard store needed to derive Stage 1 flow state. */
export interface Stage1FlowState {
  candidateResearchQuestions: unknown[]
  rqCandidates: unknown[]
  step0OptionalCompleted: boolean
  selectedRQs: unknown[]
  comparisonResult: unknown | null
  finalResearchQuestion: { approvedByUser?: boolean } | null
  searchDesign: unknown | null
  searchArticles: unknown[]
  evidenceRecords: unknown[]
  knowledgeStructure: unknown | null
  explanationDraft: unknown | null
}

/**
 * Steps the "next recommended action" may point to, in framework order.
 * CRAAP and glossary stay reachable from the stepper but are
 * not forced on the learner.
 */
export const RECOMMENDED_STAGE1_PATH: readonly IBLStepKey[] = [
  'step0_generate',
  'step1_select',
  'step1a_compare',
  'step1b_synthesize',
  'step2_search_design',
  'step3_evidence_extraction',
  'step4_knowledge_structure',
  'step9_explanation',
]

export function isStage1StepDone(stepId: IBLStepKey, s: Stage1FlowState): boolean {
  switch (stepId) {
    case 'step0_generate':
      return s.step0OptionalCompleted || s.candidateResearchQuestions.length > 0 || s.rqCandidates.length > 0
    case 'step1_select':
      return s.selectedRQs.length >= 2 // the comparison needs at least two questions
    case 'step1a_compare':
      return Boolean(s.comparisonResult)
    case 'step1b_synthesize':
      return Boolean(s.finalResearchQuestion?.approvedByUser)
    case 'step2_search_design':
      return Boolean(s.searchDesign)
    case 'step3_evidence_extraction':
    case 'step5_source_selection':
      return s.evidenceRecords.length > 0
    case 'step4_knowledge_structure':
    case 'step8_glossary':
      return Boolean(s.knowledgeStructure)
    case 'step9_explanation':
      return Boolean(s.explanationDraft)
    default:
      return false
  }
}

/** i18n key explaining why a step is locked, or null when it is available. */
export function getStage1LockKey(stepId: IBLStepKey, s: Stage1FlowState): string | null {
  switch (stepId) {
    case 'step1a_compare':
      return s.selectedRQs.length >= 2 ? null : 'steps.step1A.invalidSelection'
    case 'step1b_synthesize':
      return s.comparisonResult ? null : 'common.lockedStep1B'
    case 'step2_search_design':
      return s.finalResearchQuestion?.approvedByUser ? null : 'common.lockedStep2'
    case 'step3_evidence_extraction':
      return s.searchDesign && s.searchArticles.length > 0 ? null : 'common.lockedStep3'
    case 'step4_knowledge_structure':
      return s.evidenceRecords.length > 0 ? null : 'common.lockedStep4'
    case 'step5_source_selection':
      return s.evidenceRecords.length > 0 ? null : 'steps.step5_source_selection.locked'
    case 'step8_glossary':
      return s.knowledgeStructure ? null : 'steps.step8.locked'
    case 'step9_explanation':
      return s.knowledgeStructure && s.evidenceRecords.length > 0 ? null : 'common.lockedStep5'
    default:
      return null
  }
}

export function getNextRecommendedStep(s: Stage1FlowState): IBLStepKey | null {
  return (
    RECOMMENDED_STAGE1_PATH.find(
      (stepId) => !isStage1StepDone(stepId, s) && getStage1LockKey(stepId, s) === null
    ) ?? null
  )
}
