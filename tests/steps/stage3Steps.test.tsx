import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import StepSelfAssessment from '@/components/reflection/StepSelfAssessment'
import StepReflection from '@/components/reflection/StepReflection'
import StepExtension from '@/components/reflection/StepExtension'
import { useWizardStore } from '@/store/wizardStore'
import { aiFail, aiOk, approvedQuestion, evidenceRecord, mockFetch, renderStep, resetStore } from '../helpers'

const state = () => useWizardStore.getState()
const rateAll = (score: number) => {
  for (let i = 1; i <= 8; i++) {
    fireEvent.click(screen.getAllByRole('radiogroup')[i - 1].querySelectorAll('button')[score - 1])
  }
}

beforeEach(() => resetStore({ stage: 3, finalResearchQuestion: approvedQuestion, evidenceRecords: [evidenceRecord()] }))
afterEach(() => vi.restoreAllMocks())

describe('Self-assessment', () => {
  it('saves the learner ratings without any AI call', () => {
    const net = mockFetch({})
    renderStep(<StepSelfAssessment onBack={() => {}} />)
    fireEvent.click(screen.getAllByRole('radiogroup')[0].querySelectorAll('button')[3])
    fireEvent.click(screen.getByRole('button', { name: /Guardar auto-avaliação|Save self-assessment/ }))
    expect(state().selfAssessment?.rubricDimensions[0]).toMatchObject({ score: 4 })
    expect(net.calls).toHaveLength(0)
  })

  it('only offers AI feedback once all 8 dimensions are rated, and attaches it', async () => {
    const net = mockFetch({ ai: () => aiOk({ dimensions: [{ id: 'R1', comment: 'Bem apoiado', suggestedScore: 3, improvementHint: 'Afine' }], overallReflection: 'Bom trabalho' }) })
    renderStep(<StepSelfAssessment onBack={() => {}} />)
    const ask = screen.getByRole('button', { name: /segunda opinião|second opinion/ })
    expect(ask).toBeDisabled()
    rateAll(4)
    expect(ask).toBeEnabled()
    fireEvent.click(ask)
    await waitFor(() => expect(screen.getByText(/Bem apoiado/)).toBeInTheDocument())
    expect(net.ai()[0].body.learnerRatings).toContain('R1')
    expect(state().selfAssessment?.rubricDimensions[0]).toMatchObject({ score: 4, aiSuggestedScore: 3 })
  })

  it('keeps the ratings and shows a friendly message when the AI times out', async () => {
    mockFetch({ ai: () => aiFail('Request timeout after 25000ms', 504) })
    renderStep(<StepSelfAssessment onBack={() => {}} />)
    rateAll(3)
    fireEvent.click(screen.getByRole('button', { name: /segunda opinião|second opinion/ }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/demorou demasiado|too long/))
    expect(state().selfAssessment?.rubricDimensions).toHaveLength(8)
  }, 15000)
})

describe('Reflective journal', () => {
  it('works with default questions and no AI', () => {
    const net = mockFetch({})
    renderStep(<StepReflection onBack={() => {}} />)
    const boxes = screen.getAllByRole('textbox')
    expect(boxes).toHaveLength(3)
    fireEvent.change(boxes[0], { target: { value: 'Aprendi muito' } })
    fireEvent.click(screen.getAllByRole('button', { name: /Guardar resposta|Save answer/ })[0])
    expect(state().reflectionJournal[0].response).toBe('Aprendi muito')
    expect(net.calls).toHaveLength(0)
  })

  it('swaps in tailored questions and survives AI failure', async () => {
    mockFetch({ ai: () => aiOk({ prompts: [{ id: 'x', prompt: 'Sobre corais?' }] }) })
    renderStep(<StepReflection onBack={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Adaptar perguntas|Tailor questions/ }))
    await waitFor(() => expect(screen.getByText('Sobre corais?')).toBeInTheDocument())
  })

  it('keeps the default questions when the AI fails', async () => {
    mockFetch({ ai: () => aiFail('Request timeout after 25000ms', 504) })
    renderStep(<StepReflection onBack={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Adaptar perguntas|Tailor questions/ }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getAllByRole('textbox')).toHaveLength(3)
  }, 15000)
})

describe('Extension planner', () => {
  it('shows local gaps immediately and stores AI paths', async () => {
    resetStore({ stage: 3, finalResearchQuestion: approvedQuestion, evidenceRecords: [evidenceRecord({ limitations: ['Amostra pequena'] })] })
    const net = mockFetch({ ai: () => aiOk({ extension_paths: [{ name: 'Caminho A', summary: 'Estudar X', complexity: 'low' }] }) })
    renderStep(<StepExtension onBack={() => {}} />)
    expect(screen.getByText('Amostra pequena')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Propor caminhos|Propose extension/ }))
    await waitFor(() => expect(screen.getByText('Caminho A')).toBeInTheDocument())
    expect(state().extensionPlan).toHaveLength(1)
    expect(net.ai()[0].body.open_issues).toContain('Amostra pequena')
  })

  it('shows a friendly error instead of raw transport text', async () => {
    mockFetch({ ai: () => aiFail('Request timeout after 25000ms', 504) })
    renderStep(<StepExtension onBack={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Propor caminhos|Propose extension/ }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/demorou demasiado|too long/))
  }, 15000)
})
