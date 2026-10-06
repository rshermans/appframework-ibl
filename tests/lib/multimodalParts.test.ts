import { describe, expect, it } from 'vitest'
import {
  KIND_CONFIG,
  assembleArtifact,
  buildEvidenceDigest,
  normalizeAnchors,
  normalizePlan,
  runPool,
} from '@/lib/multimodalParts'
import { isValidMultimodalArtifact } from '@/lib/multimodalContract'
import type { EvidenceRecord } from '@/types/research-workflow'

const records: EvidenceRecord[] = [
  { id: 'e1', title: 'Paper 1', sourceType: 'paper', claim: 'CO2 raises temperature', methodology: 'm', findings: ['f1', 'f2', 'f3'], limitations: ['small sample'], relevanceScore: 5, citation: 'Silva, 2020' },
  { id: 'e2', title: 'Paper 2', sourceType: 'paper', claim: 'Reefs are bleaching', methodology: 'm', findings: ['g1'], limitations: [], relevanceScore: 4, citation: 'Costa, 2021' },
]

const planOf = (n: number) => ({
  title: 'T', layoutSuggestion: 'layout',
  items: Array.from({ length: n }, (_, i) => ({ focus: `focus ${i}`, evidenceIds: ['e1'] })),
})

describe('buildEvidenceDigest', () => {
  it('includes ids, citation, claim, first findings and limitation', () => {
    const digest = buildEvidenceDigest(records)
    expect(digest).toContain('[e1] Silva, 2020 - CO2 raises temperature')
    expect(digest).toContain('findings: f1; f2')
    expect(digest).not.toContain('f3')
    expect(digest).toContain('limitation: small sample')
  })
  it('respects the size budget', () => {
    expect(buildEvidenceDigest(records, 60).split('\n')).toHaveLength(1)
  })
})

describe('normalizePlan', () => {
  it('drops unknown evidence ids and empty items, clamps to max', () => {
    const raw = { title: 'X', items: Array.from({ length: 12 }, () => ({ focus: 'f', evidenceIds: ['e1', 'zzz'] })).concat([{ focus: '', evidenceIds: [] }]) }
    const plan = normalizePlan(raw, 'poster', records)
    expect(plan.items).toHaveLength(KIND_CONFIG.poster.maxItems)
    expect(plan.items[0].evidenceIds).toEqual(['e1'])
  })
  it('throws when there are too few items', () => {
    expect(() => normalizePlan({ items: [{ focus: 'only one' }] }, 'oral', records)).toThrow(/at least/)
  })
  it('accepts plain string items', () => {
    const plan = normalizePlan({ items: ['a', 'b', 'c', 'd'] }, 'poster', records)
    expect(plan.items.map((i) => i.focus)).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('normalizeAnchors', () => {
  it('keeps only real records, rewrites citation, dedupes', () => {
    const anchors = normalizeAnchors(
      [
        { claimText: 'x', evidenceRecordId: 'e1', citationKey: 'FAKE, 1999' },
        { claimText: 'dup', evidenceRecordId: 'e1', citationKey: 'FAKE' },
        { claimText: 'bad', evidenceRecordId: 'nope', citationKey: 'FAKE' },
      ],
      records
    )
    expect(anchors).toEqual([{ claimText: 'x', evidenceRecordId: 'e1', citationKey: 'Silva, 2020', validated: false }])
  })
  it('falls back to the planned evidence when none are valid', () => {
    const anchors = normalizeAnchors([{ evidenceRecordId: 'nope' }], records, ['e2'])
    expect(anchors[0].evidenceRecordId).toBe('e2')
  })
})

describe('assembleArtifact', () => {
  const anchor = [{ claimText: 'c', evidenceRecordId: 'e1', citationKey: 'x' }]

  it('poster passes the contract and scores grounding', () => {
    const parts = [
      { label: 'Intro', content: 'text', anchors: anchor },
      { label: 'Results', content: 'text', anchors: [{ evidenceRecordId: 'ghost' }] },
      { label: '', content: 'text', anchors: [] },
      { label: 'End', content: 'text', anchors: anchor },
    ]
    const poster = assembleArtifact('poster', planOf(4), parts, records, { durationMinutes: 10 })
    expect(isValidMultimodalArtifact('poster', poster)).toBe(true)
    expect(poster.fidelityScore).toBe(100) // plan fallback grounds parts with invalid/missing anchors
    expect(poster.sections[2].label).toBe('focus 2')
  })

  it('score drops when neither the part nor the plan is grounded', () => {
    const plan = { ...planOf(4), items: planOf(4).items.map((i) => ({ ...i, evidenceIds: [] })) }
    const parts = [anchor, anchor, [], []].map((a, i) => ({ label: `S${i}`, content: 'x', anchors: a }))
    expect(assembleArtifact('poster', plan, parts, records, { durationMinutes: 10 }).fidelityScore).toBe(50)
  })

  it('podcast derives timestamps and duration', () => {
    const parts = Array.from({ length: 4 }, () => ({ speaker: 'Host', text: 'hello', anchors: anchor }))
    const podcast = assembleArtifact('podcast', planOf(4), parts, records, { durationMinutes: 20 })
    expect(podcast.segments.map((s) => s.timestamp)).toEqual(['00:00', '05:00', '10:00', '15:00'])
    expect(podcast.durationEstimateMinutes).toBe(20)
    expect(isValidMultimodalArtifact('podcast', podcast)).toBe(true)
  })

  it('video numbers scenes', () => {
    const parts = Array.from({ length: 4 }, () => ({ description: 'd', visualNote: 'v', anchors: anchor }))
    const video = assembleArtifact('video', planOf(4), parts, records, { durationMinutes: 5 })
    expect(video.scenes.map((s) => s.sceneNumber)).toEqual([1, 2, 3, 4])
    expect(isValidMultimodalArtifact('video', video)).toBe(true)
  })

  it('game keeps choices and grounds via evidenceIds', () => {
    const parts = Array.from({ length: 3 }, (_, i) => ({
      prompt: `p${i}`, evidenceIds: ['e2'],
      choices: [{ text: 'A', consequence: 'ca' }, { id: 'b', text: 'B', consequence: 'cb' }, { text: '' }],
    }))
    const game = assembleArtifact('game', planOf(3), parts, records, { durationMinutes: 5 })
    expect(game.branches[0].id).toBe('start')
    expect(game.branches[0].choices).toHaveLength(2)
    expect(game.branches[0].choices[0].id).toBe('a')
    expect(isValidMultimodalArtifact('game', game)).toBe(true)
  })

  it('oral numbers slides and sets duration', () => {
    const parts = Array.from({ length: 5 }, () => ({ heading: 'H', bulletPoints: ['a', 'b'], speakerNotes: 'n', anchors: anchor }))
    const oral = assembleArtifact('oral', planOf(5), parts, records, { durationMinutes: 12 })
    expect(oral.totalDurationMinutes).toBe(12)
    expect(oral.slides[4].slideNumber).toBe(5)
    expect(isValidMultimodalArtifact('oral', oral)).toBe(true)
  })

  it('an empty part fails the contract so the UI can ask to retry', () => {
    const parts = Array.from({ length: 4 }, () => ({ label: 'x', content: '', anchors: [] }))
    const poster = assembleArtifact('poster', planOf(4), parts, records, { durationMinutes: 10 })
    expect(isValidMultimodalArtifact('poster', poster)).toBe(false)
  })
})

describe('runPool', () => {
  it('preserves order and never exceeds the concurrency limit', async () => {
    let active = 0
    let peak = 0
    const tasks = Array.from({ length: 8 }, (_, i) => async () => {
      active += 1
      peak = Math.max(peak, active)
      await new Promise((r) => setTimeout(r, 5))
      active -= 1
      return i
    })
    expect(await runPool(tasks, 3)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(peak).toBeLessThanOrEqual(3)
  })
  it('stops on abort', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(runPool([async () => 1], 2, controller.signal)).rejects.toThrow()
  })
})
