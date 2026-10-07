import type { EvidenceRecord, ExplanationDraft, ExtensionPath, ReflectionEntry } from '@/types/research-workflow'
import { RUBRIC_IDS, rubricIdFromLabel } from '@/lib/rubric'

type Obj = Record<string, unknown>
const isObj = (value: unknown): value is Obj => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')
const textList = (value: unknown): string[] => (Array.isArray(value) ? value.map(text).filter(Boolean) : [])

// ── Self-assessment: AI feedback on the learner's own ratings ──────────────────────────────────

export interface DimensionFeedback {
  comment: string
  suggestedScore?: number
  hint: string
}

export interface SelfAssessmentFeedback {
  byId: Record<string, DimensionFeedback>
  overallReflection: string
}

const clampScore = (value: unknown): number | undefined => {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? Math.min(5, Math.max(1, Math.round(n))) : undefined
}

/** Accepts the new shape ({dimensions:[{id,...}]}) and the old one ({rubricDimensions:[{dimension:"R1: ..."}]}). */
export function parseSelfAssessmentFeedback(raw: unknown): SelfAssessmentFeedback {
  const source = isObj(raw) ? raw : {}
  const list = [source.dimensions, source.rubricDimensions, source.items].find(Array.isArray) as unknown[] | undefined
  const byId: Record<string, DimensionFeedback> = {}

  for (const entry of list ?? []) {
    if (!isObj(entry)) continue
    const id = (text(entry.id).toUpperCase() || rubricIdFromLabel(text(entry.dimension)) || '').match(/^R[1-8]$/)?.[0]
    if (!id || !RUBRIC_IDS.includes(id)) continue
    byId[id] = {
      comment: text(entry.comment) || text(entry.justification) || text(entry.feedback),
      suggestedScore: clampScore(entry.suggestedScore ?? entry.suggested_score ?? entry.score),
      hint: text(entry.improvementHint) || text(entry.improvement_hint) || text(entry.hint),
    }
  }
  if (Object.keys(byId).length === 0) throw new Error('The AI feedback did not contain any rubric dimension.')
  return { byId, overallReflection: text(source.overallReflection) || text(source.overall_reflection) }
}

// ── Reflection journal ──────────────────────────────────────────────────────────────────────────

export interface JournalPrompt {
  id: string
  prompt: string
}

/** Always available: the journal never depends on the AI being reachable. */
export function defaultJournalPrompts(pt: boolean): JournalPrompt[] {
  return pt
    ? [
        { id: 'learned', prompt: 'O que aprendi neste projeto que não sabia no início? (e como sei que aprendi?)' },
        { id: 'challenge', prompt: 'Qual foi a parte mais difícil e o que fiz para a ultrapassar?' },
        { id: 'redo', prompt: 'Se pudesse refazer uma decisão (pergunta, fontes, estrutura, comunicação), qual seria e porquê?' },
      ]
    : [
        { id: 'learned', prompt: 'What did I learn in this project that I did not know at the start? (and how do I know I learned it?)' },
        { id: 'challenge', prompt: 'What was the hardest part and what did I do to get past it?' },
        { id: 'redo', prompt: 'If I could redo one decision (question, sources, structure, communication), which would it be and why?' },
      ]
}

export function normalizeJournalPrompts(raw: unknown): JournalPrompt[] {
  const source = isObj(raw) ? raw : {}
  const list = Array.isArray(raw) ? raw : ([source.prompts, source.questions].find(Array.isArray) as unknown[] | undefined) ?? []
  return list
    .map((entry, index) => {
      const item: Obj = isObj(entry) ? entry : { prompt: entry }
      return { id: text(item.id) || `ai-${index + 1}`, prompt: text(item.prompt) || text(item.question) || text(item.text) }
    })
    .filter((item) => item.prompt)
    .slice(0, 5)
}

export function journalToMarkdown(entries: ReflectionEntry[], pt: boolean): string {
  const lines = [`# ${pt ? 'Diário reflexivo' : 'Reflective journal'}`, '']
  for (const entry of entries) {
    lines.push(`## ${entry.prompt}`, entry.response, `_${new Date(entry.createdAt).toLocaleDateString(pt ? 'pt-PT' : 'en-GB')}_`, '')
  }
  return lines.join('\n').trim() + '\n'
}

// ── Extension planner ───────────────────────────────────────────────────────────────────────────

/** Gaps visible in the learner's own work, with no AI call: source limitations and open issues. */
export function deriveGaps(evidence: EvidenceRecord[], explanation: ExplanationDraft | null | undefined, limit = 8): string[] {
  const seen = new Set<string>()
  const gaps: string[] = []
  const add = (value: string | undefined) => {
    const clean = (value ?? '').trim()
    const key = clean.toLowerCase()
    if (clean && !seen.has(key)) {
      seen.add(key)
      gaps.push(clean)
    }
  }
  ;(explanation?.openIssues ?? []).forEach(add)
  evidence.forEach((record) => (record.limitations ?? []).forEach(add))
  return gaps.slice(0, limit)
}

const COMPLEXITY = new Set(['low', 'medium', 'high'])

export function normalizeExtensionPlan(raw: unknown): { gaps: string[]; paths: ExtensionPath[] } {
  const source = isObj(raw) ? raw : {}
  const list = Array.isArray(raw)
    ? raw
    : ([source.extensionPaths, source.extension_paths, source.paths, source.extensions, source.directions].find(Array.isArray) as unknown[] | undefined) ?? []

  const paths = list
    .filter(isObj)
    .map((entry): ExtensionPath => {
      const complexity = text(entry.complexity).toLowerCase()
      return {
        title: text(entry.title) || text(entry.name),
        description: text(entry.description) || text(entry.summary),
        complexity: (COMPLEXITY.has(complexity) ? complexity : 'medium') as ExtensionPath['complexity'],
        suggestedDatabases: textList(entry.suggestedDatabases ?? entry.suggested_databases ?? entry.databases),
        potentialMethodologies: textList(entry.potentialMethodologies ?? entry.potential_methodologies ?? entry.methodologies ?? entry.methods),
        gapAddressed: text(entry.gapAddressed) || text(entry.gap_addressed) || text(entry.gap),
      }
    })
    .filter((path) => path.title && path.description)
    .slice(0, 3)

  if (paths.length === 0) throw new Error('The AI did not return any extension path.')
  return { gaps: textList(source.gapsDetected ?? source.gaps_detected ?? source.gaps), paths }
}

export function extensionPlanToMarkdown(paths: ExtensionPath[], gaps: string[], pt: boolean): string {
  const lines = [`# ${pt ? 'Plano de extensão da investigação' : 'Inquiry extension plan'}`, '']
  if (gaps.length) lines.push(`## ${pt ? 'Lacunas' : 'Gaps'}`, ...gaps.map((gap) => `- ${gap}`), '')
  paths.forEach((path, index) => {
    lines.push(`## ${index + 1}. ${path.title} (${path.complexity})`, path.description)
    if (path.gapAddressed) lines.push(`${pt ? 'Lacuna que aborda' : 'Gap addressed'}: ${path.gapAddressed}`)
    if (path.suggestedDatabases.length) lines.push(`${pt ? 'Bases de dados' : 'Databases'}: ${path.suggestedDatabases.join(', ')}`)
    if (path.potentialMethodologies.length) lines.push(`${pt ? 'Metodologias' : 'Methodologies'}: ${path.potentialMethodologies.join(', ')}`)
    lines.push('')
  })
  return lines.join('\n').trim() + '\n'
}

/** One-paragraph summary of what the learner has produced, so AI feedback is grounded in real work. */
export function projectContextSummary(args: {
  pt: boolean
  evidenceCount: number
  hasStructure: boolean
  hasExplanation: boolean
  outputs: string[]
  journalEntries: number
}): string {
  const { pt, evidenceCount, hasStructure, hasExplanation, outputs, journalEntries } = args
  return pt
    ? `Registos de evidência: ${evidenceCount}. Estrutura de conhecimento: ${hasStructure ? 'sim' : 'não'}. Explicação científica: ${hasExplanation ? 'sim' : 'não'}. Produtos de comunicação: ${outputs.length ? outputs.join(', ') : 'nenhum'}. Entradas no diário: ${journalEntries}.`
    : `Evidence records: ${evidenceCount}. Knowledge structure: ${hasStructure ? 'yes' : 'no'}. Scientific explanation: ${hasExplanation ? 'yes' : 'no'}. Communication outputs: ${outputs.length ? outputs.join(', ') : 'none'}. Journal entries: ${journalEntries}.`
}
