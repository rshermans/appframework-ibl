/**
 * Hybrid Model Selector — Chooses the best OpenAI model based on:
 *  1. Task complexity (derived from workflow step)
 *  2. Fallback rotation on errors (downgrade → alternate model)
 *
 * Model tiers:
 *  heavy  → gpt-5-mini   (deep analysis, evidence extraction, knowledge structure)
 *  medium → gpt-4o       (balanced: search design, explanations, multimodal)
 *  fast   → gpt-5-nano   (quick: topic generation, selection, chat-like tasks)
 *  default→ gpt-4o-mini  (ultimate fallback — cheap & reliable)
 */

export type TaskComplexity = 'heavy' | 'medium' | 'fast'

export interface ModelSelection {
  model: string
  complexity: TaskComplexity
  isFallback: boolean
  fallbackLevel: number
}

// ─── Model tiers ────────────────────────────────────────────────────
const MODEL_TIERS: Record<TaskComplexity, string> = {
  heavy: 'gpt-4o',
  medium: 'gpt-4o',
  fast: 'gpt-4o-mini',
}

const ULTIMATE_FALLBACK = 'gpt-4o-mini'

/**
 * Fallback chains per complexity tier.
 * When a model fails we try the next one in the chain.
 */
const FALLBACK_CHAINS: Record<TaskComplexity, string[]> = {
  heavy: ['gpt-4o', 'gpt-4o-mini'],
  medium: ['gpt-4o', 'gpt-4o-mini'],
  fast: ['gpt-4o-mini'],
}

// ─── Step → Complexity mapping ──────────────────────────────────────

/**
 * Heavy: tasks that require deep reasoning / large context
 */
const HEAVY_STEPS = new Set([
  'step3_evidence_extraction',
  'step4_knowledge_structure',
  'step1a_compare',
  'step9_explanation',
])

/**
 * Fast: tasks that are short / interactive / chat-like
 */
const FAST_STEPS = new Set([
  'step0_generate',
  'step1_select',
  'generic_guidance',
])

/**
 * Everything else defaults to "medium"
 */

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Classify a workflow step into its complexity tier.
 */
export function classifyStep(stepId: string): TaskComplexity {
  if (HEAVY_STEPS.has(stepId)) return 'heavy'
  if (FAST_STEPS.has(stepId)) return 'fast'
  return 'medium'
}

/**
 * Choose the primary model for a given step.
 * Respects OPENAI_MODEL env override — if set, it always wins.
 */
export function chooseModel(stepId: string): ModelSelection {
  const envOverride = process.env.OPENAI_MODEL

  // If the user explicitly set an env model, always use it (no hybrid)
  if (envOverride) {
    const complexity = classifyStep(stepId)
    return {
      model: envOverride,
      complexity,
      isFallback: false,
      fallbackLevel: 0,
    }
  }

  const complexity = classifyStep(stepId)
  return {
    model: MODEL_TIERS[complexity],
    complexity,
    isFallback: false,
    fallbackLevel: 0,
  }
}

/**
 * Get the next fallback model after a failure.
 * Returns null when no more fallbacks are available.
 *
 * @param stepId    Workflow step (for complexity classification)
 * @param failedModels  Set of models that already failed in this request
 */
export function getNextFallbackModel(
  stepId: string,
  failedModels: Set<string>
): ModelSelection | null {
  const complexity = classifyStep(stepId)
  const chain = FALLBACK_CHAINS[complexity]

  for (let i = 0; i < chain.length; i++) {
    if (!failedModels.has(chain[i])) {
      return {
        model: chain[i],
        complexity,
        isFallback: true,
        fallbackLevel: i + 1,
      }
    }
  }

  // All chain models failed — try ultimate fallback
  if (!failedModels.has(ULTIMATE_FALLBACK)) {
    return {
      model: ULTIMATE_FALLBACK,
      complexity,
      isFallback: true,
      fallbackLevel: chain.length + 1,
    }
  }

  return null // Nothing left to try
}

/**
 * Pretty log line for debugging.
 */
export function modelLogTag(sel: ModelSelection): string {
  const fb = sel.isFallback ? ` [fallback-${sel.fallbackLevel}]` : ''
  return `${sel.model} (${sel.complexity})${fb}`
}
