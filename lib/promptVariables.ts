import type { PromptId } from '@/lib/prompts'

type Body = Record<string, any>

function asText(value: unknown, maxChars = 6000): string {
  if (typeof value === 'string') return value.slice(0, maxChars)
  if (value === undefined || value === null) return ''
  try {
    return JSON.stringify(value).slice(0, maxChars)
  } catch {
    return ''
  }
}

/**
 * Every [PLACEHOLDER] a prompt template can use must be supplied here.
 * Several prompts used to reference variables nobody filled ([EXPLANATION], [STAGE],
 * [KNOWLEDGE_STRUCTURE], [OPEN_ISSUES]), so the model received the literal marker
 * instead of the learner's work. tests/lib/prompts.test.ts enforces this contract.
 */
export function buildPromptVariables(
  body: Body,
  derived: { resolvedRQ: string; stage: number }
): Record<string, string | undefined> {
  const { resolvedRQ, stage } = derived
  const finalRQ = body.finalRQ
  const selectedRQs = body.selectedRQs

  return {
    TOPIC: body.topic || '',
    RQ: resolvedRQ,
    LEVEL: body.level || '',
    SOURCE: body.source || '',
    EVIDENCE: body.evidence || '',
    AUDIENCE: body.audience || '',
    CONTENT: body.content || '',
    CONTEXT: body.context || '',
    FINAL_RQ: finalRQ || resolvedRQ,
    SELECTED_RQS: Array.isArray(selectedRQs) ? selectedRQs.join('\n') : resolvedRQ,
    // Stage 2 chunked generation (plan + parts)
    KIND: typeof body.kind === 'string' ? body.kind : '',
    DURATION: body.duration !== undefined ? String(body.duration) : '',
    MIN_ITEMS: body.minItems !== undefined ? String(body.minItems) : '',
    MAX_ITEMS: body.maxItems !== undefined ? String(body.maxItems) : '',
    PLAN: typeof body.plan === 'string' ? body.plan : '',
    PART_INDEX: body.partIndex !== undefined ? String(body.partIndex) : '',
    PART_TOTAL: body.partTotal !== undefined ? String(body.partTotal) : '',
    PART_FOCUS: typeof body.partFocus === 'string' ? body.partFocus : '',
    SHAPE: typeof body.shape === 'string' ? body.shape : '',
    // Stage 3 reflection prompts
    STAGE: String(stage),
    EXPLANATION: asText(body.explanation ?? body.explanationDraft?.argumentCore),
    KNOWLEDGE_STRUCTURE: asText(body.knowledge_structure ?? body.knowledgeStructure),
    OPEN_ISSUES: asText(body.open_issues ?? body.explanationDraft?.openIssues),
    LEARNER_RATINGS: asText(body.learnerRatings),
  }
}

/** Per-prompt output caps and per-attempt timeouts: smaller outputs keep each call well inside the time budget. */
export interface AiLimits {
  maxOutputTokens: number
  attemptTimeoutMs: number
}

const LIMITS: Partial<Record<PromptId, AiLimits>> = {
  multimodal_plan: { maxOutputTokens: 700, attemptTimeoutMs: 10000 },
  multimodal_part: { maxOutputTokens: 1000, attemptTimeoutMs: 12000 },
  self_assessment: { maxOutputTokens: 1500, attemptTimeoutMs: 14000 },
  reflection_journal: { maxOutputTokens: 600, attemptTimeoutMs: 9000 },
  inquiry_extension: { maxOutputTokens: 1500, attemptTimeoutMs: 14000 },
}

export function getAiLimits(promptId: PromptId): AiLimits | undefined {
  return LIMITS[promptId]
}
