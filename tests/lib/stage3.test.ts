import { describe, expect, it } from 'vitest'
import {
  defaultJournalPrompts, deriveGaps, extensionPlanToMarkdown, journalToMarkdown,
  normalizeExtensionPlan, normalizeJournalPrompts, parseSelfAssessmentFeedback,
} from '@/lib/stage3'
import { friendlyAiError } from '@/components/reflection/useStage3Ai'

describe('parseSelfAssessmentFeedback', () => {
  it('reads the new shape and clamps scores', () => {
    const fb = parseSelfAssessmentFeedback({ dimensions: [{ id: 'r1', comment: 'ok', suggestedScore: 9, improvementHint: 'h' }], overallReflection: 'bom' })
    expect(fb.byId.R1).toEqual({ comment: 'ok', suggestedScore: 5, hint: 'h' })
    expect(fb.overallReflection).toBe('bom')
  })
  it('reads the legacy shape and ignores unknown dimensions', () => {
    const fb = parseSelfAssessmentFeedback({ rubricDimensions: [{ dimension: 'R3: Evidence Quality', score: 4, justification: 'j' }, { dimension: 'X9' }] })
    expect(Object.keys(fb.byId)).toEqual(['R3'])
    expect(fb.byId.R3.comment).toBe('j')
  })
  it('throws when nothing usable is returned', () => {
    expect(() => parseSelfAssessmentFeedback({})).toThrow()
  })
})

describe('journal helpers', () => {
  it('always has three default prompts per language', () => {
    expect(defaultJournalPrompts(true)).toHaveLength(3)
    expect(defaultJournalPrompts(false)).toHaveLength(3)
  })
  it('normalises prompts from several shapes and caps them', () => {
    expect(normalizeJournalPrompts({ prompts: [{ id: 'a', prompt: 'Q1' }, 'Q2', { question: 'Q3' }, {}] }).map((p) => p.prompt)).toEqual(['Q1', 'Q2', 'Q3'])
    expect(normalizeJournalPrompts(['A', 'B', 'C', 'D', 'E', 'F'])).toHaveLength(5)
    expect(normalizeJournalPrompts(null)).toEqual([])
  })
  it('exports the journal as markdown', () => {
    const md = journalToMarkdown([{ id: '1', prompt: 'P', response: 'R', createdAt: '2026-01-02T00:00:00Z' }], false)
    expect(md).toContain('## P')
    expect(md).toContain('R')
  })
})

describe('extension planner helpers', () => {
  it('derives gaps locally without duplicates', () => {
    const gaps = deriveGaps(
      [{ limitations: ['Small sample', 'small sample'] }, { limitations: ['Short study'] }] as never,
      { openIssues: ['Long-term effects'] } as never
    )
    expect(gaps).toEqual(['Long-term effects', 'Small sample', 'Short study'])
  })
  it('accepts alias keys, fixes complexity and drops incomplete paths', () => {
    const { gaps, paths } = normalizeExtensionPlan({
      gaps: ['g'],
      paths: [{ name: 'T', summary: 'D', complexity: 'HIGH', databases: ['PubMed'], methods: 'x' }, { title: 'no description' }],
    })
    expect(gaps).toEqual(['g'])
    expect(paths).toHaveLength(1)
    expect(paths[0]).toMatchObject({ title: 'T', description: 'D', complexity: 'high', suggestedDatabases: ['PubMed'], potentialMethodologies: [] })
    expect(extensionPlanToMarkdown(paths, gaps, true)).toContain('## 1. T (high)')
  })
  it('throws without any path', () => {
    expect(() => normalizeExtensionPlan({ extensionPaths: [] })).toThrow()
  })
})

describe('friendlyAiError', () => {
  it('turns timeouts into an actionable message', () => {
    expect(friendlyAiError(new Error('Request timeout after 25000ms'), true)).toMatch(/tente novamente/)
    expect(friendlyAiError(new Error('boom'), false)).toMatch(/boom/)
  })
})
