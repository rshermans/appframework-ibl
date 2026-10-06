import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { I18nProvider } from '@/components/I18nProvider'
import GenerateControls from '@/components/multimodal/GenerateControls'
import { useWizardStore } from '@/store/wizardStore'

const evidence = [
  { id: 'e1', title: 'P1', sourceType: 'paper', claim: 'Claim 1', methodology: 'm', findings: ['f'], limitations: [], relevanceScore: 5, citation: 'Silva, 2020' },
  { id: 'e2', title: 'P2', sourceType: 'paper', claim: 'Claim 2', methodology: 'm', findings: ['g'], limitations: [], relevanceScore: 4, citation: 'Costa, 2021' },
]

function seedStore(overrides: Record<string, unknown> = {}) {
  useWizardStore.setState({
    projectId: 'p1', topic: 'Clima', stage: 2, aiConsentAccepted: true, audience: 'school',
    finalResearchQuestion: { question: 'RQ?', approvedByUser: true } as never,
    evidenceRecords: evidence as never,
    explanationDraft: { outline: ['a'], argumentCore: 'core', evidenceReferences: [], bibliography: [] } as never,
    multimodalOutputs: {},
    ...overrides,
  })
}

const ok = (output: unknown) =>
  new Response(JSON.stringify({ ok: true, data: { output: JSON.stringify(output) } }), {
    status: 200, headers: { 'content-type': 'application/json' },
  })

function renderControls(kind: 'poster' | 'game' = 'poster') {
  return render(
    <I18nProvider>
      <GenerateControls kind={kind} hasDraft={false} />
    </I18nProvider>
  )
}

describe('GenerateControls (chunked direct generation)', () => {
  beforeEach(() => seedStore())
  afterEach(() => vi.restoreAllMocks())

  it('runs plan then parts and stores a valid poster grounded in real evidence', async () => {
    const bodies: Array<Record<string, unknown>> = []
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      const body = JSON.parse(String((init as RequestInit).body))
      bodies.push(body)
      if (body.promptId === 'multimodal_plan') {
        return ok({ title: 'Clima e recifes', layoutSuggestion: '3 colunas', items: [1, 2, 3, 4].map((n) => ({ focus: `Parte ${n}`, evidenceIds: ['e1'] })) })
      }
      return ok({
        label: `Secção ${body.partIndex}`, content: `Texto ${body.partIndex}`,
        anchors: [{ claimText: 'c', evidenceRecordId: 'e2', citationKey: 'INVENTADO' }, { claimText: 'x', evidenceRecordId: 'ghost', citationKey: 'Z' }],
      })
    })

    renderControls()
    fireEvent.click(screen.getByRole('button', { name: /Gerar com IA|Generate with AI/ }))

    await waitFor(() => expect(useWizardStore.getState().multimodalOutputs.poster).toBeTruthy(), { timeout: 5000 })

    const poster = useWizardStore.getState().multimodalOutputs.poster!
    expect(poster.title).toBe('Clima e recifes')
    expect(poster.sections).toHaveLength(4)
    expect(poster.sections[0].anchors).toEqual([{ claimText: 'c', evidenceRecordId: 'e2', citationKey: 'Costa, 2021', validated: false }])
    expect(poster.fidelityScore).toBe(100)
    expect(useWizardStore.getState().evidenceFidelityScore).toBe(100)

    // 1 plan + 4 parts, all small, all carrying the Step 9 draft the API contract requires
    expect(bodies).toHaveLength(5)
    expect(bodies.every((b) => b.explanationDraft && b.stepId === 'step6_multimodal' && b.audience === 'school')).toBe(true)
    expect(bodies[0].promptId).toBe('multimodal_plan')
    expect(String(bodies[1].evidence)).toContain('[e1] Silva, 2020')
  })

  it('shows a friendly error and stores nothing when the server times out', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: 'Request timeout' }), { status: 504, headers: { 'content-type': 'application/json' } })
    )
    renderControls()
    fireEvent.click(screen.getByRole('button', { name: /Gerar com IA|Generate with AI/ }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/NotebookLM/), { timeout: 8000 })
    expect(useWizardStore.getState().multimodalOutputs.poster).toBeUndefined()
  })

  it('is disabled until Step 9 exists and points to the NotebookLM export', () => {
    seedStore({ explanationDraft: null })
    renderControls()
    expect(screen.getByRole('button', { name: /Gerar com IA|Generate with AI/ })).toBeDisabled()
    expect(screen.getByText(/Step 9/)).toBeInTheDocument()
  })
})
