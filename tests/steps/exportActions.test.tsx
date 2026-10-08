import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import Home from '@/app/page'
import { useWizardStore } from '@/store/wizardStore'
import { approvedQuestion, evidenceRecord, jsonResponse, knowledgeStructure, mockFetch, readBlobText, renderStep, resetStore } from '../helpers'

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

const startedProject = () =>
  resetStore({
    stage: 1, projectId: 'p1', topic: 'Recifes', workflowStep: 'step1_select', step0OptionalCompleted: true,
    userProfile: { educationLevel: 'master', researchExperience: 'beginner', domain: 'bio', role: 'student' },
    finalResearchQuestion: approvedQuestion, evidenceRecords: [evidenceRecord()], knowledgeStructure,
  })

const openMenuItem = async (name: RegExp) => {
  fireEvent.click(screen.getByRole('button', { name: /^Mais$|^More$/ }))
  fireEvent.click(await screen.findByRole('menuitem', { name }))
}

describe('export actions in the top-bar menu', () => {
  let clipboardWrite: ReturnType<typeof vi.fn>
  let open: ReturnType<typeof vi.fn>

  beforeEach(() => {
    startedProject()
    mockFetch({ other: () => jsonResponse({}) })
    clipboardWrite = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { write: clipboardWrite, writeText: vi.fn().mockResolvedValue(undefined) } })
    vi.stubGlobal('ClipboardItem', class { constructor(public items: Record<string, Blob>) {} })
    open = vi.fn()
    vi.stubGlobal('open', open)
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('Google Docs: copies the FULL report (rich + plain) and then opens a new document', async () => {
    renderStep(<Home />)
    await openMenuItem(/Google Docs/)

    await waitFor(() => expect(clipboardWrite).toHaveBeenCalledTimes(1))
    const item = clipboardWrite.mock.calls[0][0][0] as { items: Record<string, Blob> }
    const html = await readBlobText(item.items['text/html'])
    const plain = await readBlobText(item.items['text/plain'])
    for (const content of [html, plain]) {
      expect(content).toContain('How does CO2 affect reefs?')
      expect(content).toContain('CO2 raises temperature') // evidence, not just a 4-line summary
      expect(content).toContain('Climate')
    }
    expect(html).toContain('<h2>')
    expect(plain).toContain('## ')
    expect(open).toHaveBeenCalledWith('https://docs.new', '_blank', 'noopener,noreferrer')
    expect(await screen.findByRole('status')).toHaveTextContent(/Ctrl\+V/)
    expect(clipboardWrite.mock.invocationCallOrder[0]).toBeLessThan(open.mock.invocationCallOrder[0]) // copy before the tab steals focus
  })

  it('Google Docs: falls back to a downloaded Markdown file when the clipboard is blocked', async () => {
    clipboardWrite.mockRejectedValue(new Error('NotAllowedError'))
    ;(navigator.clipboard as any).writeText = vi.fn().mockRejectedValue(new Error('NotAllowedError'))
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    renderStep(<Home />)
    await openMenuItem(/Google Docs/)
    expect(await screen.findByRole('status')).toHaveTextContent(/Markdown/)
    expect(click).toHaveBeenCalled()
    expect(open).toHaveBeenCalledWith('https://docs.new', '_blank', 'noopener,noreferrer')
  })

  it('PDF: builds the file in the browser from local progress (no /api/export call)', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const api = mockFetch({ other: () => jsonResponse({}) })
    renderStep(<Home />)
    await openMenuItem(/Download PDF/)

    await waitFor(() => expect(click).toHaveBeenCalled(), { timeout: 5000 })
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect((URL.createObjectURL as any).mock.calls[0][0].type).toBe('application/pdf')
    expect(api.calls.some((call) => call.url.includes('/api/export/'))).toBe(false)
    expect(await screen.findByRole('status')).toHaveTextContent(/PDF gerado/)
  })
})
