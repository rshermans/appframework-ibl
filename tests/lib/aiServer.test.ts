import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { prompts } from '@/lib/prompts'
import { buildPromptVariables, getAiLimits } from '@/lib/promptVariables'
import { PRIMARY_MODEL, chooseModel, getNextFallbackModel } from '@/lib/modelSelector'

describe('prompt template contract', () => {
  it('every [PLACEHOLDER] in every prompt is supplied by the route (none reaches the model literally)', () => {
    const supplied = new Set(Object.keys(buildPromptVariables({}, { resolvedRQ: 'rq', stage: 1 })))
    const missing: string[] = []
    for (const definition of Object.values(prompts)) {
      const templates = [definition.template, ...Object.values(definition.modes ?? {})].filter((t): t is string => Boolean(t))
      for (const template of templates) {
        for (const match of template.matchAll(/\[([A-Z][A-Z0-9_]+)\]/g)) {
          if (!supplied.has(match[1])) missing.push(`${definition.id}: [${match[1]}]`)
        }
      }
    }
    expect(missing).toEqual([])
  })

  it('fills the Stage 3 variables that used to stay empty', () => {
    const vars = buildPromptVariables(
      {
        explanationDraft: { argumentCore: 'Warming drives bleaching', openIssues: ['Long-term data'] },
        knowledge_structure: { topics: ['Climate'] },
      },
      { resolvedRQ: 'RQ?', stage: 3 }
    )
    expect(vars.STAGE).toBe('3')
    expect(vars.EXPLANATION).toBe('Warming drives bleaching')
    expect(vars.OPEN_ISSUES).toContain('Long-term data')
    expect(vars.KNOWLEDGE_STRUCTURE).toContain('Climate')
  })

  it('caps oversized values instead of sending them whole', () => {
    expect(buildPromptVariables({ explanation: 'x'.repeat(50000) }, { resolvedRQ: '', stage: 3 }).EXPLANATION!.length).toBeLessThanOrEqual(6000)
  })

  it('gives the heavy Stage 2/3 prompts a small output cap and a bounded attempt time', () => {
    for (const id of ['multimodal_plan', 'multimodal_part', 'self_assessment', 'reflection_journal', 'inquiry_extension'] as const) {
      const limits = getAiLimits(id)!
      expect(limits.maxOutputTokens).toBeLessThanOrEqual(1500)
      expect(limits.attemptTimeoutMs).toBeLessThanOrEqual(14000)
    }
    expect(getAiLimits('rq_generation')).toBeUndefined()
  })
})

describe('model selection', () => {
  const original = process.env.OPENAI_MODEL
  afterEach(() => {
    if (original === undefined) delete process.env.OPENAI_MODEL
    else process.env.OPENAI_MODEL = original
  })

  it('uses gpt-6-luna for every step by default', () => {
    delete process.env.OPENAI_MODEL
    expect(PRIMARY_MODEL).toBe('gpt-6-luna')
    for (const step of ['step0_generate', 'step9_explanation', 'step6_multimodal', 'step7_reflection', 'unknown']) {
      expect(chooseModel(step).model).toBe('gpt-6-luna')
    }
  })

  it('lets OPENAI_MODEL override the default (so a stale value in Netlify wins over the code)', () => {
    process.env.OPENAI_MODEL = 'gpt-5-mini'
    expect(chooseModel('step9_explanation').model).toBe('gpt-5-mini')
  })

  it('falls back from gpt-6-luna to gpt-4.1-mini and then gpt-4o-mini', () => {
    const failed = new Set(['gpt-6-luna'])
    expect(getNextFallbackModel('step9_explanation', failed)?.model).toBe('gpt-4.1-mini')
    failed.add('gpt-4.1-mini')
    expect(getNextFallbackModel('step9_explanation', failed)?.model).toBe('gpt-4o-mini')
    failed.add('gpt-4o-mini')
    expect(getNextFallbackModel('step9_explanation', failed)).toBeNull()
  })
})

describe('callChatGPT', () => {
  const create = vi.fn()
  beforeEach(() => {
    vi.resetModules()
    create.mockReset()
    delete process.env.OPENAI_MODEL
    vi.doMock('openai', () => ({ default: class { responses = { create } } }))
  })
  afterEach(() => vi.doUnmock('openai'))

  it('falls back to the next model when gpt-6-luna is rejected, keeping the output cap', async () => {
    create
      .mockRejectedValueOnce(Object.assign(new Error('The model `gpt-6-luna` does not exist'), { status: 404 }))
      .mockResolvedValueOnce({ output_text: '{"ok":true}', usage: { total_tokens: 42 } })
    const { callChatGPT } = await import('@/lib/ai')
    const result = await callChatGPT('system', 'user', 'step7_reflection', { maxOutputTokens: 600, attemptTimeoutMs: 9000 })

    expect(result).toMatchObject({ content: '{"ok":true}', model: 'gpt-4.1-mini', tokens: 42 })
    expect(create).toHaveBeenCalledTimes(2)
    expect(create.mock.calls[0][0]).toMatchObject({ model: 'gpt-6-luna', max_output_tokens: 600 })
    expect(create.mock.calls[1][0]).toMatchObject({ model: 'gpt-4.1-mini', max_output_tokens: 600 })
  })

  it('succeeds on the primary model without touching the fallbacks', async () => {
    create.mockResolvedValueOnce({ output_text: '{"a":1}', usage: { total_tokens: 7 } })
    const { callChatGPT } = await import('@/lib/ai')
    expect((await callChatGPT('s', 'u', 'step9_explanation')).model).toBe('gpt-6-luna')
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('reports every model tried when all fail', async () => {
    create.mockRejectedValue(new Error('boom'))
    const { callChatGPT } = await import('@/lib/ai')
    await expect(callChatGPT('s', 'u', 'step9_explanation')).rejects.toThrow(/gpt-6-luna.*gpt-4\.1-mini.*gpt-4o-mini/)
  })
})
