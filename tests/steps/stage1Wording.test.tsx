import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import TopBar from '@/components/shell/TopBar'
import Step4Structure from '@/components/Step4Structure'
import Step8Glossary from '@/components/Step8Glossary'
import ExplorationActions from '@/components/explanation/ExplorationActions'
import { I18nProvider } from '@/components/I18nProvider'
import { useWizardStore } from '@/store/wizardStore'
import { SUPPORTED_LOCALES, getMessage } from '@/lib/i18n'
import { localizeBadge } from '@/lib/iblFramework'
import { aiOk, approvedQuestion, evidenceRecord, knowledgeStructure, mockFetch, renderStep, resetStore } from '../helpers'

const state = () => useWizardStore.getState()
afterEach(() => vi.unstubAllGlobals())

vi.mock('@/components/AuthControls', () => ({ default: () => null }))

const actions = Object.fromEntries(
  ['onOpenProgress', 'onOpenProfile', 'onOpenManual', 'onDownloadJson', 'onDownloadPdf', 'onShareEmail', 'onShareGoogleDoc', 'onReset', 'onDelete'].map((k) => [k, () => {}])
) as never

describe('Stage / Step wording', () => {
  it('top bar says "Estágio" in Portuguese (stages) and keeps "Etapa" for steps', () => {
    resetStore({ stage: 1 })
    renderStep(<TopBar actions={actions} />)
    expect(screen.getByRole('navigation', { name: 'Estágios' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Estágio 2' })).toBeInTheDocument()
  })

  it('Portuguese strings never use the English words Stage/Step or "Passo"', () => {
    const offenders: string[] = []
    const walk = (value: unknown, path: string) => {
      if (typeof value === 'string') {
        // "Step by step"-style English must not appear in pt-PT copy
        if (/\b(Stage|Stages|Step|Steps|Passo|Passos)\b/.test(value)) offenders.push(`${path}: ${value}`)
      } else if (value && typeof value === 'object') {
        Object.entries(value).forEach(([key, child]) => walk(child, `${path}.${key}`))
      }
    }
    // getMessage resolves one key at a time, so probe the keys the UI actually shows
    const keys = [
      'stage1.title', 'common.continueToStage2', 'common.lockedStep1B', 'common.step0Archived', 'steps.step1B.continueButton',
      'steps.step2.continueButton', 'steps.step3.continueButton', 'steps.step3.title', 'steps.step4.title', 'steps.step4.locked',
      'steps.step5_source_selection.title', 'steps.step5_source_selection.noSources', 'steps.step8.noStructure', 'steps.step5.locked',
      'guide.stage1Title', 'guide.stage2Title', 'guide.stage3Title', 'guide.artifactsStage1', 'guide.artifactsStage3', 'api.searchDesignRequired',
    ]
    keys.forEach((key) => walk(getMessage('pt-PT', key), key))
    expect(offenders).toEqual([])
    expect(SUPPORTED_LOCALES).toContain('pt-PT')
  })

  it('the "continue to Stage 2" button is a stage jump in both languages', () => {
    expect(getMessage('pt-PT', 'common.continueToStage2')).toBe('Continuar para o Estágio 2')
    expect(getMessage('en', 'common.continueToStage2')).toBe('Continue to Stage 2')
  })

  it('localizes step badges in pt-PT only', () => {
    expect(localizeBadge('Steps 6-7', true)).toBe('Etapas 6-7')
    expect(localizeBadge('Step 1B', true)).toBe('Etapa 1B')
    expect(localizeBadge('Stage 3', true)).toBe('Estágio 3')
    expect(localizeBadge('Step 1B', false)).toBe('Step 1B')
  })
})

describe('Glossary progress (Step 8)', () => {
  const seed = () =>
    resetStore({ stage: 1, workflowStep: 'step4_knowledge_structure', finalResearchQuestion: approvedQuestion, evidenceRecords: [evidenceRecord()], knowledgeStructure })

  it('does not mark the glossary as seen just because the structure exists', () => {
    seed()
    renderStep(<Step4Structure />)
    expect(state().glossarySeen).toBe(false)
  })

  it('marks it as seen when the end of the glossary scrolls into view on Steps 6-7', () => {
    let trigger: ((entries: Array<{ isIntersecting: boolean }>) => void) | undefined
    vi.stubGlobal('IntersectionObserver', class {
      constructor(cb: typeof trigger) { trigger = cb }
      observe() {}
      disconnect() {}
    })
    seed()
    renderStep(<Step4Structure />)
    expect(screen.getByText(/Etapa 8 · Glossário/)).toBeInTheDocument()
    act(() => trigger?.([{ isIntersecting: true }]))
    expect(state().glossarySeen).toBe(true)
  })

  it('opening Step 8 itself counts as seeing it', () => {
    seed()
    renderStep(<Step8Glossary />)
    expect(state().glossarySeen).toBe(true)
  })
})

describe('Step 9 exploration pop-ups', () => {
  const draft = { outline: ['Intro'], argumentCore: 'A tese central é X.', evidenceReferences: [], bibliography: ['b'], openIssues: ['Falta estudo de longo prazo'] }
  const seed = () =>
    resetStore({
      stage: 1, finalResearchQuestion: approvedQuestion, knowledgeStructure, explanationDraft: draft,
      evidenceRecords: [evidenceRecord({ citation: 'Silva, A. (2020). Corais.', id: 'e1' })],
    })

  it('renders nothing before the explanation exists', () => {
    resetStore({ stage: 1 })
    const { container } = render(<I18nProvider><ExplorationActions /></I18nProvider>)
    expect(container).toBeEmptyDOMElement()
  })

  it('simulates the abstract in Portuguese and English, with the pedagogical notice', async () => {
    seed()
    const net = mockFetch({
      ai: (body) => aiOk({ title: body.locale === 'en' ? 'Reef study' : 'Estudo dos recifes', abstract: body.locale === 'en' ? 'English abstract.' : 'Resumo em português.', keywords: ['a', 'b'], teachingNote: 'Verifique os números.' }),
    })
    renderStep(<ExplorationActions />)
    fireEvent.click(screen.getByRole('button', { name: /Simular abstract/ }))
    expect(screen.getByRole('note')).toHaveTextContent(/Simulação ilustrativa/)
    fireEvent.click(screen.getByRole('button', { name: /Gerar abstract simulado/ }))
    await waitFor(() => expect(screen.getByText('English abstract.')).toBeInTheDocument())
    expect(screen.getByText('Resumo em português.')).toBeInTheDocument()
    const calls = net.ai().map((c) => c.body)
    expect(calls.map((c) => c.locale).sort()).toEqual(['en', 'pt-PT'])
    expect(calls.every((c) => c.promptId === 'abstract_simulation' && c.explanation === 'A tese central é X.')).toBe(true)
  })

  it('shows the simulated reference section from the real sources', () => {
    seed()
    renderStep(<ExplorationActions />)
    fireEvent.click(screen.getByRole('button', { name: /Simular secção de referências/ }))
    expect(screen.getByRole('note')).toHaveTextContent(/pedagógicos/)
    expect(screen.getByText(/Silva, A\. \(2020\)\. Corais\./)).toBeInTheDocument()
  })

  it('open issues point to Stage 3', () => {
    seed()
    renderStep(<ExplorationActions />)
    fireEvent.click(screen.getByRole('button', { name: /Questões em aberto/ }))
    expect(screen.getByText('Falta estudo de longo prazo')).toBeInTheDocument()
    expect(screen.getByText(/No Estágio 3 vamos transformar/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Ir para o Estágio 3/ }))
    expect(state().stage).toBe(3)
  })

  it('thesis questions can be kept in the reflective journal', () => {
    seed()
    renderStep(<ExplorationActions />)
    fireEvent.click(screen.getByRole('button', { name: /Pôr a tese à prova/ }))
    expect(screen.getByText('A tese central é X.')).toBeInTheDocument()
    const boxes = screen.getAllByRole('textbox')
    expect(boxes).toHaveLength(3)
    fireEvent.change(boxes[0], { target: { value: 'Um estudo de longo prazo.' } })
    fireEvent.click(screen.getAllByRole('button', { name: /Guardar no diário reflexivo/ })[0])
    expect(state().reflectionJournal[0].response).toBe('Um estudo de longo prazo.')
  })
})
