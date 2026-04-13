import { appendLocaleInstruction, type Locale, isPortugueseLocale } from '@/lib/i18n'

export type PromptMode = 'standard' | 'quick' | 'advanced'

export type PromptId =
  | 'rq_generation'
  | 'rq_analysis'
  | 'rq_synthesis'
  | 'copilot'
  | 'knowledge_structure'
  | 's0-form'
  | 'step2'
  | 'step4'
  | 'step9'
  | 'generic_guidance'

type PromptVariables = Record<string, string | undefined>

interface PromptDefinition {
  id: PromptId
  aliases?: string[]
  template?: string
  modes?: Partial<Record<PromptMode, string>>
}

const PROMPT_REGISTRY: Record<PromptId, PromptDefinition> = {
  rq_generation: {
    id: 'rq_generation',
    aliases: ['step0'],
    template: `You are a research question design specialist trained in IBL epistemology and scientific inquiry.

Generate exactly 4 research questions for the topic below.

Requirements:
- Each question must be scientifically testable or literature-resolvable
- Each question must be specific enough for a 3-6 week project
- Vary the epistemic type across the set when possible
- Keep the wording level-appropriate

Topic: [TOPIC]
Level: [LEVEL]

Respond with valid JSON only using this shape:
{
  "questions": [
    {
      "question": "Full research question text",
      "type": "empirical | causal | comparative | mechanistic | normative",
      "rationale": "Why this question is well-formed and researchable",
      "databases": ["Database 1", "Database 2"],
      "ibl_score": 4
    }
  ]
}`,
  },
  rq_analysis: {
    id: 'rq_analysis',
    aliases: ['step1', 'step1a'],
    modes: {
      standard: `You are an epistemologist and IBL research coach.

Compare the selected research questions and identify the strongest option.

Selected research questions:
[SELECTED_RQS]

Evaluate:
1. Epistemic type
2. Scope
3. Testability with literature
4. Precision of terms
5. Hidden assumptions or bias
6. IBL appropriateness

Respond with valid JSON only:
{
  "comparisons": [
    {
      "question": "Question text",
      "strengths": ["Strength 1"],
      "weaknesses": ["Weakness 1"],
      "score": 4
    }
  ],
  "recommended_question": "Best current option",
  "recommendation_reason": "Short reason"
}`,
      quick: `You are an epistemologist and IBL research coach.

Compare the selected research questions quickly and directly.

Selected research questions:
[SELECTED_RQS]

Respond with valid JSON only:
{
  "comparisons": [
    {
      "question": "Question text",
      "strengths": ["Top strength"],
      "weaknesses": ["Top weakness"],
      "score": 4
    }
  ],
  "recommended_question": "Best current option",
  "recommendation_reason": "Short reason"
}`,
      advanced: `You are an expert in the philosophy of science supporting comparative research-question analysis.

Perform a deep comparative analysis of the selected research questions.

Selected research questions:
[SELECTED_RQS]

For each question assess:
1. Epistemic type
2. Scope
3. Testability with literature
4. Precision of key terms
5. Hidden assumptions or bias
6. Feasibility for a 3-6 week inquiry
7. IBL appropriateness score

Respond with valid JSON only:
{
  "comparisons": [
    {
      "question": "Question text",
      "epistemic_type": "type",
      "strengths": ["Strength 1"],
      "weaknesses": ["Weakness 1"],
      "risks": ["Risk 1"],
      "score": 4
    }
  ],
  "recommended_question": "Best current option",
  "recommendation_reason": "Short reason"
}`,
    },
  },
  rq_synthesis: {
    id: 'rq_synthesis',
    aliases: ['step1b'],
    template: `You are a research design specialist.

Synthesize one final research question from the selected candidates and analysis.

Selected research questions:
[SELECTED_RQS]

Comparative analysis:
[CONTENT]

Respond with valid JSON only:
{
  "final_question": "One final research question",
  "justification": "One sentence justification"
}`,
  },
  copilot: {
    id: 'copilot',
    template: `You are a cognitive research guidance copilot.

Guide the next research step without taking over the student's reasoning.

Final research question:
[FINAL_RQ]

Current context:
[CONTEXT]

Respond with valid JSON only:
{
  "next_step": "Most useful next action",
  "why": "Why this step matters now",
  "actions": ["Action 1", "Action 2", "Action 3"],
  "caution": "One thing to avoid"
}`,
  },
  knowledge_structure: {
    id: 'knowledge_structure',
    aliases: ['step6', 'step7', 'step8a', 'step8b'],
    template: `You are a research synthesis architect. Build a structured knowledge model from evidence records.

Research Question: [RQ]

Evidence Records (JSON):
[EVIDENCE]

MANDATORY FIELDS — your response will be rejected if any of these are missing or empty:
- "topics": non-empty array of 3-8 main topic strings extracted from the evidence
- "concept_map_nodes": non-empty array of concept node strings (include topics and subtopics)

All other fields below are also required but may be shorter if evidence is limited.

Respond with valid JSON only using EXACTLY this structure:
{
  "topics": ["Main topic 1", "Main topic 2", "Main topic 3"],
  "subtopics": ["Subtopic 1", "Subtopic 2", "Subtopic 3"],
  "concept_map_nodes": ["Concept A", "Concept B", "Concept C", "Concept D"],
  "concept_map_edges": [
    { "from": "Concept A", "to": "Concept B", "relation": "supports" },
    { "from": "Concept B", "to": "Concept C", "relation": "extends" }
  ],
  "mind_map_markdown": "- Topic 1\\n  - Subtopic 1\\n    - Detail\\n- Topic 2\\n  - Subtopic 2",
  "glossary": [
    { "term": "Key term", "definition": "Short definition from the evidence" }
  ]
}

Rules:
- "topics" MUST have at least 3 items. Derive them from the evidence claims and findings.
- "concept_map_nodes" MUST include all topics and key subtopics (minimum 4 nodes).
- "concept_map_edges" should express relationships between nodes using: supports, contrasts, extends, depends_on, causes.
- "mind_map_markdown" uses "- " bullet prefix with 2-space indentation per level.`,
  },
  's0-form': {
    id: 's0-form',
    template: `You are beginning Stage 0 of an IBL research project.

Help students establish an effective team by defining:
1. Optimal team size and rationale
2. Suggested role titles
3. A team charter template
4. An initial AI use agreement

Research Topic: [TOPIC]
Level: [LEVEL]`,
  },
  step2: {
    id: 'step2',
    template: `You are a research librarian and information specialist. Your task is to build a comprehensive search strategy from a research question.

Research Question: [RQ]

IMPORTANT: You MUST include ALL of the following fields in your JSON response. The "boolean_query" and "search_strings" fields are MANDATORY — omitting them will cause a system error.

Respond with valid JSON only using EXACTLY this structure:
{
  "keywords": ["keyword 1", "keyword 2", "keyword 3"],
  "synonyms": ["synonym 1", "synonym 2"],
  "boolean_query": "(keyword1 OR synonym1) AND (keyword2 OR synonym2)",
  "search_strings": [
    { "database": "RCAAP", "query": "complete query string for RCAAP" },
    { "database": "Google Scholar", "query": "complete query string for Google Scholar" },
    { "database": "Semantic Scholar", "query": "complete query string for Semantic Scholar" }
  ],
  "recommended_databases": ["RCAAP", "Google Scholar", "Semantic Scholar"],
  "filters": ["peer reviewed", "last 5 years"]
}

Rules:
- "boolean_query" must be a non-empty string with AND/OR operators connecting the main concepts.
- "search_strings" must be a non-empty array with at least 2 database-specific queries.
- Extract 3-6 keywords and their synonyms from the research question.
- Use parentheses to group related terms in boolean expressions.`,
  },
  step4: {
    id: 'step4',
    template: `You are a scientific evidence analyst.

Research Question: [RQ]
Source: [SOURCE]

Respond with valid JSON only:
{
  "title": "Source title if identifiable",
  "source_type": "paper | report | website | book | unknown",
  "claim": "Main hypothesis or claim",
  "methodology": "Methodology used",
  "findings": ["Finding 1", "Finding 2"],
  "limitations": ["Limitation 1", "Limitation 2"],
  "relevance_score": 4,
  "citation": "APA 7 citation"
}`,
  },
  step9: {
    id: 'step9',
    template: `You are a scientific communication specialist.

Research Question: [RQ]
Evidence Summary: [EVIDENCE]
Audience: [AUDIENCE]

Include every reviewed source in the bibliography list.

Respond with valid JSON only:
{
  "outline": [
    "Opening hook and research question framing",
    "Background context",
    "Evidence synthesis",
    "Critical analysis",
    "Limitations",
    "Implications and future directions"
  ],
  "argument_core": "Concise central argument supported by evidence",
  "evidence_references": [
    "Citation 1",
    "Citation 2"
  ],
  "bibliography": [
    "Complete reference 1",
    "Complete reference 2"
  ],
  "open_issues": [
    "Issue 1",
    "Issue 2"
  ]
}`,
  },
  generic_guidance: {
    id: 'generic_guidance',
    template: `You are the RELIA Wizard, a cognitive research guidance system.

Your role is to structure thinking for the user, not to replace the user's reasoning.
Be clear, structured, and decision-oriented.

Topic: [TOPIC]
Research Question: [RQ]
Context: [CONTEXT]`,
  },
}

const PROMPT_ALIAS_MAP = Object.values(PROMPT_REGISTRY).reduce<Record<string, PromptId>>(
  (aliases, definition) => {
    aliases[definition.id] = definition.id
    definition.aliases?.forEach((alias) => {
      aliases[alias] = definition.id
    })
    return aliases
  },
  {}
)

function replaceVariables(template: string, variables: PromptVariables): string {
  return template.replace(/\[([A-Z0-9_]+)\]/g, (_match, key: string) => {
    return variables[key] ?? `[${key}]`
  })
}

export function resolvePromptId(promptKey?: string): PromptId {
  if (!promptKey) {
    return 'generic_guidance'
  }

  return PROMPT_ALIAS_MAP[promptKey] ?? 'generic_guidance'
}

export function getPrompt(
  promptKey: string,
  variables: PromptVariables = {},
  options: { mode?: PromptMode; locale?: Locale } = {}
): string {
  const resolvedPromptId = resolvePromptId(promptKey)
  const definition = PROMPT_REGISTRY[resolvedPromptId]
  const mode = options.mode ?? 'standard'
  const template =
    definition.modes?.[mode] ??
    definition.modes?.standard ??
    definition.template ??
    PROMPT_REGISTRY.generic_guidance.template ??
    ''

  return appendLocaleInstruction(
    options.locale ?? 'pt-PT',
    replaceVariables(template, variables)
  )
}

export function buildDefaultUserMessage(
  promptKey: string,
  variables: PromptVariables = {},
  options: { mode?: PromptMode; locale?: Locale } = {}
): string {
  const resolvedPromptId = resolvePromptId(promptKey)
  const mode = options.mode ?? 'standard'
  const portuguese = isPortugueseLocale(options.locale)

  switch (resolvedPromptId) {
    case 'rq_generation':
      return portuguese
        ? `Gera candidatos a perguntas de investigação para o tópico "${variables.TOPIC || ''}".`
        : `Generate research question candidates for the topic "${variables.TOPIC || ''}".`
    case 'rq_analysis':
      return portuguese
        ? `Compara as perguntas de investigação selecionadas usando o modo ${mode}.`
        : `Compare the selected research questions using ${mode} mode.`
    case 'rq_synthesis':
      return portuguese
        ? 'Sintetiza uma pergunta final de investigação e justifica-a numa frase.'
        : 'Synthesize one final research question and justify it in one sentence.'
    case 'copilot':
      return portuguese
        ? 'Guia o próximo passo de investigação com base na pergunta final.'
        : 'Guide the next research step based on the final research question.'
    case 'step2':
      return portuguese
        ? 'Desenha uma estratégia de pesquisa a partir da pergunta final e devolve saídas estruturadas de pesquisa.'
        : 'Design a search strategy from the final research question and return structured search outputs.'
    case 'step4':
      return portuguese
        ? 'Extrai evidência estruturada da fonte fornecida e devolve um registo de evidência em JSON válido.'
        : 'Extract structured evidence from the provided source and return a valid JSON evidence record.'
    case 'knowledge_structure':
      return portuguese
        ? 'Organiza a evidência extraída em tópicos, subtópicos e um mapa conceptual.'
        : 'Organize the extracted evidence into topics, subtopics, and a concept map.'
    default:
      return portuguese
        ? 'Fornece orientação estruturada de investigação para a etapa atual.'
        : 'Provide structured research guidance for the current step.'
  }
}

export const prompts = PROMPT_REGISTRY
