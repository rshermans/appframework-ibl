import type {
  EvidenceAnchor,
  EvidenceRecord,
  GameScenario,
  OralPresentation,
  PodcastScript,
  PosterDraft,
  VideostoryBoard,
} from '@/types/research-workflow'

/**
 * Chunked ("plan, then parts") generation for the Stage 2 outputs.
 *
 * One request that writes a whole poster/podcast/storyboard is too slow for the
 * serverless time limit. Instead the client asks for a short plan, then for each
 * part in parallel, and assembles the artifact itself. Every call stays small.
 */

export type MultimodalKind = 'poster' | 'podcast' | 'video' | 'game' | 'oral'

interface KindConfig {
  minItems: number
  maxItems: number
  /** JSON shape the model must return for ONE part. */
  shape: string
}

const ANCHOR_SHAPE =
  '{ "claimText": "claim from the evidence", "evidenceRecordId": "<id from the evidence list>", "citationKey": "Author, Year", "validated": false }'

export const KIND_CONFIG: Record<MultimodalKind, KindConfig> = {
  poster: {
    minItems: 4,
    maxItems: 6,
    shape: `{ "label": "section name", "content": "concise section text (max 60 words)", "anchors": [${ANCHOR_SHAPE}] }`,
  },
  podcast: {
    minItems: 4,
    maxItems: 7,
    shape: `{ "timestamp": "mm:ss", "speaker": "Host | Expert | Narrator", "text": "spoken text for this segment (max 90 words)", "anchors": [${ANCHOR_SHAPE}] }`,
  },
  video: {
    minItems: 4,
    maxItems: 6,
    shape: `{ "description": "what happens in the scene (max 50 words)", "visualNote": "suggested visual element", "anchors": [${ANCHOR_SHAPE}] }`,
  },
  game: {
    minItems: 3,
    maxItems: 5,
    shape:
      '{ "id": "short-id", "prompt": "scenario shown to the player (max 60 words)", "choices": [ { "id": "a", "text": "choice", "consequence": "grounded consequence" }, { "id": "b", "text": "choice", "consequence": "grounded consequence" } ], "evidenceIds": ["<id from the evidence list>"] }',
  },
  oral: {
    minItems: 5,
    maxItems: 8,
    shape: `{ "heading": "slide heading", "bulletPoints": ["short point", "short point"], "speakerNotes": "what to say (max 70 words)", "anchors": [${ANCHOR_SHAPE}] }`,
  },
}

export const ARTIFACT_LABELS: Record<MultimodalKind, string> = {
  poster: 'scientific poster',
  podcast: 'podcast script',
  video: 'videocast storyboard',
  game: 'branching science game',
  oral: 'oral presentation',
}

/** Compact, id-bearing view of the evidence (keeps each call's prompt small). */
export function buildEvidenceDigest(records: EvidenceRecord[], maxChars = 3200): string {
  const lines: string[] = []
  let used = 0
  for (const record of records) {
    const findings = (record.findings ?? []).slice(0, 2).join('; ')
    const limitation = (record.limitations ?? [])[0]
    const line =
      `[${record.id}] ${record.citation || record.title} - ${record.claim}` +
      (findings ? ` | findings: ${findings}` : '') +
      (limitation ? ` | limitation: ${limitation}` : '')
    if (used + line.length > maxChars) break
    lines.push(line)
    used += line.length + 1
  }
  return lines.join('\n')
}

export interface MultimodalPlan {
  title: string
  layoutSuggestion: string
  items: Array<{ focus: string; evidenceIds: string[] }>
}

const PLAN_LIST_KEYS = ['items', 'sections', 'segments', 'scenes', 'slides', 'outline', 'parts', 'branches', 'steps']
const PLAN_FOCUS_KEYS = ['focus', 'title', 'summary', 'description', 'topic', 'heading', 'label', 'idea', 'text']

function firstText(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

/**
 * Tolerant parse of the plan response (models rename the list and the fields); clamps the item
 * count to the kind's range. A plan one or two items short of the ideal is accepted: failing the
 * whole generation for that would cost the learner far more than a slightly shorter output.
 */
export function normalizePlan(raw: unknown, kind: MultimodalKind, records: EvidenceRecord[]): MultimodalPlan {
  const { minItems, maxItems } = KIND_CONFIG[kind]
  const required = Math.min(minItems, 3)
  const source = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>
  const knownIds = new Set(records.map((record) => record.id))

  const listKey = PLAN_LIST_KEYS.find((key) => Array.isArray(source[key]))
  const rawItems: unknown[] = Array.isArray(raw) ? raw : listKey ? (source[listKey] as unknown[]) : []
  const items = rawItems
    .map((entry) => {
      const item = (entry && typeof entry === 'object' ? entry : { focus: entry }) as Record<string, unknown>
      const idsSource = item.evidenceIds ?? item.evidence_ids ?? item.evidence ?? item.sources
      const ids = Array.isArray(idsSource) ? idsSource : []
      return {
        focus: firstText(item, PLAN_FOCUS_KEYS),
        evidenceIds: ids.filter((id): id is string => typeof id === 'string' && knownIds.has(id)),
      }
    })
    .filter((item) => item.focus.length > 0)
    .slice(0, maxItems)

  if (items.length < required) {
    throw new Error(`Plan has ${items.length} item(s); at least ${required} are required.`)
  }

  return {
    title: firstText(source, ['title', 'name']) || 'Untitled',
    layoutSuggestion: firstText(source, ['layoutSuggestion', 'layout_suggestion', 'objective', 'goal']),
    items,
  }
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Keeps only anchors that point to a real evidence record and rewrites the
 * citation from the record itself, so the model cannot invent sources.
 */
export function normalizeAnchors(
  rawAnchors: unknown,
  records: EvidenceRecord[],
  fallbackIds: string[] = []
): EvidenceAnchor[] {
  const byId = new Map(records.map((record) => [record.id, record]))
  const anchors: EvidenceAnchor[] = []
  const seen = new Set<string>()

  for (const entry of Array.isArray(rawAnchors) ? rawAnchors : []) {
    const anchor = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>
    const record = byId.get(asString(anchor.evidenceRecordId))
    if (!record || seen.has(record.id)) continue
    seen.add(record.id)
    anchors.push({
      claimText: asString(anchor.claimText) || record.claim,
      evidenceRecordId: record.id,
      citationKey: record.citation || record.title,
      validated: false,
    })
  }

  if (anchors.length === 0) {
    for (const id of fallbackIds) {
      const record = byId.get(id)
      if (!record || seen.has(id)) continue
      seen.add(id)
      anchors.push({ claimText: record.claim, evidenceRecordId: record.id, citationKey: record.citation || record.title, validated: false })
      break
    }
  }
  return anchors
}

type Obj = Record<string, unknown>
const isObj = (value: unknown): value is Obj => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const ALIASES: Record<MultimodalKind, Record<string, string[]>> = {
  poster: {
    label: ['label', 'title', 'heading', 'name', 'section'],
    content: ['content', 'text', 'body', 'description'],
  },
  podcast: {
    timestamp: ['timestamp', 'time', 'start'],
    speaker: ['speaker', 'voice', 'host', 'narrator', 'role'],
    text: ['text', 'script', 'dialogue', 'content', 'line', 'speech', 'narration'],
  },
  video: {
    description: ['description', 'action', 'scene', 'narration', 'summary', 'content'],
    visualNote: ['visualNote', 'visual_note', 'visual', 'visuals', 'visualElement', 'visual_element', 'imagery'],
  },
  game: {
    id: ['id', 'name'],
    prompt: ['prompt', 'scenario', 'narrative', 'situation', 'description', 'text'],
    choices: ['choices', 'options', 'decisions', 'alternatives'],
  },
  oral: {
    heading: ['heading', 'title', 'headline'],
    bulletPoints: ['bulletPoints', 'bullet_points', 'bullets', 'points', 'content'],
    speakerNotes: ['speakerNotes', 'speaker_notes', 'notes', 'script', 'narration'],
  },
}

/** A part is recognisable when its main content field exists under any accepted name. */
const CONTENT_FIELD: Record<MultimodalKind, string[]> = {
  poster: ['content'],
  podcast: ['text'],
  video: ['description'],
  game: ['prompt'],
  oral: ['heading', 'bulletPoints'],
}

function pickField(source: Obj, names: string[]): unknown {
  for (const name of names) {
    const value = source[name]
    // A nested object is a wrapper (e.g. {"scene": {...}}), not a value for this field.
    if (value === undefined || value === null || value === '' || isObj(value)) continue
    if (Array.isArray(value) && value.length === 0) continue
    return value
  }
  return undefined
}

function normalizeRawAnchors(value: unknown): unknown[] {
  if (!Array.isArray(value)) return []
  return value.map((entry) => {
    if (typeof entry === 'string') return { evidenceRecordId: entry }
    if (!isObj(entry)) return {}
    return {
      claimText: pickField(entry, ['claimText', 'claim_text', 'claim', 'text']),
      evidenceRecordId: pickField(entry, ['evidenceRecordId', 'evidence_record_id', 'evidenceId', 'evidence_id', 'id']),
    }
  })
}

function canonicalize(kind: MultimodalKind, source: Obj): Obj | null {
  const aliases = ALIASES[kind]
  const out: Obj = {}
  for (const [field, names] of Object.entries(aliases)) {
    const value = pickField(source, names)
    if (value !== undefined) out[field] = value
  }
  if (!CONTENT_FIELD[kind].some((field) => out[field] !== undefined)) return null

  if (kind === 'game') {
    const choices = Array.isArray(out.choices) ? out.choices : []
    out.choices = choices.map((choice, index) => {
      const entry = isObj(choice) ? choice : { text: choice }
      return {
        id: pickField(entry, ['id', 'key']) ?? String.fromCharCode(97 + index),
        text: pickField(entry, ['text', 'label', 'option', 'choice', 'title', 'description']),
        consequence: pickField(entry, ['consequence', 'outcome', 'result', 'feedback']),
      }
    })
    const ids = pickField(source, ['evidenceIds', 'evidence_ids', 'evidence', 'sources'])
    out.evidenceIds = Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : []
  } else {
    out.anchors = normalizeRawAnchors(pickField(source, ['anchors', 'sources', 'references', 'evidence']))
  }
  if (kind === 'oral' && typeof out.bulletPoints === 'string') {
    out.bulletPoints = (out.bulletPoints as string).split(/\n|;|•/).map((line) => line.trim()).filter(Boolean)
  }
  return out
}

/**
 * JSON mode forces an object, so models wrap a single part ({"segment": {...}}, {"segments": [{...}]}),
 * rename fields (script/dialogue instead of text) or return a one-item array. Find the part inside
 * whatever came back and map it to the canonical field names, or throw a clear error.
 */
export function unwrapPart(raw: unknown, kind: MultimodalKind): Obj {
  const queue: unknown[] = [raw]
  const visited = new Set<unknown>()
  for (let depth = 0; queue.length > 0 && depth < 40; depth += 1) {
    const current = queue.shift()
    if (!current || typeof current !== 'object' || visited.has(current)) continue
    visited.add(current)
    if (Array.isArray(current)) {
      queue.push(...current)
      continue
    }
    const found = canonicalize(kind, current as Obj)
    if (found) return found
    queue.push(...Object.values(current as Obj))
  }
  throw new Error(`The model returned a ${kind} part without usable content.`)
}

export interface AssembleMeta {
  durationMinutes: number
}

type Part = Record<string, unknown>

/** Share of parts grounded in at least one real evidence record (0-100). */
function fidelity(groundedParts: number, total: number): number {
  return total === 0 ? 0 : Math.round((groundedParts / total) * 100)
}

export function assembleArtifact(
  kind: 'poster', plan: MultimodalPlan, parts: Part[], records: EvidenceRecord[], meta: AssembleMeta): PosterDraft
export function assembleArtifact(
  kind: 'podcast', plan: MultimodalPlan, parts: Part[], records: EvidenceRecord[], meta: AssembleMeta): PodcastScript
export function assembleArtifact(
  kind: 'video', plan: MultimodalPlan, parts: Part[], records: EvidenceRecord[], meta: AssembleMeta): VideostoryBoard
export function assembleArtifact(
  kind: 'game', plan: MultimodalPlan, parts: Part[], records: EvidenceRecord[], meta: AssembleMeta): GameScenario
export function assembleArtifact(
  kind: 'oral', plan: MultimodalPlan, parts: Part[], records: EvidenceRecord[], meta: AssembleMeta): OralPresentation
export function assembleArtifact(
  kind: MultimodalKind, plan: MultimodalPlan, parts: Part[], records: EvidenceRecord[], meta: AssembleMeta
): PosterDraft | PodcastScript | VideostoryBoard | GameScenario | OralPresentation {
  const anchorsFor = (part: Part, index: number) =>
    normalizeAnchors(part.anchors, records, plan.items[index]?.evidenceIds ?? [])

  if (kind === 'game') {
    const known = new Set(records.map((record) => record.id))
    let grounded = 0
    const branches = parts.map((part, index) => {
      const ids = (Array.isArray(part.evidenceIds) ? part.evidenceIds : []).filter(
        (id): id is string => typeof id === 'string' && known.has(id)
      )
      if (ids.length > 0 || (plan.items[index]?.evidenceIds ?? []).length > 0) grounded += 1
      const choices = (Array.isArray(part.choices) ? part.choices : [])
        .map((choice, choiceIndex) => {
          const c = (choice && typeof choice === 'object' ? choice : {}) as Part
          return {
            id: asString(c.id) || String.fromCharCode(97 + choiceIndex),
            text: asString(c.text),
            consequence: asString(c.consequence),
          }
        })
        .filter((choice) => choice.text)
      return { id: asString(part.id) || (index === 0 ? 'start' : `step-${index + 1}`), prompt: asString(part.prompt), choices }
    })
    return {
      title: plan.title,
      objective: plan.layoutSuggestion || plan.items[0]?.focus || plan.title,
      branches,
      fidelityScore: fidelity(grounded, parts.length),
    }
  }

  const grounded = (anchors: EvidenceAnchor[]) => (anchors.length > 0 ? 1 : 0)
  let groundedCount = 0

  if (kind === 'poster') {
    const sections = parts.map((part, index) => {
      const anchors = anchorsFor(part, index)
      groundedCount += grounded(anchors)
      return { label: asString(part.label) || plan.items[index].focus, content: asString(part.content), anchors }
    })
    return { title: plan.title, sections, layoutSuggestion: plan.layoutSuggestion, fidelityScore: fidelity(groundedCount, parts.length) }
  }

  if (kind === 'podcast') {
    const segments = parts.map((part, index) => {
      const anchors = anchorsFor(part, index)
      groundedCount += grounded(anchors)
      const minutes = Math.floor((index * meta.durationMinutes) / parts.length)
      return {
        timestamp: asString(part.timestamp) || `${String(minutes).padStart(2, '0')}:00`,
        speaker: asString(part.speaker) || 'Host',
        text: asString(part.text),
        anchors,
      }
    })
    return { title: plan.title, segments, durationEstimateMinutes: meta.durationMinutes, fidelityScore: fidelity(groundedCount, parts.length) }
  }

  if (kind === 'video') {
    const scenes = parts.map((part, index) => {
      const anchors = anchorsFor(part, index)
      groundedCount += grounded(anchors)
      return {
        sceneNumber: index + 1,
        description: asString(part.description),
        visualNote: asString(part.visualNote),
        anchors,
      }
    })
    return { title: plan.title, scenes, fidelityScore: fidelity(groundedCount, parts.length) }
  }

  const slides = parts.map((part, index) => {
    const anchors = anchorsFor(part, index)
    groundedCount += grounded(anchors)
    return {
      slideNumber: index + 1,
      heading: asString(part.heading) || plan.items[index].focus,
      bulletPoints: (Array.isArray(part.bulletPoints) ? part.bulletPoints : []).map(asString).filter(Boolean),
      speakerNotes: asString(part.speakerNotes),
      anchors,
    }
  })
  return { title: plan.title, slides, totalDurationMinutes: meta.durationMinutes, fidelityScore: fidelity(groundedCount, parts.length) }
}

/** Runs async tasks with a concurrency limit, preserving result order. */
export async function runPool<T>(tasks: Array<() => Promise<T>>, limit: number, signal?: AbortSignal): Promise<T[]> {
  const results = new Array<T>(tasks.length)
  let next = 0

  async function worker() {
    while (next < tasks.length) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const index = next++
      results[index] = await tasks[index]()
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker))
  return results
}
