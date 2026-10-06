import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { vi } from 'vitest'
import { I18nProvider } from '@/components/I18nProvider'
import { DEFAULT_LOCALE, getMessage } from '@/lib/i18n'
import { useWizardStore } from '@/store/wizardStore'

// Captured at import time, before any test mutates the store.
const INITIAL_STATE = useWizardStore.getState()

export function resetStore(overrides: Record<string, unknown> = {}) {
  useWizardStore.setState({ ...INITIAL_STATE, aiConsentAccepted: true, projectId: 'p1', topic: 'Coral reefs', ...overrides } as never, true)
}

/** Localised UI text exactly as the (default-locale) component renders it. */
export const msg = (key: string, vars?: Record<string, string | number>) => getMessage(DEFAULT_LOCALE, key, vars)

export const renderStep = (ui: ReactElement) => render(<I18nProvider>{ui}</I18nProvider>)

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** A successful /api/ai envelope whose `output` is the model's text. */
export const aiOk = (output: unknown) =>
  jsonResponse({ ok: true, data: { output: typeof output === 'string' ? output : JSON.stringify(output) } })

export const aiFail = (details: string, status = 500) => jsonResponse({ ok: false, error: 'failed', details }, status)

type Handler = (body: Record<string, unknown>, url: string) => Response | Promise<Response>

/** Mocks fetch; returns the list of parsed request bodies per URL for assertions. */
export function mockFetch(handlers: { ai?: Handler; search?: Handler; other?: Handler }) {
  const calls: Array<{ url: string; body: Record<string, any> }> = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input)
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    calls.push({ url, body })
    const handler = url.includes('/api/ai') ? handlers.ai : url.includes('/api/search') ? handlers.search : handlers.other
    if (!handler) throw new Error(`Unexpected fetch to ${url}`)
    return handler(body, url)
  })
  return {
    calls,
    ai: () => calls.filter((c) => c.url.includes('/api/ai')),
    search: () => calls.filter((c) => c.url.includes('/api/search')),
  }
}

export const evidenceRecord = (over: Record<string, unknown> = {}) => ({
  id: 'e1', title: 'Evidence one', sourceType: 'paper', claim: 'CO2 raises temperature', methodology: 'meta-analysis',
  findings: ['f1', 'f2'], limitations: ['small sample'], relevanceScore: 4, citation: 'Silva, 2020', ...over,
})

export const article = (id: string, over: Record<string, unknown> = {}) => ({
  id, title: `Article ${id}`, authors: ['Silva'], year: 2020, abstract: `Abstract ${id}`, provider: 'crossref', ...over,
})

export const approvedQuestion = { question: 'How does CO2 affect reefs?', justification: 'j', derivedFromQuestions: [], approvedByUser: true }

export const searchDesign = {
  keywords: ['co2'], synonyms: [], booleanQuery: 'co2 AND reefs',
  searchStrings: [{ database: 'General', query: 'co2 AND reefs' }], recommendedDatabases: [], filters: [],
}

export const knowledgeStructure = {
  topics: ['Climate', 'Reefs'], subtopics: ['Warming'], conceptMapNodes: ['CO2', 'Warming'],
  conceptMapEdges: [{ from: 'CO2', to: 'Warming', relation: 'causes' }], mindMapMarkdown: '- RQ\n  - Climate',
  glossary: [{ term: 'Bleaching', definition: 'Loss of algae' }],
}
