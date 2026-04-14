export type IBLStageKey = 'stage0' | 'stage1' | 'stage2' | 'stage3'

export type IBLStepKey =
  | 'step0_generate'
  | 'step1_select'
  | 'step1a_compare'
  | 'step1b_synthesize'
  | 'step2_search_design'
  | 'step3_evidence_extraction'
  | 'step4_knowledge_structure'
  | 'step5_explanation'
  | 'step6_multimodal'
  | 'step7_reflection'

export interface IBLStepMeta {
  id: IBLStepKey
  stage: IBLStageKey
  badge: string
  title: string
  shortTitle: string
  isOptional?: boolean
}

export const IBL_STAGES: Record<IBLStageKey, { title: string; description: string }> = {
  stage0: {
    title: 'Stage 0 - Team Setup & Role Distribution',
    description: 'Team contract, role proposals and ethical agreement before inquiry.',
  },
  stage1: {
    title: 'Stage 1 - Ask & Research',
    description: 'Question design, search strategy, evidence extraction and knowledge structuring.',
  },
  stage2: {
    title: 'Stage 2 - Explain & Create',
    description: 'Scientific explanation and multimodal outputs based on validated evidence.',
  },
  stage3: {
    title: 'Stage 3 - Reflect & Improve',
    description: 'Peer review, metacognition and inquiry extension planning.',
  },
}

export const IBL_STEP_META: Record<IBLStepKey, IBLStepMeta> = {
  step0_generate: {
    id: 'step0_generate',
    stage: 'stage1',
    badge: 'Step 0',
    title: 'Candidate Research Questions',
    shortTitle: 'Candidate Questions',
    isOptional: true,
  },
  step1_select: {
    id: 'step1_select',
    stage: 'stage1',
    badge: 'Step 1',
    title: 'Final RQ Candidate Selection',
    shortTitle: 'Select Questions',
  },
  step1a_compare: {
    id: 'step1a_compare',
    stage: 'stage1',
    badge: 'Step 1A',
    title: 'Final RQ Synthesis Support',
    shortTitle: 'Compare Questions',
  },
  step1b_synthesize: {
    id: 'step1b_synthesize',
    stage: 'stage1',
    badge: 'Step 1B',
    title: 'Epistemological Analysis & Final RQ Decision',
    shortTitle: 'Synthesize RQ',
  },
  step2_search_design: {
    id: 'step2_search_design',
    stage: 'stage1',
    badge: 'Step 2',
    title: 'Search String Builder / Search Design',
    shortTitle: 'Search Design',
  },
  step3_evidence_extraction: {
    id: 'step3_evidence_extraction',
    stage: 'stage1',
    badge: 'Step 4',
    title: 'Evidence Extractor',
    shortTitle: 'Evidence',
  },
  step4_knowledge_structure: {
    id: 'step4_knowledge_structure',
    stage: 'stage1',
    badge: 'Steps 6-7',
    title: 'Topic/Subtopic Mapper + Mind Map Generator',
    shortTitle: 'Structure',
  },
  step5_explanation: {
    id: 'step5_explanation',
    stage: 'stage2',
    badge: 'Step 9',
    title: 'Scientific Explanation Scaffolder',
    shortTitle: 'Explanation',
  },
  step6_multimodal: {
    id: 'step6_multimodal',
    stage: 'stage2',
    badge: 'Step 10',
    title: 'Multimodal Output Generator',
    shortTitle: 'Multimodal Output',
  },
  step7_reflection: {
    id: 'step7_reflection',
    stage: 'stage3',
    badge: 'Stage 3',
    title: 'Peer Review, Self-Reflection and Inquiry Extension',
    shortTitle: 'Reflection',
  },
}

export const IBL_ETHICAL_TIPS: Record<IBLStageKey | IBLStepKey, string> = {
  stage0:
    'AI role assignments are proposals, not mandates. Final task distribution must be decided collaboratively.',
  stage1:
    'Always validate each output against your inquiry objective and source quality criteria.',
  stage2:
    'All explanations and outputs must stay faithful to evidence generated in Stage 1.',
  stage3:
    'Reflection is human work. AI may prompt, but honest conclusions must be written by the team.',
  step0_generate:
    'AI-generated questions are starting points. Evaluation and selection remain human decisions.',
  step1_select:
    'Rank candidate questions independently before seeing AI recommendations to reduce anchoring bias.',
  step1a_compare:
    'Use AI comparison to test alternatives, not to replace disciplinary reasoning.',
  step1b_synthesize:
    'AI can suggest synthesis, but final RQ validity depends on your methodological judgment.',
  step2_search_design:
    'Test each search string manually. Simplify strings that return fewer than 5 or more than 500 results.',
  step3_evidence_extraction:
    'AI extracts only from provided text. If evidence is ambiguous, the paper interpretation has priority.',
  step4_knowledge_structure:
    'Each topic and map node must be anchored to at least one source already reviewed by the team.',
  step5_explanation:
    'Scientific explanation must remain evidence-faithful. Revise AI scaffolds before publication.',
  step6_multimodal:
    'AI visuals can distort structures. Cross-check with peer-reviewed references before finalizing outputs.',
  step7_reflection:
    'Use AI prompts only as triggers. Reflection statements must be authentic and authored by the team.',
}

export function getIblStepMeta(stepId: IBLStepKey): IBLStepMeta {
  return IBL_STEP_META[stepId]
}

export function getIblEthicalTip(key: IBLStageKey | IBLStepKey): string {
  return IBL_ETHICAL_TIPS[key]
}
