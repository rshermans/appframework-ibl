import type {
  ProjectWorkflowState,
  WorkflowFieldSchema,
  WorkflowStageId,
  WorkflowStepContract,
  WorkflowStepId,
} from '@/types/research-workflow'

export const WORKFLOW_STAGES: Record<WorkflowStageId, { label: string; goal: string }> = {
  question_design: {
    label: 'Question Design',
    goal: 'Generate, compare, and lock a strong research question.',
  },
  research_preparation: {
    label: 'Research Preparation',
    goal: 'Design the search strategy before collecting evidence.',
  },
  knowledge_building: {
    label: 'Knowledge Building',
    goal: 'Extract evidence and structure it into usable knowledge.',
  },
  communication: {
    label: 'Communication',
    goal: 'Turn the structured knowledge into explanation and outputs.',
  },
  reflection: {
    label: 'Reflection',
    goal: 'Review the work, identify gaps, and improve the final result.',
  },
}

export const WORKFLOW_STEP_ORDER: WorkflowStepId[] = [
  'step0_generate',
  'step1_select',
  'step1a_compare',
  'step1b_synthesize',
  'step2_search_design',
  'step3_evidence_extraction',
  'step5_source_selection',
  'step4_knowledge_structure',
  'step8_glossary',
  'step5_explanation',
  'step6_multimodal',
  'step7_reflection',
]

export const PHASE_ONE_WORKFLOW_STEPS: WorkflowStepId[] = [
  'step0_generate',
  'step1_select',
  'step1a_compare',
  'step1b_synthesize',
]

export const LEGACY_WORKFLOW_STEP_ALIASES: Record<string, WorkflowStepId> = {
  '0': 'step0_generate',
  '1': 'step1_select',
  '2': 'step1a_compare',
  '3': 'step1b_synthesize',
  'step1-select': 'step1_select',
  step0: 'step0_generate',
  step1: 'step1a_compare',
  step1a: 'step1a_compare',
  step1b: 'step1b_synthesize',
  step2: 'step2_search_design',
  step3: 'step3_evidence_extraction',
  step4: 'step3_evidence_extraction',
  step5: 'step5_source_selection',
  step6: 'step4_knowledge_structure',
  step7: 'step4_knowledge_structure',
  step8a: 'step8_glossary',
  step8b: 'step8_glossary',
  step9: 'step5_explanation',
  step10: 'step6_multimodal',
  step10a: 'step6_multimodal',
  step10b: 'step6_multimodal',
  step10c: 'step6_multimodal',
  step10d: 'step6_multimodal',
  's3-peer': 'step7_reflection',
  's3-self': 'step7_reflection',
  's3-reflect': 'step7_reflection',
  's3-extend': 'step7_reflection',
}

export const WORKFLOW_TO_LEGACY_STEP: Record<WorkflowStepId, string> = {
  step0_generate: 'step0',
  step1_select: 'step1-select',
  step1a_compare: 'step1',
  step1b_synthesize: 'step1b',
  step2_search_design: 'step2',
  step3_evidence_extraction: 'step3',
  step5_source_selection: 'step5',
  step4_knowledge_structure: 'step6',
  step8_glossary: 'step8a',
  step5_explanation: 'step9',
  step6_multimodal: 'step10',
  step7_reflection: 's3-reflect',
}

function field(
  key: string,
  type: WorkflowFieldSchema['type'],
  required: boolean,
  source: WorkflowFieldSchema['source'],
  description: string
): WorkflowFieldSchema {
  return { key, type, required, source, description }
}

export const WORKFLOW_STEP_CONTRACTS: Record<WorkflowStepId, WorkflowStepContract> = {
  step0_generate: {
    id: 'step0_generate',
    label: 'Generate Research Questions',
    stage: 'question_design',
    promptId: 'rq_generation',
    description: 'Generate a bounded set of epistemically valid research-question candidates.',
    inputSchema: [
      field('topic', 'string', true, 'user', 'Research topic defined by the user.'),
      field('level', 'string', false, 'user', 'Learning or project level.'),
    ],
    outputSchema: [
      field('candidateQuestions', 'object[]', true, 'ai', 'Exactly four candidate research questions.'),
    ],
    storeWrites: ['topic', 'candidateQuestions'],
    nextSteps: ['step1_select'],
    humanDecisionRequired: false,
    defaultMode: 'standard',
  },
  step1_select: {
    id: 'step1_select',
    label: 'Select Candidate Questions',
    stage: 'question_design',
    description: 'User selects up to three candidates to carry into comparative analysis.',
    inputSchema: [
      field('candidateQuestions', 'object[]', true, 'store', 'Previously generated question candidates.'),
      field('selectedQuestions', 'string[]', true, 'user', 'Up to three selected question texts.'),
    ],
    outputSchema: [
      field('selectedQuestions', 'string[]', true, 'store', 'Selected question texts ready for comparison.'),
    ],
    storeWrites: ['selectedQuestions'],
    nextSteps: ['step1a_compare'],
    humanDecisionRequired: true,
  },
  step1a_compare: {
    id: 'step1a_compare',
    label: 'Compare Research Questions',
    stage: 'question_design',
    promptId: 'rq_analysis',
    description: 'AI compares the selected questions; the user interprets the analysis.',
    inputSchema: [
      field('selectedQuestions', 'string[]', true, 'store', 'At least two selected research questions.'),
      field('mode', 'string', false, 'user', 'Comparison depth: quick, advanced, or standard.'),
    ],
    outputSchema: [
      field('comparisonResult', 'object', true, 'ai', 'Structured comparative analysis for all selected questions.'),
    ],
    storeWrites: ['comparisonResult'],
    nextSteps: ['step1b_synthesize'],
    humanDecisionRequired: false,
    defaultMode: 'quick',
  },
  step1b_synthesize: {
    id: 'step1b_synthesize',
    label: 'Synthesize Final Research Question',
    stage: 'question_design',
    promptId: 'rq_synthesis',
    description: 'Create one final question and one-sentence justification from the comparison.',
    inputSchema: [
      field('selectedQuestions', 'string[]', true, 'store', 'Questions that survived initial selection.'),
      field('comparisonResult', 'object', true, 'store', 'Structured comparison result from Step 1A.'),
    ],
    outputSchema: [
      field('finalResearchQuestion', 'object', true, 'ai', 'Final research question anchored in the comparison.'),
    ],
    storeWrites: ['finalResearchQuestion'],
    nextSteps: ['step2_search_design'],
    humanDecisionRequired: true,
    defaultMode: 'standard',
  },
  step2_search_design: {
    id: 'step2_search_design',
    label: 'Design Search Strategy',
    stage: 'research_preparation',
    promptId: 'step2',
    description: 'Translate the final question into a reusable search design and retrieve candidate articles.',
    inputSchema: [
      field('finalResearchQuestion', 'object', true, 'store', 'Locked research question and justification.'),
    ],
    outputSchema: [
      field('searchDesign', 'object', true, 'ai', 'Keywords, boolean query, databases, and filters.'),
      field('searchArticles', 'object[]', false, 'system', 'Retrieved article candidates from search providers.'),
    ],
    storeWrites: ['searchDesign', 'searchArticles'],
    nextSteps: ['step3_evidence_extraction'],
    humanDecisionRequired: true,
    defaultMode: 'standard',
  },
  step3_evidence_extraction: {
    id: 'step3_evidence_extraction',
    label: 'Extract Evidence',
    stage: 'knowledge_building',
    promptId: 'step4',
    description: 'Extract evidence from external sources into structured records.',
    inputSchema: [
      field('finalResearchQuestion', 'object', true, 'store', 'Final research question.'),
      field('searchDesign', 'object', true, 'store', 'Search design created from the final question.'),
      field('searchArticles', 'object[]', false, 'store', 'Retrieved article candidates to analyse.'),
      field('source', 'string', true, 'user', 'Source content or abstract to analyse.'),
    ],
    outputSchema: [
      field('evidenceRecords', 'object[]', true, 'ai', 'Structured evidence entries linked to the question.'),
    ],
    storeWrites: ['evidenceRecords'],
    nextSteps: ['step5_source_selection'],
    humanDecisionRequired: true,
    defaultMode: 'standard',
  },
  step5_source_selection: {
    id: 'step5_source_selection',
    label: 'Source Selection & CRAAP Analysis',
    stage: 'knowledge_building',
    description: 'Evaluate source credibility using CRAAP criteria and confirm which sources to carry into knowledge structuring.',
    inputSchema: [
      field('evidenceRecords', 'object[]', true, 'store', 'Evidence records extracted in the previous step.'),
      field('searchArticles', 'object[]', false, 'store', 'Original search articles for metadata cross-check.'),
    ],
    outputSchema: [
      field('selectedSearchArticleIds', 'string[]', true, 'user', 'IDs of sources that passed CRAAP evaluation.'),
    ],
    storeWrites: ['selectedSearchArticleIds'],
    nextSteps: ['step4_knowledge_structure'],
    humanDecisionRequired: true,
  },
  step4_knowledge_structure: {
    id: 'step4_knowledge_structure',
    label: 'Structure Knowledge',
    stage: 'knowledge_building',
    promptId: 'knowledge_structure',
    description: 'Organise extracted evidence into topics, subtopics, and conceptual relations.',
    inputSchema: [
      field('evidenceRecords', 'object[]', true, 'store', 'Evidence already extracted from sources.'),
    ],
    outputSchema: [
      field('knowledgeStructure', 'object', true, 'system', 'Topics, subtopics, and concept-map relations.'),
    ],
    storeWrites: ['knowledgeStructure'],
    nextSteps: ['step8_glossary'],
    humanDecisionRequired: true,
  },
  step8_glossary: {
    id: 'step8_glossary',
    label: 'Scientific Glossary Builder',
    stage: 'knowledge_building',
    description: 'Review and curate the AI-generated glossary. Retain only terms anchored to reviewed sources.',
    inputSchema: [
      field('knowledgeStructure', 'object', true, 'store', 'Knowledge structure containing the auto-generated glossary.'),
    ],
    outputSchema: [
      field('knowledgeStructure', 'object', true, 'user', 'Knowledge structure with the human-curated glossary.'),
    ],
    storeWrites: ['knowledgeStructure'],
    nextSteps: ['step5_explanation'],
    humanDecisionRequired: true,
  },
  step5_explanation: {
    id: 'step5_explanation',
    label: 'Build Scientific Explanation',
    stage: 'communication',
    promptId: 'step9',
    description: 'Transform structured knowledge into a scientific explanation draft.',
    inputSchema: [
      field('finalResearchQuestion', 'object', true, 'store', 'Final research question.'),
      field('knowledgeStructure', 'object', true, 'store', 'Structured knowledge map.'),
      field('evidenceRecords', 'object[]', true, 'store', 'Structured evidence records.'),
    ],
    outputSchema: [
      field('explanationDraft', 'object', true, 'ai', 'Outline and reasoning structure for the explanation.'),
    ],
    storeWrites: ['explanationDraft'],
    nextSteps: ['step6_multimodal', 'step7_reflection'],
    humanDecisionRequired: true,
    defaultMode: 'standard',
  },
  step6_multimodal: {
    id: 'step6_multimodal',
    label: 'Plan Multimodal Output',
    stage: 'communication',
    description: 'Convert the explanation into output formats such as poster, podcast, or video.',
    inputSchema: [
      field('explanationDraft', 'object', true, 'store', 'Scientific explanation draft.'),
    ],
    outputSchema: [
      field('multimodalPlan', 'object', true, 'system', 'Multimodal production plan.'),
    ],
    storeWrites: ['multimodalPlan'],
    nextSteps: ['step7_reflection'],
    humanDecisionRequired: true,
  },
  step7_reflection: {
    id: 'step7_reflection',
    label: 'Reflect and Improve',
    stage: 'reflection',
    description: 'Review the work, identify weaknesses, and define next improvements.',
    inputSchema: [
      field('finalResearchQuestion', 'object', true, 'store', 'Final research question.'),
      field('explanationDraft', 'object', false, 'store', 'Explanation draft, if available.'),
      field('multimodalPlan', 'object', false, 'store', 'Multimodal plan, if available.'),
    ],
    outputSchema: [
      field('reflection', 'object', true, 'user', 'Reflection and improvement plan.'),
    ],
    storeWrites: ['reflection'],
    nextSteps: [],
    humanDecisionRequired: true,
  },
}

export function resolveWorkflowStepId(stepId?: WorkflowStepId | string | number): WorkflowStepId {
  if (!stepId) {
    return 'step0_generate'
  }

  const normalized = String(stepId)
  if (normalized in WORKFLOW_STEP_CONTRACTS) {
    return normalized as WorkflowStepId
  }

  return LEGACY_WORKFLOW_STEP_ALIASES[normalized] ?? 'step0_generate'
}

export function getStepContract(stepId?: WorkflowStepId | string | number): WorkflowStepContract {
  return WORKFLOW_STEP_CONTRACTS[resolveWorkflowStepId(stepId)]
}

export function toLegacyStepId(stepId: WorkflowStepId): string {
  return WORKFLOW_TO_LEGACY_STEP[stepId]
}

export function getNextStepContracts(
  stepId?: WorkflowStepId | string | number
): WorkflowStepContract[] {
  const current = getStepContract(stepId)
  return current.nextSteps.map((nextStepId) => WORKFLOW_STEP_CONTRACTS[nextStepId])
}

export function canTransition(
  fromStep: WorkflowStepId | string | number,
  toStep: WorkflowStepId | string | number
): boolean {
  const from = getStepContract(fromStep)
  const to = resolveWorkflowStepId(toStep)
  return from.nextSteps.includes(to)
}

export function getMissingRequiredFields(
  stepId: WorkflowStepId | string | number,
  payload: Record<string, unknown>
): string[] {
  const contract = getStepContract(stepId)
  return contract.inputSchema
    .filter((fieldSchema) => fieldSchema.required)
    .filter((fieldSchema) => isMissingValue(payload[fieldSchema.key]))
    .map((fieldSchema) => fieldSchema.key)
}

function isMissingValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true
  }

  if (typeof value === 'string') {
    return value.trim().length === 0
  }

  if (Array.isArray(value)) {
    return value.length === 0
  }

  return false
}

export const EMPTY_WORKFLOW_STATE: ProjectWorkflowState = {
  topic: '',
  currentStep: 'step0_generate',
  candidateQuestions: [],
  selectedQuestions: [],
  comparisonResult: null,
  finalResearchQuestion: null,
  searchDesign: null,
  searchArticles: [],
  selectedSearchArticleIds: [],
  evidenceRecords: [],
  knowledgeStructure: null,
  explanationDraft: null,
  multimodalPlan: null,
  reflection: null,
}
