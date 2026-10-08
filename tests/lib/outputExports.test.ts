import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { buildPptxBlob, PPTX_MIME } from '@/lib/pptxExport'
import { CREATION_TOOLS, gameScriptText, podcastScriptText, slidesCanvasPrompt, videoScriptText, videoToolPrompt } from '@/lib/outputExports'
import { readBlobArrayBuffer } from '../helpers'
import type { GameScenario, OralPresentation, PodcastScript, VideostoryBoard } from '@/types/research-workflow'

const anchor = (key: string) => ({ claimText: 'c', evidenceRecordId: 'e1', citationKey: key, validated: false })

const presentation: OralPresentation = {
  title: 'Recifes e clima', totalDurationMinutes: 8, fidelityScore: 90,
  slides: [
    { slideNumber: 1, heading: 'Introdução', bulletPoints: ['Os recifes aquecem', 'Perdem cor'], speakerNotes: 'Começar pela imagem do branqueamento', anchors: [anchor('Silva, 2020')] },
    { slideNumber: 2, heading: 'Resultados', bulletPoints: ['CO2 sobe', 'Corais branqueiam'], speakerNotes: 'Explicar a relação causal', anchors: [anchor('Silva, 2020'), anchor('Costa, 2021')] },
    { slideNumber: 3, heading: 'Conclusão', bulletPoints: ['Agir já'], speakerNotes: 'Terminar com a pergunta', anchors: [] },
  ],
}

describe('PowerPoint export (Step 10E)', () => {
  it('builds a real .pptx with cover, one slide per item and a references slide', async () => {
    const blob = await buildPptxBlob(presentation, { researchQuestion: 'Como o CO2 afeta os recifes?', audienceLabel: 'Escola (12-18 anos)', pt: true })
    expect(blob.type).toBe(PPTX_MIME)
    const zip = await JSZip.loadAsync(await readBlobArrayBuffer(blob))
    const slideFiles = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    expect(slideFiles).toHaveLength(presentation.slides.length + 2) // cover + 3 + references

    const xml = async (name: string) => zip.file(name)!.async('string')
    const cover = await xml('ppt/slides/slide1.xml')
    expect(cover).toContain('Recifes e clima')
    expect(cover).toContain('Como o CO2 afeta os recifes?')
    const slide3 = await xml('ppt/slides/slide3.xml')
    expect(slide3).toContain('Resultados')
    expect(slide3).toContain('Corais branqueiam')
    expect(slide3).toContain('Silva, 2020; Costa, 2021') // sources in the footer
    const last = await xml(`ppt/slides/slide${slideFiles.length}.xml`)
    expect(last).toContain('Referências')
    expect(last).toContain('Costa, 2021')
  })

  it('puts the speaker notes in the notes pane of the right slides', async () => {
    const blob = await buildPptxBlob(presentation, { researchQuestion: 'RQ', audienceLabel: 'x', pt: false })
    const zip = await JSZip.loadAsync(await readBlobArrayBuffer(blob))
    const notes = await Promise.all(
      Object.keys(zip.files).filter((name) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(name)).map((name) => zip.file(name)!.async('string'))
    )
    const all = notes.join('\n')
    for (const note of ['Começar pela imagem do branqueamento', 'Explicar a relação causal', 'Terminar com a pergunta']) {
      expect(all).toContain(note)
    }
  })

  it('handles a slide without bullets or sources', async () => {
    const bare: OralPresentation = { ...presentation, slides: [{ slideNumber: 1, heading: 'Só título', bulletPoints: [], speakerNotes: '', anchors: [] }] }
    const zip = await JSZip.loadAsync(await readBlobArrayBuffer(await buildPptxBlob(bare, { researchQuestion: 'RQ', audienceLabel: 'x', pt: true })))
    expect(await zip.file('ppt/slides/slide2.xml')!.async('string')).toContain('Só título')
    expect(await zip.file('ppt/slides/slide3.xml')!.async('string')).toContain('Sem fontes associadas.')
  })
})

describe('scripts and prompts', () => {
  const board: VideostoryBoard = {
    title: 'Vídeo', fidelityScore: 80,
    scenes: [{ sceneNumber: 1, description: 'Corais a branquear', visualNote: 'Gráfico de temperatura', anchors: [anchor('Silva, 2020')] }, { sceneNumber: 2, description: 'Conclusão', visualNote: 'Texto no ecrã', anchors: [] }],
  }

  it('video script lists scenes with visuals and the sources to cite', () => {
    const text = videoScriptText(board, true)
    expect(text).toContain('# Vídeo')
    expect(text).toContain('## Cena 1')
    expect(text).toContain('Imagem/visual: Gráfico de temperatura')
    expect(text).toContain('Fontes a citar: Silva, 2020')
    expect(text).not.toMatch(/Cena 2[\s\S]*Fontes a citar/)
  })

  it('tool prompts carry the content and forbid inventing facts', () => {
    const video = videoToolPrompt(board, { researchQuestion: 'RQ?', audienceLabel: 'Geral', pt: true })
    expect(video).toContain('Corais a branquear')
    expect(video).toContain('RQ?')
    const slides = slidesCanvasPrompt(presentation, { researchQuestion: 'RQ?', audienceLabel: 'Escola', pt: true })
    expect(slides).toContain('APENAS o conteúdo abaixo')
    expect(slides).toContain('Slide 2: Resultados')
    expect(slides).toContain('Notas do orador: Explicar a relação causal')
    expect(slides).toContain('5 slides') // 3 + cover + references
    expect(slidesCanvasPrompt(presentation, { researchQuestion: 'RQ?', audienceLabel: 'School', pt: false })).toContain('ONLY the content below')
  })

  it('podcast and game scripts are readable plain text', () => {
    const podcast: PodcastScript = { title: 'Ep', durationEstimateMinutes: 10, fidelityScore: 70, segments: [{ timestamp: '00:00', speaker: 'Host', text: 'Olá', anchors: [anchor('Silva, 2020')] }] }
    expect(podcastScriptText(podcast, true)).toContain('[00:00] Host: Olá')
    expect(podcastScriptText(podcast, true)).toContain('fontes: Silva, 2020')
    const game: GameScenario = { title: 'Jogo', objective: 'Aprender', fidelityScore: 60, branches: [{ id: 'a', prompt: 'Vês corais brancos', choices: [{ id: 'a', text: 'Medir', consequence: 'Dados' }] }] }
    expect(gameScriptText(game, true)).toContain('- Medir -> Dados')
  })

  it('suggests where to create each format, with real links', () => {
    for (const kind of ['video', 'oral', 'podcast'] as const) {
      expect(CREATION_TOOLS[kind].length).toBeGreaterThanOrEqual(3)
      for (const tool of CREATION_TOOLS[kind]) {
        expect(tool.url).toMatch(/^https:\/\//)
        expect(tool.why.pt.length).toBeGreaterThan(10)
        expect(tool.why.en.length).toBeGreaterThan(10)
      }
    }
    expect(CREATION_TOOLS.oral.map((tool) => tool.name).join(' ')).toMatch(/Gemini/)
  })
})
