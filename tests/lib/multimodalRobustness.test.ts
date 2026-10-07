import { describe, expect, it } from 'vitest'
import { assembleArtifact, normalizePlan, unwrapPart, type MultimodalPlan } from '@/lib/multimodalParts'
import { isValidMultimodalArtifact } from '@/lib/multimodalContract'
import type { EvidenceRecord } from '@/types/research-workflow'

const records = [{ id: 'e1', title: 'P1', sourceType: 'paper', claim: 'Claim 1', methodology: 'm', findings: ['f'], limitations: [], relevanceScore: 5, citation: 'Silva, 2020' }] as EvidenceRecord[]
const plan: MultimodalPlan = { title: 'T', layoutSuggestion: 'objective', items: Array.from({ length: 4 }, (_, i) => ({ focus: `focus ${i}`, evidenceIds: ['e1'] })) }
const meta = { durationMinutes: 10 }

describe('real-world model answers for ONE part (JSON mode returns objects, often wrapped or renamed)', () => {
  const podcastVariants: Array<[string, unknown]> = [
    ['exact shape', { timestamp: '00:00', speaker: 'Host', text: 'Olá', anchors: [] }],
    ['wrapped in "segment"', { segment: { speaker: 'Host', text: 'Olá' } }],
    ['wrapped in "segments" array', { segments: [{ speaker: 'Host', text: 'Olá' }] }],
    ['wrapped in "part"', { part: { speaker: 'Host', text: 'Olá' } }],
    ['plain array of one', [{ speaker: 'Host', text: 'Olá' }]],
    ['renamed fields (script / voice)', { voice: 'Host', script: 'Olá', time: '00:00' }],
    ['renamed fields (dialogue / narrator)', { narrator: 'Host', dialogue: 'Olá' }],
    ['evidence ids in snake_case', { speaker: 'Host', text: 'Olá', anchors: [{ claimText: 'c', evidence_record_id: 'e1' }] }],
  ]

  it.each(podcastVariants)('podcast: %s still produces a valid artifact', (_name, raw) => {
    const parts = Array.from({ length: 4 }, () => unwrapPart(raw, 'podcast'))
    const podcast = assembleArtifact('podcast', plan, parts, records, meta)
    expect(podcast.segments.every((segment) => segment.text === 'Olá')).toBe(true)
    expect(isValidMultimodalArtifact('podcast', podcast)).toBe(true)
  })

  it('poster: accepts title/body instead of label/content', () => {
    const parts = Array.from({ length: 4 }, () => unwrapPart({ section: { title: 'Intro', body: 'Texto' } }, 'poster'))
    const poster = assembleArtifact('poster', plan, parts, records, meta)
    expect(poster.sections[0]).toMatchObject({ label: 'Intro', content: 'Texto' })
    expect(isValidMultimodalArtifact('poster', poster)).toBe(true)
  })

  it('video: accepts scene/visual naming', () => {
    const parts = Array.from({ length: 4 }, () => unwrapPart({ scene: { action: 'Corais a branquear', visual: 'Gráfico' } }, 'video'))
    const video = assembleArtifact('video', plan, parts, records, meta)
    expect(video.scenes[0]).toMatchObject({ description: 'Corais a branquear', visualNote: 'Gráfico' })
    expect(isValidMultimodalArtifact('video', video)).toBe(true)
  })

  it('game: accepts scenario/options/outcome naming and keeps at least one choice', () => {
    const raw = { branch: { scenario: 'Encontra corais brancos', options: [{ label: 'Medir temperatura', outcome: 'Dados úteis' }, { label: 'Ignorar', outcome: 'Perde dados' }] } }
    const parts = Array.from({ length: 3 }, () => unwrapPart(raw, 'game'))
    const game = assembleArtifact('game', { ...plan, items: plan.items.slice(0, 3) }, parts, records, meta)
    expect(game.branches[0].prompt).toBe('Encontra corais brancos')
    expect(game.branches[0].choices).toEqual([
      { id: 'a', text: 'Medir temperatura', consequence: 'Dados úteis' },
      { id: 'b', text: 'Ignorar', consequence: 'Perde dados' },
    ])
    expect(isValidMultimodalArtifact('game', game)).toBe(true)
  })

  it('oral: accepts title/bullets/notes naming', () => {
    const parts = Array.from({ length: 5 }, () => unwrapPart({ slide: { title: 'Resultados', bullets: ['a', 'b'], notes: 'Dizer isto' } }, 'oral'))
    const oral = assembleArtifact('oral', { ...plan, items: Array.from({ length: 5 }, () => plan.items[0]) }, parts, records, meta)
    expect(oral.slides[0]).toMatchObject({ heading: 'Resultados', bulletPoints: ['a', 'b'], speakerNotes: 'Dizer isto' })
    expect(isValidMultimodalArtifact('oral', oral)).toBe(true)
  })

  it('a part with no recognisable content is reported, not silently stored', () => {
    expect(() => unwrapPart({ foo: 'bar' }, 'podcast')).toThrow(/podcast/i)
    expect(() => unwrapPart('just text', 'poster')).toThrow()
    expect(() => unwrapPart(null, 'video')).toThrow()
  })
})

describe('plan answers', () => {
  it('accepts alternative list names and item shapes', () => {
    const variants: unknown[] = [
      { title: 'X', items: [{ focus: 'a' }, { focus: 'b' }, { focus: 'c' }, { focus: 'd' }] },
      { title: 'X', segments: [{ title: 'a' }, { title: 'b' }, { title: 'c' }, { title: 'd' }] },
      { title: 'X', outline: ['a', 'b', 'c', 'd'] },
      { title: 'X', sections: [{ description: 'a' }, { summary: 'b' }, { topic: 'c' }, { focus: 'd' }] },
      [{ focus: 'a' }, { focus: 'b' }, { focus: 'c' }, { focus: 'd' }],
    ]
    for (const raw of variants) {
      expect(normalizePlan(raw, 'podcast', records).items).toHaveLength(4)
    }
  })

  it('tolerates a slightly short plan (3 items) instead of failing the whole generation', () => {
    expect(normalizePlan({ items: [{ focus: 'a' }, { focus: 'b' }, { focus: 'c' }] }, 'oral', records).items).toHaveLength(3)
  })

  it('still rejects a plan that is clearly empty', () => {
    expect(() => normalizePlan({ items: [{ focus: 'only one' }] }, 'oral', records)).toThrow(/at least/)
  })
})
