import { describe, expect, it } from 'vitest'
import { parseAiJson, parseAiJsonWithOptions } from '@/lib/parseAiJson'
import { buildMarkmapMarkdown, buildMindMapLines, buildPlantUmlMindMap, parseOutlineMarkdown } from '@/lib/mindmap'
import {
  getNextRecommendedStep, getStage1LockKey, isStage1StepDone, type Stage1FlowState,
} from '@/lib/flowProgress'
import { AUDIENCES, getAudienceGuidance, getIntegrityRules, normalizeAudience } from '@/lib/audience'
import { buildNotebookLmPrompt } from '@/lib/notebookLmPrompts'
import { buildGoogleDocMarkdown, buildSessionExport, buildShareEmail } from '@/lib/sessionExport'
import {
  buildCompleteBibliography, buildReviewedReferences, doiToUrl, extractDoi, extractFirstUrl,
  formatArticleCitation, isLikelyPdf, normalizeDoi, normalizeUrl,
} from '@/lib/explanationReferences'
import { isValidMultimodalArtifact } from '@/lib/multimodalContract'
import { wizardStorage, WIZARD_STORAGE_KEY, readPersistedWizardState } from '@/lib/persistStorage'
import type { EvidenceRecord, KnowledgeStructure, SearchArticle } from '@/types/research-workflow'
import type { WizardState } from '@/types/wizard'

describe('parseAiJson (every AI step depends on it)', () => {
  it('parses plain JSON, fenced JSON and objects', () => {
    expect(parseAiJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 })
    expect(parseAiJson<{ a: number }>('```json\n{"a":1}\n```')).toEqual({ a: 1 })
    expect(parseAiJson<{ a: number }>({ a: 1 })).toEqual({ a: 1 })
  })
  it('recovers from trailing commas, commentary after the JSON and raw newlines in strings', () => {
    expect(parseAiJson<{ a: number[] }>('{"a":[1,2,],}')).toEqual({ a: [1, 2] })
    expect(parseAiJson<{ a: number }>('Here you go: {"a":1} Hope it helps {not json}')).toEqual({ a: 1 })
    expect(parseAiJson<{ t: string }>('{"t":"line1\nline2"}').t).toBe('line1\nline2')
  })
  it('throws on garbage and unsupported input, and runs the validator', () => {
    expect(() => parseAiJson('no json at all')).toThrow()
    expect(() => parseAiJson(42)).toThrow(/unsupported/i)
    expect(() => parseAiJsonWithOptions<{ a?: number }>('{"b":1}', { validate: (v) => v.a !== undefined, errorMessage: 'bad shape' })).toThrow('bad shape')
  })
})

describe('mind map outline (Step 4)', () => {
  const structure = (md: string): KnowledgeStructure => ({
    topics: ['T1', 'T2'], subtopics: ['S1', 'S2', 'S3'], conceptMapNodes: ['N1'], conceptMapEdges: [], mindMapMarkdown: md,
  })

  it('parses bullets, numbered lists, headings, literal \\n and odd indentation', () => {
    expect(parseOutlineMarkdown('- A\n    - B\n        - C')).toEqual([
      { level: 1, text: 'A' }, { level: 2, text: 'B' }, { level: 3, text: 'C' },
    ])
    expect(parseOutlineMarkdown('# Root\n## Child').map((l) => l.level)).toEqual([1, 2])
    expect(parseOutlineMarkdown('1. One\n   2) Two').map((l) => l.text)).toEqual(['One', 'Two'])
    expect(parseOutlineMarkdown('- A\\n  - B')).toHaveLength(2)
    expect(parseOutlineMarkdown('- **Bold** [link](http://x)')[0].text).toBe('Bold link')
    expect(parseOutlineMarkdown('')).toEqual([])
  })

  it('wraps several roots under the research question', () => {
    const lines = buildMindMapLines(structure('- A\n- B\n  - C'), 'My RQ')
    expect(lines[0]).toEqual({ level: 1, text: 'My RQ' })
    expect(lines.filter((l) => l.level === 1)).toHaveLength(1)
  })

  it('keeps a single-root outline unchanged and falls back when the outline is empty', () => {
    expect(buildMindMapLines(structure('- Root\n  - Child'), 'RQ')).toEqual([{ level: 1, text: 'Root' }, { level: 2, text: 'Child' }])
    const fallback = buildMindMapLines(structure(''), 'RQ')
    expect(fallback[0].text).toBe('RQ')
    expect(fallback.some((l) => l.text === 'T1')).toBe(true)
  })

  it('renders markmap markdown and PlantUML from the same lines', () => {
    const lines = [{ level: 1, text: 'Root' }, { level: 2, text: 'Child' }]
    expect(buildMarkmapMarkdown(lines)).toBe('- Root\n  - Child')
    expect(buildPlantUmlMindMap(lines)).toBe('@startmindmap\n* Root\n** Child\n@endmindmap')
  })
})

describe('Stage 1 flow (stepper)', () => {
  const empty: Stage1FlowState = {
    candidateResearchQuestions: [], rqCandidates: [], step0OptionalCompleted: false, selectedRQs: [], comparisonResult: null,
    finalResearchQuestion: null, searchDesign: null, searchArticles: [], evidenceRecords: [], knowledgeStructure: null, explanationDraft: null,
  }

  it('starts at step 0 and walks the framework order as work is done', () => {
    expect(getNextRecommendedStep(empty)).toBe('step0_generate')
    const s1 = { ...empty, candidateResearchQuestions: [{}] }
    expect(getNextRecommendedStep(s1)).toBe('step1_select')
    expect(getNextRecommendedStep({ ...s1, selectedRQs: ['only one'] })).toBe('step1_select') // 1A needs two
    const s1b = { ...s1, selectedRQs: ['q', 'r'] }
    expect(getNextRecommendedStep(s1b)).toBe('step1a_compare')
    const s2 = { ...s1b, comparisonResult: {} }
    expect(getNextRecommendedStep(s2)).toBe('step1b_synthesize')
    const s3 = { ...s2, finalResearchQuestion: { approvedByUser: true } }
    expect(getNextRecommendedStep(s3)).toBe('step2_search_design')
    const s4 = { ...s3, searchDesign: {}, searchArticles: [{}] }
    expect(getNextRecommendedStep(s4)).toBe('step3_evidence_extraction')
    const s5 = { ...s4, evidenceRecords: [{}] }
    expect(getNextRecommendedStep(s5)).toBe('step4_knowledge_structure')
    const s6 = { ...s5, knowledgeStructure: {} }
    expect(getNextRecommendedStep(s6)).toBe('step9_explanation')
    expect(getNextRecommendedStep({ ...s6, explanationDraft: {} })).toBeNull()
  })

  it('locks steps until their prerequisites exist, with the right message key', () => {
    expect(getStage1LockKey('step1a_compare', { ...empty, selectedRQs: ['one'] })).toBe('steps.step1A.invalidSelection')
    expect(getStage1LockKey('step1a_compare', { ...empty, selectedRQs: ['a', 'b'] })).toBeNull()
    expect(getStage1LockKey('step1b_synthesize', empty)).toBe('common.lockedStep1B')
    expect(getStage1LockKey('step1b_synthesize', { ...empty, comparisonResult: {} })).toBeNull()
    expect(getStage1LockKey('step2_search_design', empty)).toBe('common.lockedStep2')
    expect(getStage1LockKey('step3_evidence_extraction', { ...empty, searchDesign: {} })).toBe('common.lockedStep3')
    expect(getStage1LockKey('step4_knowledge_structure', empty)).toBe('common.lockedStep4')
    expect(getStage1LockKey('step9_explanation', { ...empty, knowledgeStructure: {} })).toBe('common.lockedStep5')
    expect(getStage1LockKey('step1_select', empty)).toBeNull()
  })

  it('marks optional step 0 done when archived', () => {
    expect(isStage1StepDone('step0_generate', { ...empty, step0OptionalCompleted: true })).toBe(true)
    expect(isStage1StepDone('step1a_compare', { ...empty, comparisonResult: {} })).toBe(true)
  })
})

describe('audience and NotebookLM prompt (Stage 2)', () => {
  it('normalises unknown audiences to general', () => {
    expect(normalizeAudience('school')).toBe('school')
    expect(normalizeAudience('academic')).toBe('academic')
    expect(normalizeAudience('whatever')).toBe('general')
    expect(normalizeAudience(undefined)).toBe('general')
    expect(AUDIENCES).toHaveLength(3)
  })

  it('has distinct guidance per audience and language, plus integrity rules', () => {
    const guides = AUDIENCES.map((a) => getAudienceGuidance(a, 'en'))
    expect(new Set(guides).size).toBe(3)
    expect(getAudienceGuidance('school', 'pt-PT')).toContain('12 a 18')
    expect(getIntegrityRules('en')).toMatch(/only claims/i)
  })

  it('embeds audience, integrity and evidence in every artifact prompt', () => {
    for (const artifactType of ['poster', 'podcast', 'video', 'game', 'presentation'] as const) {
      const { fullPrompt } = buildNotebookLmPrompt({
        projectId: 'p', artifactType, locale: 'en', researchQuestion: 'RQ?', topic: 'T',
        compressedEvidence: '', evidenceKeyPoints: [{ claim: 'Claim X', source: 'Silva (2020)' }],
        promptText: '', instructions: '', audience: 'academic',
      })
      expect(fullPrompt).toContain('Academic audience')
      expect(fullPrompt).toContain('Scientific Integrity')
      expect(fullPrompt).toContain('Claim X (Source: Silva (2020))')
    }
  })
})

describe('session export (home toolbar)', () => {
  const state = {
    projectId: 'p9', stage: 2, workflowStep: 'step9_explanation', topic: 'Reefs',
    finalResearchQuestion: { question: 'RQ?' }, explanationDraft: { argumentCore: 'Core' },
    interactions: [{}, {}], selectedSearchArticleIds: ['a'], evidenceRecords: [], multimodalOutputs: {},
    peerReviews: [], selfAssessment: null, reflectionJournal: [], extensionPlan: null, searchDesign: null, knowledgeStructure: null,
  } as unknown as WizardState

  it('snapshots the project and renders the Google Docs summary', () => {
    const payload = buildSessionExport(state, '2026-01-01T00:00:00Z')
    expect(payload).toMatchObject({ projectId: 'p9', stage: 2, selectedArticles: ['a'], exportedAt: '2026-01-01T00:00:00Z' })
    const md = buildGoogleDocMarkdown(payload)
    expect(md).toContain('# IBL Session p9')
    expect(md).toContain('RQ?')
    expect(md).toContain('Core')
    expect(md).toContain('Interactions recorded: 2')
  })

  it('builds a localised share email', () => {
    expect(buildShareEmail({ projectId: 'p9', topic: '', stage: 1, interactionCount: 3, pt: true }).body).toContain('Topico: -')
    expect(buildShareEmail({ projectId: 'p9', topic: 'X', stage: 1, interactionCount: 3, pt: false }).subject).toBe('IBL Session p9')
  })
})

describe('reference helpers (Step 9)', () => {
  it('normalises urls and DOIs', () => {
    expect(normalizeUrl(' https://a.org ')).toBe('https://a.org')
    expect(normalizeUrl('ftp://a')).toBeUndefined()
    expect(normalizeDoi('https://doi.org/10.1/abc')).toBe('10.1/abc')
    expect(normalizeDoi('doi: 10.1/abc')).toBe('10.1/abc')
    expect(doiToUrl('10.1/abc')).toBe('https://doi.org/10.1/abc')
    expect(extractDoi('see 10.1234/xyz.5 for details')).toBe('10.1234/xyz.5')
    expect(extractFirstUrl('read https://a.org/x) now')).toBe('https://a.org/x')
    expect(isLikelyPdf('https://a.org/p.pdf?dl=1')).toBe(true)
    expect(isLikelyPdf('https://a.org/page')).toBe(false)
  })

  it('builds a de-duplicated bibliography with links from linked articles', () => {
    const articles = [{ id: 'a1', title: 'Coral', authors: ['Silva'], year: 2020, doi: '10.1/abc', url: 'https://x.org/1', provider: 'crossref' }] as SearchArticle[]
    const records = [
      { id: 'e1', sourceArticleId: 'a1', citation: '', claim: 'c' },
      { id: 'e2', sourceArticleId: 'a1', citation: '', claim: 'c2' },
      { id: 'e3', citation: 'Costa (2021). Paper.', claim: 'c3' },
    ] as EvidenceRecord[]
    expect(buildReviewedReferences(records, articles)).toHaveLength(2)
    const bibliography = buildCompleteBibliography(records, articles)
    expect(bibliography).toHaveLength(2)
    expect(bibliography[0]).toContain('Silva (2020). Coral.')
    expect(bibliography[0]).toContain('DOI: https://doi.org/10.1/abc')
    expect(formatArticleCitation({ ...articles[0], authors: [], year: undefined } as SearchArticle)).toContain('Unknown authors (n.d.)')
  })
})

describe('multimodal contract', () => {
  it('rejects artifacts without a numeric fidelity score or content', () => {
    expect(isValidMultimodalArtifact('poster', { title: 'T', sections: [{ label: 'l', content: 'c', anchors: [] }] })).toBe(false)
    expect(isValidMultimodalArtifact('poster', { title: 'T', fidelityScore: 80, sections: [] })).toBe(false)
    expect(isValidMultimodalArtifact('poster', { title: 'T', fidelityScore: 80, sections: [{ label: 'l', content: 'c', anchors: [] }] })).toBe(true)
    expect(isValidMultimodalArtifact('oral', { title: 'T', fidelityScore: 1, slides: [{ slideNumber: 1, heading: 'h', bulletPoints: [], speakerNotes: 'n', anchors: [] }] })).toBe(false)
  })
})

describe('wizard persistence', () => {
  it('stores in localStorage and migrates a legacy sessionStorage session once', () => {
    window.sessionStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify({ state: { topic: 'legacy', aiConsentAccepted: true } }))
    expect(readPersistedWizardState<{ topic: string }>()?.topic).toBe('legacy')
    expect(window.localStorage.getItem(WIZARD_STORAGE_KEY)).toContain('legacy')
    expect(window.sessionStorage.getItem(WIZARD_STORAGE_KEY)).toBeNull()
    wizardStorage.removeItem(WIZARD_STORAGE_KEY)
    expect(readPersistedWizardState()).toBeNull()
  })
  it('ignores corrupted data', () => {
    window.localStorage.setItem(WIZARD_STORAGE_KEY, '{not json')
    expect(readPersistedWizardState()).toBeNull()
  })
})
