import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { I18nProvider } from '@/components/I18nProvider'
import GamePlayer from '@/components/multimodal/GamePlayer'
import Stage2Multimodal from '@/components/Stage2Multimodal'
import { useWizardStore } from '@/store/wizardStore'
import { approvedQuestion, evidenceRecord, knowledgeStructure, renderStep, resetStore } from '../helpers'
import type { GameScenario, OralPresentation, VideostoryBoard } from '@/types/research-workflow'

const anchor = { claimText: 'c', evidenceRecordId: 'e1', citationKey: 'Silva, 2020', validated: false }

const game: GameScenario = {
  title: 'Salvar o recife', objective: 'Perceber o impacto do aquecimento', fidelityScore: 80,
  branches: [
    { id: 'start', prompt: 'Vês corais brancos.', choices: [{ id: 'a', text: 'Medir a temperatura', consequence: 'Dados úteis para a equipa.' }, { id: 'b', text: 'Ignorar', consequence: 'Perdes a oportunidade.' }] },
    { id: 'empty', prompt: 'Sem escolhas (deve ser ignorada)', choices: [] },
    { id: 'end', prompt: 'A equipa discute.', choices: [{ id: 'a', text: 'Propor reduzir CO2', consequence: 'A evidência apoia a medida.' }] },
  ],
}

describe('GamePlayer (Step 10D)', () => {
  const play = () => render(<I18nProvider><GamePlayer scenario={game} /></I18nProvider>)

  it('plays the scenario decision by decision and ends with a recap of the path', () => {
    play()
    expect(screen.getByText('Perceber o impacto do aquecimento')).toBeInTheDocument()
    expect(screen.getByText(/2 decisões/)).toBeInTheDocument() // the branch without choices is skipped

    fireEvent.click(screen.getByRole('button', { name: 'Começar o jogo' }))
    expect(screen.getByText('Decisão 1 de 2')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Medir a temperatura' }))
    expect(screen.getByText('Dados úteis para a equipa.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ignorar' })).not.toBeInTheDocument() // choices are replaced by the consequence

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText('Decisão 2 de 2')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Propor reduzir CO2' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ver o resultado' }))

    expect(screen.getByText(/Fim do jogo/)).toBeInTheDocument()
    expect(screen.getByText(/Escolheu: Medir a temperatura/)).toBeInTheDocument()
    expect(screen.getByText('A evidência apoia a medida.')).toBeInTheDocument()
  })

  it('can be replayed from the start', () => {
    play()
    fireEvent.click(screen.getByRole('button', { name: 'Começar o jogo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ignorar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Propor reduzir CO2' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ver o resultado' }))
    fireEvent.click(screen.getByRole('button', { name: 'Jogar novamente' }))
    expect(screen.getByText('Decisão 1 de 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ignorar' })).toBeInTheDocument()
  })

  it('renders nothing when no branch has choices', () => {
    const { container } = render(<I18nProvider><GamePlayer scenario={{ ...game, branches: [{ id: 'x', prompt: 'p', choices: [] }] }} /></I18nProvider>)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('Stage 2 output pages: script / where to create / PowerPoint', () => {
  const base = { stage: 2, finalResearchQuestion: approvedQuestion, knowledgeStructure, evidenceRecords: [evidenceRecord()], audience: 'school' }
  let writeText: ReturnType<typeof vi.fn>
  let click: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()
    click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  const open = (step: string) => fireEvent.click(screen.getByRole('button', { name: new RegExp(`Step ${step}`) }))

  it('video: says it creates the script (not the video), then offers the script and where to make the video', async () => {
    const board: VideostoryBoard = { title: 'Vídeo do recife', fidelityScore: 90, scenes: [{ sceneNumber: 1, description: 'Corais a branquear', visualNote: 'Gráfico', anchors: [anchor] }] }
    resetStore({ ...base, multimodalOutputs: { videocast: board } })
    renderStep(<Stage2Multimodal />)
    open('10C')

    expect(screen.getByText(/não o vídeo final/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gerar guião novamente' })).toBeInTheDocument()
    const guide = screen.getByRole('heading', { name: 'Do guião ao vídeo' }).closest('section')!
    for (const tool of ['NotebookLM', 'Canva', 'CapCut', 'Google Vids']) expect(within(guide).getByRole('link', { name: tool })).toHaveAttribute('target', '_blank')

    fireEvent.click(within(guide).getByRole('button', { name: 'Copiar guião' }))
    await waitFor(() => expect(writeText).toHaveBeenCalled())
    expect(writeText.mock.calls[0][0]).toContain('## Cena 1')
    expect(writeText.mock.calls[0][0]).toContain('Fontes a citar: Silva, 2020')
    fireEvent.click(within(guide).getByRole('button', { name: /Copiar prompt para ferramenta de vídeo/ }))
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2))
    expect(writeText.mock.calls[1][0]).toContain('Escola (12-18 anos)') // the project audience travels with the prompt
    fireEvent.click(within(guide).getByRole('button', { name: /Descarregar guião/ }))
    await waitFor(() => expect(click).toHaveBeenCalled())
  })

  it('video: before anything is generated there is no guide and the button says script', () => {
    resetStore({ ...base, explanationDraft: { outline: ['x'], argumentCore: 'c', evidenceReferences: [], bibliography: ['b'] } })
    renderStep(<Stage2Multimodal />)
    open('10C')
    expect(screen.getByRole('button', { name: 'Gerar guião do vídeo' })).toBeEnabled()
    expect(screen.queryByRole('heading', { name: 'Do guião ao vídeo' })).not.toBeInTheDocument()
  })

  it('game: the generated scenario is playable on the page', () => {
    resetStore({ ...base, multimodalOutputs: { game } })
    renderStep(<Stage2Multimodal />)
    open('10D')
    expect(screen.getByText(/Ver a estrutura do jogo/).closest('details')).not.toHaveAttribute('open') // the static structure is a secondary, collapsed view
    fireEvent.click(screen.getByRole('button', { name: 'Começar o jogo' }))
    expect(screen.getAllByText('Vês corais brancos.').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: 'Medir a temperatura' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gerar outro jogo' })).toBeInTheDocument()
  })

  it('oral: downloads a PowerPoint and copies a Gemini Canvas prompt carrying the slides', async () => {
    const oral: OralPresentation = {
      title: 'Recifes', totalDurationMinutes: 8, fidelityScore: 90,
      slides: [{ slideNumber: 1, heading: 'Introdução', bulletPoints: ['Os recifes aquecem'], speakerNotes: 'Começar pela imagem', anchors: [anchor] }],
    }
    resetStore({ ...base, multimodalOutputs: { oral } })
    renderStep(<Stage2Multimodal />)
    open('10E')
    expect(screen.getByRole('button', { name: 'Gerar slides novamente' })).toBeInTheDocument()
    const guide = screen.getByRole('heading', { name: 'Dos slides à apresentação' }).closest('section')!
    expect(within(guide).getByRole('link', { name: /Gemini/ })).toBeInTheDocument()

    fireEvent.click(within(guide).getByRole('button', { name: /Descarregar PowerPoint/ }))
    await waitFor(() => expect(click).toHaveBeenCalled(), { timeout: 5000 })
    const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation')
    expect(blob.size).toBeGreaterThan(5000)
    expect(await screen.findByText(/Concluído: Descarregar PowerPoint/)).toBeInTheDocument()

    fireEvent.click(within(guide).getByRole('button', { name: /Copiar prompt para o Gemini/ }))
    await waitFor(() => expect(writeText).toHaveBeenCalled())
    expect(writeText.mock.calls[0][0]).toContain('APENAS o conteúdo abaixo')
    expect(writeText.mock.calls[0][0]).toContain('Slide 1: Introdução')
  })

  it('podcast: the script can be copied and there are free tools to record it', async () => {
    resetStore({
      ...base,
      multimodalOutputs: { podcast: { title: 'Ep', durationEstimateMinutes: 10, fidelityScore: 70, segments: [{ timestamp: '00:00', speaker: 'Host', text: 'Bem-vindos', anchors: [anchor] }] } },
    })
    renderStep(<Stage2Multimodal />)
    open('10B')
    const guide = screen.getByRole('heading', { name: 'Do guião ao episódio' }).closest('section')!
    fireEvent.click(within(guide).getByRole('button', { name: 'Copiar guião' }))
    await waitFor(() => expect(writeText).toHaveBeenCalled())
    expect(writeText.mock.calls[0][0]).toContain('[00:00] Host: Bem-vindos')
    expect(within(guide).getByRole('link', { name: 'Audacity' })).toBeInTheDocument()
  })

  it('reports a failed copy instead of failing silently', async () => {
    writeText.mockRejectedValue(new Error('blocked'))
    resetStore({ ...base, multimodalOutputs: { videocast: { title: 'V', fidelityScore: 1, scenes: [{ sceneNumber: 1, description: 'd', visualNote: 'v', anchors: [] }] } } })
    renderStep(<Stage2Multimodal />)
    open('10C')
    fireEvent.click(screen.getByRole('button', { name: 'Copiar guião' }))
    expect(await screen.findByText(/Não foi possível concluir a ação/)).toBeInTheDocument()
  })
})
