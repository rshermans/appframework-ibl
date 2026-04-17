export type IBLStageKey = 'stage0' | 'stage1' | 'stage2' | 'stage3'

export type IBLStepKey =
  | 'step0_generate'
  | 'step1_select'
  | 'step1a_compare'
  | 'step1b_synthesize'
  | 'step2_search_design'
  | 'step3_evidence_extraction'
  | 'step5_source_selection'
  | 'step4_knowledge_structure'
  | 'step8_glossary'
  | 'step9_explanation'
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
  step5_source_selection: {
    id: 'step5_source_selection',
    stage: 'stage1',
    badge: 'Step 5',
    title: 'Source Selection & CRAAP Analysis',
    shortTitle: 'CRAAP Analysis',
  },
  step4_knowledge_structure: {
    id: 'step4_knowledge_structure',
    stage: 'stage1',
    badge: 'Steps 6-7',
    title: 'Topic/Subtopic Mapper + Mind Map Generator',
    shortTitle: 'Structure',
  },
  step8_glossary: {
    id: 'step8_glossary',
    stage: 'stage1',
    badge: 'Step 8',
    title: 'Scientific Glossary Builder',
    shortTitle: 'Glossary',
  },
  step9_explanation: {
    id: 'step9_explanation',
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

export const IBL_ETHICAL_TIPS_EN: Record<IBLStageKey | IBLStepKey, string> = {
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
  step5_source_selection:
    'CRAAP evaluates source credibility — but relevance to your specific RQ is always your judgment. Cross-check at least 2 sources using Scimago or Sherpa Romeo. Exclude: Wikipedia, Studocu, SlideShare.',
  step4_knowledge_structure:
    'Each topic and map node must be anchored to at least one source already reviewed by the team.',
  step8_glossary:
    'Include only terms from your reviewed sources. Remove AI-generated jargon that does not appear in your topic literature.',
  step9_explanation:
    'Scientific explanation must remain evidence-faithful. Revise AI scaffolds before publication.',
  step6_multimodal:
    'AI visuals can distort structures. Cross-check with peer-reviewed references before finalizing outputs.',
  step7_reflection:
    'Use AI prompts only as triggers. Reflection statements must be authentic and authored by the team.',
}

export const IBL_ETHICAL_TIPS_PT: Record<IBLStageKey | IBLStepKey, string> = {
  stage0:
    'As atribuicoes de papeis por IA sao propostas, nao ordens. A distribuicao final de tarefas deve ser decidida em equipa.',
  stage1:
    'Valida sempre cada saida face ao objetivo da investigacao e aos criterios de qualidade das fontes.',
  stage2:
    'Todas as explicacoes e outputs devem manter fidelidade a evidencia validada no Stage 1.',
  stage3:
    'A reflexao e trabalho humano. A IA pode sugerir, mas as conclusoes honestas devem ser escritas pela equipa.',
  step0_generate:
    'As perguntas geradas por IA sao pontos de partida. A avaliacao e selecao continuam a ser decisoes humanas.',
  step1_select:
    'Classifica as perguntas candidatas de forma independente antes de ver recomendacoes da IA para reduzir enviesamento de ancoragem.',
  step1a_compare:
    'Usa a comparacao da IA para testar alternativas, nao para substituir o raciocinio disciplinar.',
  step1b_synthesize:
    'A IA pode sugerir sinteses, mas a validade da pergunta final depende do teu julgamento metodologico.',
  step2_search_design:
    'Testa manualmente cada string de pesquisa. Simplifica as strings que devolvem menos de 5 ou mais de 500 resultados.',
  step3_evidence_extraction:
    'A IA extrai apenas do texto fornecido. Se a evidencia for ambigua, a interpretacao do artigo tem prioridade.',
  step5_source_selection:
    'O CRAAP avalia credibilidade, mas a relevancia para a tua pergunta continua a ser teu julgamento. Cruza pelo menos 2 fontes com Scimago ou Sherpa Romeo. Exclui: Wikipedia, Studocu, SlideShare.',
  step4_knowledge_structure:
    'Cada topico e cada no do mapa deve estar ancorado em pelo menos uma fonte ja revista pela equipa.',
  step8_glossary:
    'Inclui apenas termos presentes nas fontes revistas. Remove jargao gerado por IA que nao aparece na literatura do topico.',
  step9_explanation:
    'A explicacao cientifica deve manter fidelidade a evidencia. Revise os rascunhos da IA antes de publicar.',
  step6_multimodal:
    'Elementos visuais gerados por IA podem distorcer estruturas. Cruza sempre com referencias revistas por pares antes de finalizar.',
  step7_reflection:
    'Usa prompts de IA apenas como gatilhos. As declaracoes de reflexao devem ser autenticas e escritas pela equipa.',
}

export function getIblStepMeta(stepId: IBLStepKey): IBLStepMeta {
  return IBL_STEP_META[stepId]
}

export function getIblEthicalTip(
  key: IBLStageKey | IBLStepKey,
  locale: 'pt-PT' | 'en' = 'en'
): string {
  return locale === 'pt-PT' ? IBL_ETHICAL_TIPS_PT[key] : IBL_ETHICAL_TIPS_EN[key]
}
