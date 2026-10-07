import type { OralPresentation } from '@/types/research-workflow'

const BLUE = '1E40AF'
const GREEN = '16A34A'
const TEXT = '1F2937'
const MUTED = '64748B'
export const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'

export interface PptxContext {
  researchQuestion: string
  audienceLabel: string
  pt: boolean
}

const uniqueCitations = (anchors: Array<{ citationKey: string }> | undefined) =>
  Array.from(new Set((anchors ?? []).map((anchor) => anchor.citationKey).filter(Boolean)))

/**
 * A real .pptx built in the browser from the structured presentation (no API call): title slide,
 * one slide per item with bullets, speaker notes in the notes pane, sources in the footer and a
 * final References slide. Opens in PowerPoint, Google Slides and Canva.
 */
export async function buildPptxBlob(presentation: OralPresentation, context: PptxContext): Promise<Blob> {
  const { default: PptxGenJS } = await import('pptxgenjs')
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE' // 13.33 x 7.5 in
  pptx.title = presentation.title
  pptx.company = 'IBL-AI'

  const { pt } = context

  const cover = pptx.addSlide()
  cover.background = { color: BLUE }
  cover.addText(presentation.title, { x: 0.8, y: 2.0, w: 11.7, h: 1.6, fontSize: 38, bold: true, color: 'FFFFFF', fontFace: 'Calibri', valign: 'middle' })
  cover.addText(context.researchQuestion, { x: 0.8, y: 3.7, w: 11.7, h: 1.0, fontSize: 20, color: 'DBEAFE', fontFace: 'Calibri', valign: 'top' })
  cover.addText(`IBL-AI · ${context.audienceLabel} · ~${presentation.totalDurationMinutes} min`, { x: 0.8, y: 6.5, w: 11.7, h: 0.5, fontSize: 12, color: 'BFDBFE', fontFace: 'Calibri' })

  const allCitations: string[] = []
  presentation.slides.forEach((item) => {
    const slide = pptx.addSlide()
    slide.background = { color: 'FFFFFF' }
    slide.addShape('rect', { x: 0, y: 0, w: 0.25, h: 7.5, fill: { color: GREEN }, line: { color: GREEN } })
    slide.addText(item.heading, { x: 0.7, y: 0.4, w: 12, h: 1.0, fontSize: 30, bold: true, color: BLUE, fontFace: 'Calibri', valign: 'middle' })

    const bullets = item.bulletPoints.length ? item.bulletPoints : [item.heading]
    slide.addText(
      bullets.map((point) => ({ text: point, options: { bullet: true, breakLine: true } })),
      { x: 0.8, y: 1.6, w: 11.8, h: 4.6, fontSize: bullets.length > 5 ? 18 : 22, color: TEXT, fontFace: 'Calibri', valign: 'top', paraSpaceAfter: 10 }
    )

    const sources = uniqueCitations(item.anchors)
    allCitations.push(...sources)
    if (sources.length) {
      slide.addText(`${pt ? 'Fontes' : 'Sources'}: ${sources.join('; ')}`, { x: 0.8, y: 6.7, w: 11.0, h: 0.5, fontSize: 11, italic: true, color: MUTED, fontFace: 'Calibri' })
    }
    slide.addText(String(item.slideNumber), { x: 12.3, y: 6.9, w: 0.6, h: 0.4, fontSize: 11, color: MUTED, align: 'right' })
    if (item.speakerNotes) slide.addNotes(item.speakerNotes)
  })

  const references = pptx.addSlide()
  references.background = { color: 'FFFFFF' }
  references.addText(pt ? 'Referências' : 'References', { x: 0.7, y: 0.4, w: 12, h: 1.0, fontSize: 30, bold: true, color: BLUE, fontFace: 'Calibri' })
  const unique = Array.from(new Set(allCitations))
  references.addText(
    (unique.length ? unique : [pt ? 'Sem fontes associadas.' : 'No sources attached.']).map((entry) => ({ text: entry, options: { bullet: true, breakLine: true } })),
    { x: 0.8, y: 1.6, w: 11.8, h: 4.8, fontSize: 16, color: TEXT, fontFace: 'Calibri', valign: 'top', paraSpaceAfter: 8 }
  )
  references.addText(
    pt ? 'Conteúdo gerado com apoio de IA a partir das evidências do projeto; verifique antes de apresentar.' : 'Content generated with AI support from the project evidence; verify before presenting.',
    { x: 0.8, y: 6.8, w: 11.5, h: 0.4, fontSize: 10, italic: true, color: MUTED, fontFace: 'Calibri' }
  )

  const data = (await pptx.write({ outputType: 'arraybuffer' })) as ArrayBuffer
  return new Blob([data], { type: PPTX_MIME })
}
