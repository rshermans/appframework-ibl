import type { WizardState } from '@/types/wizard'

/**
 * One report model, three renderers (PDF, Google Docs clipboard, Markdown). It is built from the
 * learner's local progress, so it works even when the database is unreachable.
 */
export type ReportBlock =
  | { type: 'paragraph'; label?: string; text: string }
  | { type: 'list'; label?: string; items: string[] }

export interface ReportSection {
  heading: string
  blocks: ReportBlock[]
}

export interface SessionReport {
  title: string
  subtitle: string
  sections: ReportSection[]
}

type Snapshot = Pick<
  WizardState,
  | 'topic' | 'projectId' | 'audience' | 'finalResearchQuestion' | 'searchDesign' | 'searchArticles'
  | 'selectedSearchArticleIds' | 'evidenceRecords' | 'knowledgeStructure' | 'explanationDraft'
  | 'multimodalOutputs' | 'selfAssessment' | 'reflectionJournal' | 'extensionPlan'
>

const AUDIENCE_NAMES = {
  general: { pt: 'Público geral', en: 'General public' },
  school: { pt: 'Escola (12-18 anos)', en: 'School (12-18 yrs)' },
  academic: { pt: 'Académico', en: 'Academic' },
} as const

const para = (text: string | undefined, label?: string): ReportBlock[] =>
  text && text.trim() ? [{ type: 'paragraph', label, text: text.trim() }] : []
const list = (items: Array<string | undefined> | undefined, label?: string): ReportBlock[] => {
  const clean = (items ?? []).map((item) => (item ?? '').trim()).filter(Boolean)
  return clean.length ? [{ type: 'list', label, items: clean }] : []
}

export function buildSessionReport(s: Snapshot, pt: boolean, now: Date = new Date()): SessionReport {
  const t = (portuguese: string, english: string) => (pt ? portuguese : english)
  const sections: ReportSection[] = []
  const add = (heading: string, blocks: ReportBlock[]) => {
    if (blocks.length) sections.push({ heading, blocks })
  }

  add(t('1. Pergunta de investigação', '1. Research question'), [
    ...para(s.topic, t('Tema', 'Topic')),
    ...para(s.finalResearchQuestion?.question, t('Pergunta final', 'Final question')),
    ...para(s.finalResearchQuestion?.justification, t('Justificação', 'Justification')),
  ])

  const design = s.searchDesign
  add(t('2. Estratégia de pesquisa', '2. Search strategy'), design ? [
    ...para(design.booleanQuery, t('Pesquisa booleana', 'Boolean query')),
    ...list(design.keywords, t('Palavras-chave', 'Keywords')),
    ...list(design.searchStrings?.map((item) => `${item.database}: ${item.query}`), t('Pesquisas por base de dados', 'Searches per database')),
  ] : [])

  const selected = new Set(s.selectedSearchArticleIds ?? [])
  const reviewed = (s.searchArticles ?? []).filter((article) => selected.has(article.id))
  add(t('3. Fontes selecionadas', '3. Selected sources'), list(
    reviewed.map((article) => `${article.title}${article.year ? ` (${article.year})` : ''}${article.doi ? ` - DOI ${article.doi}` : ''}`)
  ))

  add(t('4. Evidência extraída', '4. Extracted evidence'),
    (s.evidenceRecords ?? []).flatMap((record, index): ReportBlock[] => [
      ...para(`${index + 1}. ${record.title}`),
      ...para(record.claim, t('Tese', 'Claim')),
      ...para(record.methodology, t('Metodologia', 'Methodology')),
      ...list(record.findings, t('Resultados', 'Findings')),
      ...list(record.limitations, t('Limitações', 'Limitations')),
      ...para(record.citation, t('Citação', 'Citation')),
    ])
  )

  const ks = s.knowledgeStructure
  add(t('5. Estrutura de conhecimento', '5. Knowledge structure'), ks ? [
    ...list(ks.topics, t('Tópicos', 'Topics')),
    ...list(ks.subtopics, t('Subtópicos', 'Subtopics')),
    ...list(ks.conceptMapEdges?.map((edge) => `${edge.from} -> ${edge.to}${edge.relation ? ` (${edge.relation})` : ''}`), t('Relações do mapa conceptual', 'Concept map relations')),
    ...list(ks.glossary?.map((entry) => `${entry.term}: ${entry.definition}`), t('Glossário', 'Glossary')),
  ] : [])

  const ex = s.explanationDraft
  add(t('6. Explicação científica', '6. Scientific explanation'), ex ? [
    ...para(ex.argumentCore, t('Tese central', 'Central argument')),
    ...list(ex.outline, t('Estrutura', 'Outline')),
    ...list(ex.openIssues, t('Questões em aberto', 'Open issues')),
    ...list(ex.bibliography, t('Bibliografia', 'Bibliography')),
  ] : [])

  const out = s.multimodalOutputs ?? {}
  const outputs: ReportBlock[] = [
    ...(out.poster ? list(out.poster.sections.map((x) => `${x.label}: ${x.content}`), `${t('Poster', 'Poster')}: ${out.poster.title}`) : []),
    ...(out.podcast ? list(out.podcast.segments.map((x) => `${x.timestamp} ${x.speaker}: ${x.text}`), `${t('Podcast', 'Podcast')}: ${out.podcast.title}`) : []),
    ...(out.videocast ? list(out.videocast.scenes.map((x) => `${x.sceneNumber}. ${x.description} [${x.visualNote}]`), `${t('Vídeo (guião)', 'Video (script)')}: ${out.videocast.title}`) : []),
    ...(out.game ? list(out.game.branches.map((x) => x.prompt), `${t('Jogo', 'Game')}: ${out.game.title}`) : []),
    ...(out.oral ? list(out.oral.slides.map((x) => `${x.slideNumber}. ${x.heading}: ${x.bulletPoints.join('; ')}`), `${t('Apresentação', 'Presentation')}: ${out.oral.title}`) : []),
  ]
  if (outputs.length) {
    add(t('7. Comunicação científica', '7. Science communication'), [
      ...para(AUDIENCE_NAMES[s.audience ?? 'general'][pt ? 'pt' : 'en'], t('Público-alvo', 'Target audience')),
      ...outputs,
    ])
  }

  const self = s.selfAssessment
  const journal = s.reflectionJournal ?? []
  const ext = s.extensionPlan
  add(t('8. Reflexão e melhoria', '8. Reflection and improvement'), [
    ...(self ? list(self.rubricDimensions.map((d) => `${d.dimension}: ${d.score}/5${d.justification ? ` - ${d.justification}` : ''}`), t('Autoavaliação', 'Self-assessment')) : []),
    ...(self ? para(self.overallReflection, t('Reflexão global', 'Overall reflection')) : []),
    ...list(journal.map((entry) => `${entry.prompt} -> ${entry.response}`), t('Diário reflexivo', 'Reflective journal')),
    ...(ext ? list(ext.map((path) => `${path.title} (${path.complexity}): ${path.description}`), t('Caminhos de extensão', 'Extension paths')) : []),
  ])

  return {
    title: s.finalResearchQuestion?.question || s.topic || 'IBL-AI',
    subtitle: `IBL-AI · ${s.projectId || ''} · ${now.toLocaleDateString(pt ? 'pt-PT' : 'en-GB')}`.replace(' ·  ·', ' ·'),
    sections,
  }
}

export function reportToMarkdown(report: SessionReport): string {
  const lines = [`# ${report.title}`, `_${report.subtitle}_`, '']
  for (const section of report.sections) {
    lines.push(`## ${section.heading}`, '')
    for (const block of section.blocks) {
      if (block.type === 'paragraph') {
        lines.push(block.label ? `**${block.label}:** ${block.text}` : block.text, '')
      } else {
        if (block.label) lines.push(`**${block.label}**`)
        lines.push(...block.items.map((item) => `- ${item}`), '')
      }
    }
  }
  return lines.join('\n').trim() + '\n'
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** HTML keeps headings and lists when pasted into Google Docs / Word. */
export function reportToHtml(report: SessionReport): string {
  const parts = [`<h1>${escapeHtml(report.title)}</h1>`, `<p><em>${escapeHtml(report.subtitle)}</em></p>`]
  for (const section of report.sections) {
    parts.push(`<h2>${escapeHtml(section.heading)}</h2>`)
    for (const block of section.blocks) {
      if (block.type === 'paragraph') {
        parts.push(`<p>${block.label ? `<strong>${escapeHtml(block.label)}:</strong> ` : ''}${escapeHtml(block.text)}</p>`)
      } else {
        if (block.label) parts.push(`<p><strong>${escapeHtml(block.label)}</strong></p>`)
        parts.push(`<ul>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`)
      }
    }
  }
  return parts.join('\n')
}

const PDF_CHAR_MAP: Record<string, string> = {
  '‘': "'", '’': "'", '“': '"', '”': '"', '–': '-', '—': '-', '…': '...',
  '→': '->', '•': '-', '✓': 'v', ' ': ' ', '≥': '>=', '≤': '<=', '×': 'x',
}

/** jsPDF's built-in fonts only cover Latin-1: keep accents, map or drop the rest. */
export function toPdfText(value: string): string {
  return value
    .normalize('NFC')
    .replace(/[‘’“”–—…→•✓ ≥≤×]/g, (ch) => PDF_CHAR_MAP[ch] ?? '')
    .replace(/[^\x09\x0A\x0D\x20-\x7E¡-ÿ]/g, '')
}

export async function reportToPdf(report: SessionReport): Promise<Blob> {
  const { default: JsPdf } = await import('jspdf')
  const pdf = new JsPdf({ unit: 'mm', format: 'a4' })
  const W = 210
  const H = 297
  const M = 16
  const CW = W - M * 2
  let y = M

  const ensure = (needed: number) => {
    if (y + needed > H - M) {
      pdf.addPage()
      y = M
    }
  }
  const write = (text: string, size: number, bold: boolean, color: [number, number, number], indent = 0, gap = 1.6) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal')
    pdf.setFontSize(size)
    pdf.setTextColor(color[0], color[1], color[2])
    const lineHeight = size * 0.45
    const lines = pdf.splitTextToSize(toPdfText(text), CW - indent) as string[]
    for (const line of lines) {
      ensure(lineHeight)
      pdf.text(line, M + indent, y)
      y += lineHeight
    }
    y += gap
  }

  write(report.title, 17, true, [30, 64, 175], 0, 2)
  write(report.subtitle, 9, false, [100, 116, 139], 0, 5)

  for (const section of report.sections) {
    ensure(18)
    y += 2
    write(section.heading, 12, true, [30, 64, 175], 0, 1)
    pdf.setDrawColor(226, 232, 240)
    pdf.line(M, y - 0.5, W - M, y - 0.5)
    y += 2.5
    for (const block of section.blocks) {
      if (block.label) write(block.label, 9, true, [71, 85, 105], 0, 0.8)
      if (block.type === 'paragraph') {
        write(block.text, 10, false, [30, 30, 40], 0, 2.4)
      } else {
        for (const item of block.items) write(`- ${item}`, 10, false, [30, 30, 40], 3, 1)
        y += 1.4
      }
    }
  }

  const pages = pdf.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(120, 130, 145)
    pdf.text(`${page} / ${pages}`, W - M, H - 8, { align: 'right' })
  }
  return pdf.output('blob')
}
