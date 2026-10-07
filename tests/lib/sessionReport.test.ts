import { describe, expect, it } from 'vitest'
import { buildSessionReport, reportToHtml, reportToMarkdown, reportToPdf, toPdfText } from '@/lib/sessionReport'
import type { WizardState } from '@/types/wizard'
import { readBlobBinary } from '../helpers'

const full = {
  projectId: 'p9', topic: 'Recifes de coral', audience: 'school',
  finalResearchQuestion: { question: 'Como o CO2 afeta os recifes?', justification: 'Porque é mensurável', derivedFromQuestions: [], approvedByUser: true },
  searchDesign: { keywords: ['co2', 'recifes'], synonyms: [], booleanQuery: 'co2 AND recifes', searchStrings: [{ database: 'Scopus', query: 'co2 AND recifes' }], recommendedDatabases: [], filters: [] },
  searchArticles: [{ id: 'a1', title: 'Branqueamento', year: 2020, doi: '10.1/x', provider: 'crossref', authors: [], abstract: '' }, { id: 'a2', title: 'Ignorado', provider: 'crossref', authors: [], abstract: '' }],
  selectedSearchArticleIds: ['a1'],
  evidenceRecords: [{ id: 'e1', title: 'Estudo 1', sourceType: 'paper', claim: 'CO2 aquece', methodology: 'meta-análise', findings: ['f1'], limitations: ['pequena amostra'], relevanceScore: 4, citation: 'Silva, 2020' }],
  knowledgeStructure: { topics: ['Clima'], subtopics: ['Aquecimento'], conceptMapNodes: [], conceptMapEdges: [{ from: 'CO2', to: 'Aquecimento', relation: 'causa' }], glossary: [{ term: 'Branqueamento', definition: 'Perda de algas' }] },
  explanationDraft: { outline: ['Intro'], argumentCore: 'O aquecimento causa branqueamento', evidenceReferences: [], bibliography: ['Silva (2020)'], openIssues: ['Dados longos'] },
  multimodalOutputs: { poster: { title: 'Poster', layoutSuggestion: '', fidelityScore: 90, sections: [{ label: 'Intro', content: 'Olá', anchors: [] }] } },
  selfAssessment: { rubricDimensions: [{ dimension: 'R1: Pergunta', score: 4, justification: 'Clara' }], overallReflection: 'Aprendi muito', completedAt: '' },
  reflectionJournal: [{ id: 'j1', prompt: 'O que aprendi?', response: 'Muito', createdAt: '' }],
  extensionPlan: [{ title: 'Estudo longitudinal', description: 'Seguir recifes', complexity: 'high', suggestedDatabases: [], potentialMethodologies: [], gapAddressed: 'tempo' }],
} as unknown as WizardState

const empty = { ...full, finalResearchQuestion: null, topic: '', searchDesign: null, searchArticles: [], selectedSearchArticleIds: [], evidenceRecords: [], knowledgeStructure: null, explanationDraft: null, multimodalOutputs: {}, selfAssessment: null, reflectionJournal: [], extensionPlan: null } as unknown as WizardState

describe('session report', () => {
  it('covers the whole IBL path in order, only with what exists', () => {
    const report = buildSessionReport(full, true, new Date('2026-10-07'))
    expect(report.title).toBe('Como o CO2 afeta os recifes?')
    expect(report.sections.map((section) => section.heading.slice(0, 2))).toEqual(['1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.'])
    const markdown = reportToMarkdown(report)
    expect(markdown).toContain('**Tese:** CO2 aquece')
    expect(markdown).toContain('Branqueamento (2020) - DOI 10.1/x') // selected source only
    expect(markdown).not.toContain('Ignorado')
    expect(markdown).toContain('CO2 -> Aquecimento (causa)')
    expect(markdown).toContain('Escola (12-18 anos)')
    expect(markdown).toContain('R1: Pergunta: 4/5 - Clara')
    expect(markdown).toContain('Estudo longitudinal (high)')
  })

  it('is empty for a project with nothing yet, and English when asked', () => {
    expect(buildSessionReport(empty, true).sections).toEqual([])
    expect(reportToMarkdown(buildSessionReport(full, false))).toContain('**Claim:** CO2 aquece')
  })

  it('renders HTML with headings and lists, escaping user text', () => {
    const html = reportToHtml(buildSessionReport({ ...full, topic: '<script>alert(1)</script> & "x"' } as WizardState, true))
    expect(html).toContain('<h2>1. Pergunta de investigação</h2>')
    expect(html).toContain('<ul><li>')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('keeps Portuguese accents for the PDF but maps symbols its fonts cannot draw', () => {
    expect(toPdfText('Ação, coração, é, ü, ñ')).toBe('Ação, coração, é, ü, ñ')
    expect(toPdfText('“aspas” — travessão … → ✓')).toBe('"aspas" - travessão ... -> v')
    expect(toPdfText('emoji 🙂 and ∑')).toBe('emoji  and ')
  })

  it('produces a real multi-page PDF', async () => {
    const long = { ...full, evidenceRecords: Array.from({ length: 40 }, (_, i) => ({ ...(full.evidenceRecords as any[])[0], id: `e${i}`, title: `Estudo ${i}`, claim: 'Afirmação longa '.repeat(30) })) } as unknown as WizardState
    const blob = await reportToPdf(buildSessionReport(long, true))
    const text = await readBlobBinary(blob)
    expect(text.slice(0, 5)).toBe('%PDF-')
    expect((text.match(/\/Type\s*\/Page\b/g) ?? []).length).toBeGreaterThan(2)
  })
})
