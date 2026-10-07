import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { useWizardStore } from '@/store/wizardStore'
import Stage1Research from '@/components/Stage1Research'
import Stage2Multimodal from '@/components/Stage2Multimodal'
import Stage3Reflection from '@/components/reflection/Stage3Reflection'
import AuthControls from '@/components/AuthControls'
import {
  approvedQuestion, article, evidenceRecord, jsonResponse, knowledgeStructure, mockFetch, msg, renderStep, resetStore, searchDesign,
} from '../helpers'

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

const state = () => useWizardStore.getState()
// Each format words its button for what it produces (poster/podcast: AI; video: script; game; slides).
const GENERATE_LABEL = /Gerar com IA|Generate with AI|Gerar guião do vídeo|Gerar jogo|Gerar slides/
afterEach(() => vi.restoreAllMocks())

describe('Stage 1 - stepper and navigation', () => {
  it('shows progress, the recommended next step and navigates to it', () => {
    resetStore({ stage: 1, workflowStep: 'step1_select', step0OptionalCompleted: true, rqCandidates: ['a'], candidateResearchQuestions: [{}], selectedRQs: ['a', 'b'] })
    renderStep(<Stage1Research />)
    expect(screen.getByText(/Passo 1 de 9 · 1 concluído/)).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '11')
    const recommended = screen.getByRole('button', { name: /Próximo passo recomendado/ })
    fireEvent.click(recommended)
    expect(state().workflowStep).toBe('step1a_compare') // compare first; 1B stays locked until a comparison exists
  })

  it('locks steps whose prerequisites are missing and explains why', () => {
    resetStore({ stage: 1, workflowStep: 'step1_select', step0OptionalCompleted: true })
    renderStep(<Stage1Research />)
    const locked = screen.getByRole('button', { name: new RegExp(msg('common.lockedStep2')) })
    expect(locked).toBeDisabled()
    fireEvent.click(locked)
    expect(state().workflowStep).toBe('step1_select')
  })

  it('marks the active step and offers previous/next within the unlocked steps', () => {
    resetStore({ stage: 1, workflowStep: 'step1_select', step0OptionalCompleted: true })
    renderStep(<Stage1Research />)
    expect(document.querySelectorAll('[aria-current="step"]')).toHaveLength(1)
    const next = screen.getAllByRole('button').find((b) => b.textContent?.startsWith('Final RQ Synthesis') || b.textContent?.includes('1A'))
    expect(next).toBeTruthy()
  })

  it('offers the way to Stage 2 at the end of the path once the explanation exists', () => {
    resetStore({
      stage: 1, workflowStep: 'step9_explanation', finalResearchQuestion: approvedQuestion, knowledgeStructure, evidenceRecords: [evidenceRecord()],
      explanationDraft: { outline: ['x'], argumentCore: 'c', evidenceReferences: [], bibliography: ['b'] },
    })
    renderStep(<Stage1Research />)
    fireEvent.click(screen.getByRole('button', { name: new RegExp(msg('steps.step1B.continueButton')) }))
    expect(state().stage).toBe(2)
  })

  it('keeps Previous/Next in the always-visible bar while earlier steps are open', () => {
    resetStore({
      stage: 1, workflowStep: 'step1_select', step0OptionalCompleted: true, selectedRQs: ['a', 'b'],
      explanationDraft: { outline: ['x'], argumentCore: 'c', evidenceReferences: [], bibliography: ['b'] },
    })
    renderStep(<Stage1Research />)
    expect(screen.queryByRole('button', { name: new RegExp(`^${msg('steps.step1B.continueButton')}`) })).not.toBeInTheDocument()
    const bar = document.querySelector('.sticky.bottom-0') as HTMLElement
    expect(bar).toBeTruthy()
    fireEvent.click(within(bar).getByRole('button', { name: /→$/ }))
    expect(state().workflowStep).toBe('step1a_compare')
    fireEvent.click(within(bar).getByRole('button', { name: /^←/ }))
    expect(state().workflowStep).toBe('step1_select')
  })

  it('renders nothing outside stage 1', () => {
    resetStore({ stage: 2 })
    const { container } = renderStep(<Stage1Research />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('Stage 2 - outputs hub', () => {
  const unlocked = { stage: 2, finalResearchQuestion: approvedQuestion, knowledgeStructure, evidenceRecords: [evidenceRecord()] }

  it('locks every format until Stage 1 produced evidence and a structure', () => {
    resetStore({ stage: 2 })
    renderStep(<Stage2Multimodal />)
    expect(screen.getByText(/Completa pelo menos o Stage 1|Complete Stage 1/)).toBeInTheDocument()
    screen.getAllByRole('button', { name: /Step 10[A-E]/ }).forEach((card) => expect(card).toBeDisabled())
  })

  it('shares one audience across the hub and the format screens', () => {
    resetStore(unlocked)
    renderStep(<Stage2Multimodal />)
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'academic' } })
    expect(state().audience).toBe('academic')
    fireEvent.click(screen.getByRole('button', { name: /Step 10B/ }))
    expect((screen.getAllByRole('combobox')[0] as HTMLSelectElement).value).toBe('academic')
    fireEvent.click(screen.getByText(/Voltar ao hub|Back to hub/))
    expect(screen.getAllByRole('button', { name: /Step 10[A-E]/ })).toHaveLength(5)
  })

  it('every format opens with generation available only after Step 9 exists', () => {
    resetStore(unlocked)
    const view = renderStep(<Stage2Multimodal />)
    for (const step of ['10A', '10B', '10C', '10D', '10E']) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`Step ${step}`) }))
      expect(screen.getByRole('button', { name: GENERATE_LABEL })).toBeDisabled()
      expect(screen.getByRole('button', { name: /Exportar para NotebookLM|Exportar Apresentação/ })).toBeInTheDocument()
      fireEvent.click(screen.getByText(/Voltar ao hub|Back to hub/))
    }
    view.unmount()

    resetStore({ ...unlocked, explanationDraft: { outline: ['x'], argumentCore: 'c', evidenceReferences: [], bibliography: ['b'] } })
    renderStep(<Stage2Multimodal />)
    fireEvent.click(screen.getByRole('button', { name: /Step 10A/ }))
    expect(screen.getByRole('button', { name: GENERATE_LABEL })).toBeEnabled()
  })

  it('shows a stored draft with its fidelity score', () => {
    resetStore({
      ...unlocked,
      multimodalOutputs: { poster: { title: 'My poster', layoutSuggestion: '3 columns', fidelityScore: 80, sections: [{ label: 'Intro', content: 'Hello', anchors: [] }] } },
    })
    renderStep(<Stage2Multimodal />)
    fireEvent.click(screen.getByRole('button', { name: /Step 10A/ }))
    expect(screen.getByText('My poster')).toBeInTheDocument()
    expect(screen.getByText(/Fidelidade: 80%|Fidelity: 80%/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Gerar novamente|Regenerate/ })).toBeInTheDocument()
  })
})

describe('Stage 3 - reflection hub', () => {
  it('lists the four reflection activities and opens each one', () => {
    resetStore({ stage: 3, finalResearchQuestion: approvedQuestion })
    renderStep(<Stage3Reflection />)
    for (const label of [/Revisão por Pares|Peer Review/, /Auto-Avaliação|Self-Assessment/, /Diário de Reflexão|Reflection Journal/, /Planeador de Extensão|Inquiry Extension Planner/]) {
      fireEvent.click(screen.getAllByText(label)[0])
      fireEvent.click(screen.getByRole('button', { name: /^← (Voltar|Back)/ })) // every activity has a way back to the hub
    }
  })

  it('goes back to Stage 2', () => {
    resetStore({ stage: 3 })
    renderStep(<Stage3Reflection />)
    fireEvent.click(screen.getByRole('button', { name: /Stage 2/ }))
    expect(state().stage).toBe(2)
  })
})

describe('Login (AuthControls)', () => {
  beforeEach(() => window.history.replaceState(null, '', '/'))

  it('says Google login is unavailable when the provider is not configured', async () => {
    mockFetch({ other: () => jsonResponse({}) })
    renderStep(<AuthControls />)
    const notice = await screen.findByTitle(/AUTH_GOOGLE_ID/)
    expect(notice).toHaveTextContent(/indisponivel|unavailable/i) // short label; the env var names are in the tooltip
    expect(screen.queryByRole('button', { name: /Entrar com Google|Sign in with Google/ })).not.toBeInTheDocument()
  })

  it('offers the Google button when the provider exists and starts the sign-in', async () => {
    const { signIn } = await import('next-auth/react')
    mockFetch({ other: () => jsonResponse({ google: { id: 'google' } }) })
    renderStep(<AuthControls />)
    const button = await screen.findByRole('button', { name: /Entrar com Google|Sign in with Google/ })
    await waitFor(() => expect(button).toBeEnabled())
    fireEvent.click(button)
    expect(signIn).toHaveBeenCalledWith('google')
  })

  it.each([
    ['Configuration', /configuracao do servidor|server configuration/i],
    ['AccessDenied', /Test users|utilizador de teste|test user/i],
    ['OAuthCallback', /redirect URI/i],
    ['Callback', /base de dados|database/i],
  ])('explains the %s error from the redirect', async (code, expected) => {
    window.history.replaceState(null, '', `/?error=${code}`)
    mockFetch({ other: () => jsonResponse({ google: { id: 'google' } }) })
    renderStep(<AuthControls />)
    expect(await screen.findByRole('alert')).toHaveTextContent(expected)
    expect(window.location.search).toBe('') // the error param is cleaned from the URL
  })

  it('falls back to a generic message for unknown error codes', async () => {
    window.history.replaceState(null, '', '/?error=Whatever')
    mockFetch({ other: () => jsonResponse({ google: { id: 'google' } }) })
    renderStep(<AuthControls />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Whatever')
  })
})
