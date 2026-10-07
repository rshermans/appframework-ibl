import type { GameScenario, OralPresentation, PodcastScript, VideostoryBoard } from '@/types/research-workflow'

const citationList = (anchors: Array<{ citationKey: string }> | undefined) =>
  Array.from(new Set((anchors ?? []).map((anchor) => anchor.citationKey).filter(Boolean)))

/** Plain-text storyboard to paste into any video tool or hand to a colleague. */
export function videoScriptText(board: VideostoryBoard, pt: boolean): string {
  const lines = [`# ${board.title}`, '']
  for (const scene of board.scenes) {
    lines.push(`## ${pt ? 'Cena' : 'Scene'} ${scene.sceneNumber}`)
    lines.push(scene.description)
    lines.push(`${pt ? 'Imagem/visual' : 'Visual'}: ${scene.visualNote}`)
    const sources = citationList(scene.anchors)
    if (sources.length) lines.push(`${pt ? 'Fontes a citar' : 'Sources to cite'}: ${sources.join('; ')}`)
    lines.push('')
  }
  return lines.join('\n').trim() + '\n'
}

export function podcastScriptText(script: PodcastScript, pt: boolean): string {
  const lines = [`# ${script.title}`, `(${pt ? 'duração estimada' : 'estimated length'}: ~${script.durationEstimateMinutes} min)`, '']
  for (const segment of script.segments) {
    lines.push(`[${segment.timestamp}] ${segment.speaker}: ${segment.text}`)
    const sources = citationList(segment.anchors)
    if (sources.length) lines.push(`   (${pt ? 'fontes' : 'sources'}: ${sources.join('; ')})`)
    lines.push('')
  }
  return lines.join('\n').trim() + '\n'
}

export function gameScriptText(game: GameScenario, pt: boolean): string {
  const lines = [`# ${game.title}`, `${pt ? 'Objetivo' : 'Objective'}: ${game.objective}`, '']
  game.branches.forEach((branch, index) => {
    lines.push(`## ${pt ? 'Decisão' : 'Decision'} ${index + 1}`, branch.prompt)
    branch.choices.forEach((choice) => lines.push(`- ${choice.text} -> ${choice.consequence}`))
    lines.push('')
  })
  return lines.join('\n').trim() + '\n'
}

/** Prompt for Gemini (Canvas) or similar: build the deck from OUR content, do not invent. */
export function slidesCanvasPrompt(
  presentation: OralPresentation,
  context: { researchQuestion: string; audienceLabel: string; pt: boolean }
): string {
  const { researchQuestion, audienceLabel, pt } = context
  const slides = presentation.slides
    .map((slide) => {
      const sources = citationList(slide.anchors)
      return [
        `Slide ${slide.slideNumber}: ${slide.heading}`,
        ...slide.bulletPoints.map((point) => `- ${point}`),
        `${pt ? 'Notas do orador' : 'Speaker notes'}: ${slide.speakerNotes}`,
        sources.length ? `${pt ? 'Fontes' : 'Sources'}: ${sources.join('; ')}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n\n')

  return pt
    ? `Cria uma apresentação de slides (Canvas) com ${presentation.slides.length + 2} slides, em português de Portugal, para o público: ${audienceLabel}.\n\nTema/pergunta de investigação: ${researchQuestion}\nTítulo: ${presentation.title}\nDuração: ~${presentation.totalDurationMinutes} minutos.\n\nRegras:\n- Usa APENAS o conteúdo abaixo; não acrescentes factos nem dados novos.\n- Mantém as fontes indicadas em cada slide (rodapé) e acrescenta um slide final de Referências.\n- Design limpo, pouco texto por slide, bom contraste; sugere um gráfico ou imagem quando fizer sentido.\n- Põe as notas do orador nas notas de cada slide.\n\nConteúdo:\n\n${slides}\n`
    : `Create a slide deck (Canvas) with ${presentation.slides.length + 2} slides, in English, for this audience: ${audienceLabel}.\n\nResearch question/topic: ${researchQuestion}\nTitle: ${presentation.title}\nLength: ~${presentation.totalDurationMinutes} minutes.\n\nRules:\n- Use ONLY the content below; do not add new facts or data.\n- Keep the sources shown on each slide (footer) and add a final References slide.\n- Clean design, little text per slide, good contrast; suggest a chart or image where it helps.\n- Put the speaker notes in each slide's notes.\n\nContent:\n\n${slides}\n`
}

/** Prompt for AI video tools: scenes + visuals, no new claims. */
export function videoToolPrompt(board: VideostoryBoard, context: { researchQuestion: string; audienceLabel: string; pt: boolean }): string {
  const { researchQuestion, audienceLabel, pt } = context
  return (pt
    ? `Cria um vídeo curto (3-5 min) a partir deste storyboard, para o público: ${audienceLabel}. Tema: ${researchQuestion}. Usa só o conteúdo indicado e mostra as fontes no ecrã.\n\n`
    : `Create a short video (3-5 min) from this storyboard for this audience: ${audienceLabel}. Topic: ${researchQuestion}. Use only the content given and show the sources on screen.\n\n`) + videoScriptText(board, pt)
}

export interface CreationTool {
  name: string
  url: string
  why: { pt: string; en: string }
}

export const CREATION_TOOLS: Record<'video' | 'oral' | 'podcast', CreationTool[]> = {
  video: [
    { name: 'NotebookLM', url: 'https://notebooklm.google.com', why: { pt: 'Carregue o guião como fonte e veja que formatos de áudio/vídeo a sua conta permite gerar.', en: 'Upload the script as a source and see which audio/video formats your account can generate.' } },
    { name: 'Canva', url: 'https://www.canva.com/create/videos/', why: { pt: 'Editor de vídeo com modelos: uma cena do guião por página.', en: 'Template-based video editor: one script scene per page.' } },
    { name: 'CapCut', url: 'https://www.capcut.com', why: { pt: 'Edição por cenas, legendas automáticas e locução.', en: 'Scene editing, automatic captions and voice-over.' } },
    { name: 'Google Vids', url: 'https://workspace.google.com/products/vids/', why: { pt: 'Disponível em contas Google Workspace (escola/universidade).', en: 'Available with Google Workspace accounts (school/university).' } },
  ],
  oral: [
    { name: 'Gemini (Canvas)', url: 'https://gemini.google.com', why: { pt: 'Cole o prompt copiado e peça uma apresentação no Canvas.', en: 'Paste the copied prompt and ask for a presentation in Canvas.' } },
    { name: 'Google Slides', url: 'https://slides.google.com', why: { pt: 'Abra o ficheiro .pptx descarregado (Ficheiro › Abrir › Carregar).', en: 'Open the downloaded .pptx (File › Open › Upload).' } },
    { name: 'PowerPoint', url: 'https://www.office.com', why: { pt: 'Abre o .pptx com as notas do orador já preenchidas.', en: 'Opens the .pptx with the speaker notes already filled in.' } },
    { name: 'Canva', url: 'https://www.canva.com/presentations/', why: { pt: 'Importe o .pptx e aplique um modelo visual.', en: 'Import the .pptx and apply a visual template.' } },
  ],
  podcast: [
    { name: 'NotebookLM', url: 'https://notebooklm.google.com', why: { pt: 'Carregue o guião como fonte para gerar um resumo em áudio.', en: 'Upload the script as a source to generate an audio overview.' } },
    { name: 'Audacity', url: 'https://www.audacityteam.org', why: { pt: 'Gratuito: grave e edite a leitura do guião.', en: 'Free: record and edit a reading of the script.' } },
    { name: 'Spotify for Creators', url: 'https://creators.spotify.com', why: { pt: 'Gratuito: grave e publique o episódio.', en: 'Free: record and publish the episode.' } },
  ],
}
