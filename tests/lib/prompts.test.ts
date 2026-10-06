import { describe, expect, it } from 'vitest'
import { getPrompt, resolvePromptId } from '@/lib/prompts'
import { getMissingRequiredFields } from '@/lib/workflow'

const base = {
  RQ: 'Como o CO2 afeta os recifes?', AUDIENCE: 'school', EVIDENCE: '[e1] Silva, 2020 - Claim',
  KIND: 'scientific poster', DURATION: '10', MIN_ITEMS: '4', MAX_ITEMS: '6',
}

describe('Stage 2 chunked prompts', () => {
  it('multimodal_plan fills every placeholder', () => {
    const prompt = getPrompt('multimodal_plan', base, { locale: 'en' })
    expect(resolvePromptId('multimodal_plan')).toBe('multimodal_plan')
    expect(prompt).toContain('between 4 and 6 items')
    expect(prompt).toContain('[e1] Silva, 2020 - Claim')
    expect(prompt).not.toMatch(/\[(KIND|RQ|AUDIENCE|DURATION|MIN_ITEMS|MAX_ITEMS)\]/)
  })

  it('multimodal_part fills plan, part info and shape', () => {
    const prompt = getPrompt(
      'multimodal_part',
      { ...base, PLAN: '{"title":"T"}', PART_INDEX: '2', PART_TOTAL: '5', PART_FOCUS: 'Results', SHAPE: '{ "label": "x" }' },
      { locale: 'en' }
    )
    expect(prompt).toContain('part 2 of 5')
    expect(prompt).toContain('Results')
    expect(prompt).toContain('{ "label": "x" }')
    expect(prompt).not.toMatch(/\[(PLAN|PART_INDEX|PART_TOTAL|PART_FOCUS|SHAPE)\]/)
  })

  it('the original single-shot podcast prompt needed DURATION (it used to stay unreplaced)', () => {
    expect(getPrompt('multimodal_podcast', { RQ: 'q' }, { locale: 'en' })).toContain('[DURATION]')
    expect(getPrompt('multimodal_podcast', { RQ: 'q', DURATION: '10' }, { locale: 'en' })).not.toContain('[DURATION]')
  })
})

describe('step6_multimodal API contract', () => {
  it('requires explanationDraft - the old direct generation never sent it and got a 400', () => {
    expect(getMissingRequiredFields('step6_multimodal', { topic: 'x', rq: 'y' })).toEqual(['explanationDraft'])
    expect(getMissingRequiredFields('step6_multimodal', { explanationDraft: { argumentCore: 'a' } })).toEqual([])
  })
})
