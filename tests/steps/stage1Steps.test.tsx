import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWizardStore } from '@/store/wizardStore'
import Step0 from '@/components/steps/Step0'
import StepSelect from '@/components/StepSelect'
import Step1A from '@/components/Step1A'
import Step1B from '@/components/Step1B'
import Step2Search from '@/components/Step2Search'
import Step3Evidence from '@/components/Step3Evidence'
import Step5SourceSelection from '@/components/Step5SourceSelection'
import Step4Structure from '@/components/Step4Structure'
import Step8Glossary from '@/components/Step8Glossary'
import Step5Explanation from '@/components/Step5Explanation'
import {
  aiFail, aiOk, approvedQuestion, article, evidenceRecord, jsonResponse, knowledgeStructure, mockFetch, msg,
  renderStep, resetStore, searchDesign,
} from '../helpers'

const state = () => useWizardStore.getState()
const button = (name: string | RegExp) => screen.getByRole('button', { name })

afterEach(() => vi.restoreAllMocks())

describe('Step 0 - candidate questions', () => {
  beforeEach(() => resetStore())

  it('generates candidates, stores them and sends the right prompt', async () => {
    const api = mockFetch({
      ai: () => aiOk({ questions: [
        { question: 'Q one?', type: 'empirical', rationale: 'r1', databases: ['Scopus'], ibl_score: 4 },
        { question: 'Q two?', type: 'causal', ibl_score: 3 },
      ] }),
    })
    renderStep(<Step0 />)
    fireEvent.click(button(msg('steps.step0.generate')))

    await waitFor(() => expect(state().rqCandidates).toEqual(['Q one?', 'Q two?']))
    expect(state().candidateResearchQuestions[0]).toMatchObject({ id: 'rq-1', epistemicType: 'empirical', iblScore: 4, databases: ['Scopus'] })
    expect(api.ai()[0].body).toMatchObject({ promptId: 'rq_generation', topic: 'Coral reefs', stage: 1 })
    expect(await screen.findByText('Q1: Q one?')).toBeInTheDocument()
  })

  it('refuses an empty topic without calling the API', async () => {
    const api = mockFetch({ ai: () => aiOk({}) })
    resetStore({ topic: '' })
    renderStep(<Step0 />)
    fireEvent.click(button(msg('steps.step0.generate')))
    expect(await screen.findByText(msg('steps.step0.invalidTopic'))).toBeInTheDocument()
    expect(api.calls).toHaveLength(0)
  })

  it('survives a non-JSON answer and shows server errors', async () => {
    mockFetch({ ai: () => aiOk('sorry, I cannot do that') })
    renderStep(<Step0 />)
    fireEvent.click(button(msg('steps.step0.generate')))
    await waitFor(() => expect(button(msg('steps.step0.generate'))).toBeEnabled())
    expect(state().rqCandidates).toEqual([])

    vi.restoreAllMocks()
    mockFetch({ ai: () => aiFail('quota exceeded') })
    fireEvent.click(button(msg('steps.step0.generate')))
    expect(await screen.findByText('quota exceeded')).toBeInTheDocument()
  })
})

describe('Step 1 - select questions', () => {
  beforeEach(() => resetStore({ rqCandidates: ['Alpha?', 'Beta?', 'Gamma?'] }))

  it('needs two selections to continue, then goes to the comparison', async () => {
    renderStep(<StepSelect />)
    const next = button(msg('steps.step1Select.continueButton'))
    expect(next).toBeDisabled()
    fireEvent.click(screen.getByText('Alpha?'))
    expect(next).toBeDisabled()
    fireEvent.click(screen.getByText('Gamma?'))
    expect(next).toBeEnabled()
    expect(state().selectedRQs).toEqual(['Alpha?', 'Gamma?'])
    fireEvent.click(next)
    expect(state().workflowStep).toBe('step1a_compare')
    fireEvent.click(screen.getByText('Gamma?')) // toggles off (component stays mounted in this test)
    expect(state().selectedRQs).toEqual(['Alpha?'])
  })
})

describe('Step 1A - compare questions', () => {
  it('stores the comparison and moves on to the synthesis', async () => {
    resetStore({ selectedRQs: ['Alpha?', 'Beta?'] })
    const api = mockFetch({
      ai: () => aiOk({ comparisons: [{ question: 'Alpha?', strengths: ['s'] }], recommended_question: 'Alpha?', recommendation_reason: 'clearer' }),
    })
    renderStep(<Step1A />)
    fireEvent.click(button(msg('steps.step1A.run')))
    await waitFor(() => expect(state().workflowStep).toBe('step1b_synthesize'))
    expect(state().comparisonResult).toMatchObject({ mode: expect.any(String), recommendedQuestion: 'Alpha?', recommendationReason: 'clearer' })
    expect(api.ai()[0].body).toMatchObject({ promptId: 'rq_analysis', selectedRQs: ['Alpha?', 'Beta?'] })
  })

  it('blocks the comparison with fewer than two questions', async () => {
    resetStore({ selectedRQs: ['Alpha?'] })
    const api = mockFetch({ ai: () => aiOk({}) })
    renderStep(<Step1A />)
    fireEvent.click(button(msg('steps.step1A.run')))
    expect(await screen.findByText(msg('steps.step1A.invalidSelection'))).toBeInTheDocument()
    expect(api.calls).toHaveLength(0)
  })

  it('keeps the prose as the comparison when the model does not answer in JSON (no dead end in 1B)', async () => {
    resetStore({ selectedRQs: ['Alpha?', 'Beta?'] })
    mockFetch({ ai: () => aiOk('free text analysis') })
    renderStep(<Step1A />)
    fireEvent.click(button(msg('steps.step1A.run')))
    await waitFor(() => expect(state().workflowStep).toBe('step1b_synthesize'))
    expect(state().comparisonResult).toMatchObject({ comparisons: [], recommendationReason: 'free text analysis' })
    expect(state().analysis).toBe('free text analysis')
  })

  it('shows an error and stays in 1A when the answer is empty', async () => {
    resetStore({ selectedRQs: ['Alpha?', 'Beta?'] })
    mockFetch({ ai: () => aiOk('   ') })
    renderStep(<Step1A />)
    fireEvent.click(button(msg('steps.step1A.run')))
    expect(await screen.findByText(msg('api.genericFailure'))).toBeInTheDocument()
    expect(state().workflowStep).not.toBe('step1b_synthesize')
    expect(state().comparisonResult).toBeNull()
  })
})

describe('Step 1B - final question', () => {
  const comparison = { mode: 'quick', comparisons: [], recommendedQuestion: 'Alpha?', recommendationReason: 'r' }

  it('synthesises a final question that still needs human approval, then approves it', async () => {
    resetStore({ selectedRQs: ['Alpha?', 'Beta?'], comparisonResult: comparison })
    const api = mockFetch({ ai: () => aiOk({ final_question: 'Final Q?', justification: 'because' }) })
    renderStep(<Step1B />)
    fireEvent.click(button(/Gerar ou refazer pergunta final|Generate or redo final question/))
    await waitFor(() => expect(state().finalResearchQuestion?.question).toBe('Final Q?'))
    expect(state().finalResearchQuestion).toMatchObject({ approvedByUser: false, derivedFromQuestions: ['Alpha?', 'Beta?'] })
    expect(api.ai()[0].body.promptId).toBe('rq_synthesis')

    fireEvent.click(await screen.findByRole('button', { name: msg('steps.step1B.approveButton') }))
    expect(state().finalResearchQuestion?.approvedByUser).toBe(true)
    fireEvent.click(await screen.findByRole('button', { name: msg('steps.step1B.continueButton') }))
    expect(state().workflowStep).toBe('step2_search_design')
  })

  it('rejects a synthesis without question or justification', async () => {
    resetStore({ selectedRQs: ['Alpha?', 'Beta?'], comparisonResult: comparison })
    mockFetch({ ai: () => aiOk({ final_question: 'Only a question' }) })
    renderStep(<Step1B />)
    fireEvent.click(button(/Gerar ou refazer pergunta final|Generate or redo final question/))
    expect(await screen.findByText(msg('api.genericFailure'))).toBeInTheDocument()
    expect(state().finalResearchQuestion).toBeNull()
  })

  it('explains why synthesis is unavailable and offers the way to Step 1A', () => {
    resetStore({ selectedRQs: ['Alpha?', 'Beta?'], comparisonResult: null })
    renderStep(<Step1B />)
    expect(button(/Gerar ou refazer pergunta final|Generate or redo final question/)).toBeDisabled()
    expect(screen.getByText(msg('steps.step1B.needsComparison'))).toBeInTheDocument()
    fireEvent.click(button(msg('steps.step1B.goToComparison')))
    expect(state().workflowStep).toBe('step1a_compare')
  })

  it('shows no warning and an enabled button once the comparison exists', () => {
    resetStore({ selectedRQs: ['Alpha?', 'Beta?'], comparisonResult: comparison })
    renderStep(<Step1B />)
    expect(screen.queryByText(msg('steps.step1B.needsComparison'))).not.toBeInTheDocument()
    expect(button(/Gerar ou refazer pergunta final|Generate or redo final question/)).toBeEnabled()
  })
})

describe('Step 2 - search design and retrieval', () => {
  const searchApi = (articles: unknown[]) => () =>
    jsonResponse({ ok: true, data: { articles, page: 1, hasNextPage: false, totalResults: articles.length } })

  it('is locked until the final question is approved', () => {
    resetStore({ finalResearchQuestion: { ...approvedQuestion, approvedByUser: false } })
    renderStep(<Step2Search />)
    expect(button(msg('steps.step2.generateButton'))).toBeDisabled()
    expect(screen.getByText(msg('steps.step2.locked'))).toBeInTheDocument()
  })

  it('stores the design (accepting alternative key names) and retrieves from all seven providers', async () => {
    resetStore({ finalResearchQuestion: approvedQuestion })
    const api = mockFetch({
      ai: () => aiOk({ keywords: ['co2'], booleanQuery: 'co2 AND reefs', searchStrings: [{ database: 'Scopus', query: 'co2 AND reefs' }] }),
      search: searchApi([article('a1'), article('a2')]),
    })
    renderStep(<Step2Search />)
    fireEvent.click(button(msg('steps.step2.generateButton')))

    await waitFor(() => expect(state().searchDesign?.booleanQuery).toBe('co2 AND reefs'))
    await waitFor(() => expect(api.search()).toHaveLength(7))
    expect(api.search().map((c) => c.body.provider).sort()).toEqual(['arxiv', 'crossref', 'doaj', 'openaire', 'openalex_pt', 'pubmed', 'semantic_scholar'])
    await waitFor(() => expect(state().searchArticles.map((a) => a.id)).toEqual(['a1', 'a2'])) // merged & de-duplicated across providers
    expect(api.ai()[0].body).toMatchObject({ promptId: 'step2', rq: approvedQuestion.question })
  })

  it('keeps going when one provider is rate limited and explains it as a notice, not an error', async () => {
    resetStore({ finalResearchQuestion: approvedQuestion })
    mockFetch({
      ai: () => aiOk({ keywords: ['co2'], boolean_query: 'co2 AND reefs', search_strings: [{ database: 'X', query: 'co2 AND reefs' }] }),
      search: (body) =>
        body.provider === 'semantic_scholar'
          ? jsonResponse({ ok: false, error: 'failed', details: 'Semantic Scholar search failed (429): Too Many Requests' }, 500)
          : jsonResponse({ ok: true, data: { articles: [article(`${body.provider}-1`)], page: 1, hasNextPage: false, totalResults: 1 } }),
    })
    renderStep(<Step2Search />)
    fireEvent.click(button(msg('steps.step2.generateButton')))

    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent(/6 de 7 fornecedores/)
    expect(notice).toHaveTextContent(/Semantic Scholar \(limite de pedidos/)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await waitFor(() => expect(state().searchArticles).toHaveLength(6))
  })

  it('offers the Portuguese-focused and the open-access multilingual sources in the provider menu', () => {
    resetStore({ finalResearchQuestion: approvedQuestion, searchDesign, searchArticles: [article('a1')], selectedSearchArticleIds: ['a1'] })
    renderStep(<Step2Search />)
    const options = screen.getAllByRole('option').map((option) => option.textContent)
    expect(options).toEqual(expect.arrayContaining([expect.stringMatching(/OpenAlex · Português/), expect.stringMatching(/DOAJ/)]))
  })

  it('rejects an incomplete design and keeps the previous one', async () => {
    resetStore({ finalResearchQuestion: approvedQuestion })
    mockFetch({ ai: () => aiOk({ keywords: ['x'], boolean_query: '' }) })
    renderStep(<Step2Search />)
    fireEvent.click(button(msg('steps.step2.generateButton')))
    expect(await screen.findByText(/incompleto|incomplete/i)).toBeInTheDocument()
    expect(state().searchDesign).toBeNull()
  })

  it('selects, clears and filters retrieved articles, and gates the next step on a selection', async () => {
    const many = Array.from({ length: 12 }, (_, i) => article(`a${i}`, { title: `Reef paper ${i}` }))
    resetStore({ finalResearchQuestion: approvedQuestion, searchDesign, searchArticles: many, selectedSearchArticleIds: ['a0'] })
    renderStep(<Step2Search />)
    expect(screen.getAllByText(/Reef paper \d+/)).toHaveLength(10)
    fireEvent.click(screen.getByRole('button', { name: /Limpar sele|Clear selection/ }))
    expect(state().selectedSearchArticleIds).toEqual([])
    expect(button(msg('steps.step2.continueButton'))).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /Selecionar todos|Select all/ }))
    expect(state().selectedSearchArticleIds).toHaveLength(12)
    fireEvent.change(screen.getByPlaceholderText(/Filtrar por|Filter by/), { target: { value: 'paper 11' } })
    expect(screen.getAllByText(/Reef paper \d+/)).toHaveLength(1)
    fireEvent.click(button(msg('steps.step2.continueButton')))
    expect(state().workflowStep).toBe('step3_evidence_extraction')
  })
})

describe('Step 3 - evidence extraction', () => {
  const extraction = { title: 'Extracted', source_type: 'paper', claim: 'A claim', methodology: 'm', findings: ['x'], limitations: ['y'], relevance_score: 5, citation: 'Doe, 2021' }
  const ready = (over: Record<string, unknown> = {}) =>
    resetStore({ finalResearchQuestion: approvedQuestion, searchDesign, searchArticles: [article('a1')], selectedSearchArticleIds: ['a1'], ...over })

  it('analyses a retrieved article, links the record to it and marks it analysed', async () => {
    ready()
    const api = mockFetch({ ai: () => aiOk(extraction) })
    renderStep(<Step3Evidence />)
    fireEvent.click(button(msg('steps.step3.analyzeButton')))
    await waitFor(() => expect(state().evidenceRecords).toHaveLength(1))
    expect(state().evidenceRecords[0]).toMatchObject({ title: 'Extracted', claim: 'A claim', sourceArticleId: 'a1', sourceProvider: 'crossref', relevanceScore: 5 })
    expect(api.ai()[0].body).toMatchObject({ promptId: 'step4' })
    expect(api.ai()[0].body.source).toContain('Title: Article a1')
    expect(await screen.findByText(/Analisado|Analysed/)).toBeInTheDocument()
    expect(state().interactions.at(-1)).toMatchObject({ stepId: 'step3_evidence_extraction', success: true })
  })

  it('analyses pasted text manually and clears the box', async () => {
    ready({ searchArticles: [], selectedSearchArticleIds: [] })
    mockFetch({ ai: () => aiOk(extraction) })
    renderStep(<Step3Evidence />)
    const box = screen.getByPlaceholderText(msg('steps.step3.manualPlaceholder'))
    fireEvent.change(box, { target: { value: 'Some pasted abstract.' } })
    fireEvent.click(button(msg('steps.step3.analyzeManual')))
    await waitFor(() => expect(state().evidenceRecords).toHaveLength(1))
    expect(box).toHaveValue('')
  })

  it('does not store an extraction without findings and logs the failure', async () => {
    ready()
    mockFetch({ ai: () => aiOk({ ...extraction, findings: [] }) })
    renderStep(<Step3Evidence />)
    fireEvent.click(button(msg('steps.step3.analyzeButton')))
    expect(await screen.findByText(/incompleta|incomplete/i)).toBeInTheDocument()
    expect(state().evidenceRecords).toHaveLength(0)
    expect(state().interactions.at(-1)).toMatchObject({ success: false })
  })

  it('is locked without an approved question and search design', () => {
    resetStore({ searchArticles: [article('a1')] })
    renderStep(<Step3Evidence />)
    expect(button(msg('steps.step3.analyzeButton'))).toBeDisabled()
  })
})

describe('Step 5 - source selection (CRAAP)', () => {
  beforeEach(() => resetStore({ evidenceRecords: [evidenceRecord()], searchArticles: [article('a1')] }))

  it('needs at least 3 CRAAP criteria before a source can be confirmed, then saves the selection', () => {
    renderStep(<Step5SourceSelection />)
    const save = button(new RegExp(msg('steps.step5_source_selection.continueButton')))
    expect(save).toBeDisabled()
    expect(button(msg('steps.step5_source_selection.scoreToConfirm'))).toBeDisabled()

    const boxes = screen.getAllByRole('checkbox')
    expect(boxes).toHaveLength(5)
    boxes.slice(0, 2).forEach((box) => fireEvent.click(box))
    expect(button(msg('steps.step5_source_selection.scoreToConfirm'))).toBeDisabled()
    fireEvent.click(boxes[2])
    fireEvent.click(button(msg('steps.step5_source_selection.confirmButton')))
    expect(button(msg('steps.step5_source_selection.confirmedButton'))).toBeInTheDocument()

    fireEvent.click(save)
    expect(state().selectedSearchArticleIds).toEqual(['e1'])
    expect(state().workflowStep).toBe('step4_knowledge_structure')
  })
})

describe('Step 4 - knowledge structure', () => {
  const ready = (over: Record<string, unknown> = {}) =>
    resetStore({ finalResearchQuestion: approvedQuestion, evidenceRecords: [evidenceRecord()], ...over })

  it('is locked without evidence', () => {
    resetStore({ finalResearchQuestion: approvedQuestion })
    renderStep(<Step4Structure />)
    expect(button(/Gerar ou refazer estrutura|Generate or redo knowledge structure/)).toBeDisabled()
  })

  it('stores a normalised structure and draws the concept map', async () => {
    ready()
    const api = mockFetch({
      ai: () => aiOk({
        main_topics: ['Climate'], key_subtopics: ['Warming'], concept_map_nodes: ['CO2', 'Warming'],
        edges: [{ source: 'CO2', target: 'Warming', label: 'causes' }], mind_map_markdown: '- RQ\n  - Climate',
      }),
    })
    renderStep(<Step4Structure />)
    fireEvent.click(button(/Gerar ou refazer estrutura|Generate or redo knowledge structure/))
    await waitFor(() => expect(state().knowledgeStructure).not.toBeNull())
    expect(state().knowledgeStructure).toMatchObject({
      topics: ['Climate'], conceptMapEdges: [{ from: 'CO2', to: 'Warming', relation: 'causes' }],
    })
    expect(api.ai()[0].body).toMatchObject({ promptId: 'knowledge_structure', stage: 1 })
    expect(await screen.findByRole('img', { name: 'Concept map' })).toBeInTheDocument()
  })

  it('derives topics from the evidence when the model returns nothing usable', async () => {
    ready()
    mockFetch({ ai: () => aiOk({}) })
    renderStep(<Step4Structure />)
    fireEvent.click(button(/Gerar ou refazer estrutura|Generate or redo knowledge structure/))
    await waitFor(() => expect(state().knowledgeStructure?.topics).toEqual(['CO2 raises temperature']))
  })

  it('opens the mind map popup once a structure exists', async () => {
    ready({ knowledgeStructure })
    renderStep(<Step4Structure />)
    fireEvent.click(button(/popup do mind map|mind map popup/i))
    expect(await screen.findByText(/Preview do mind map|Mind map preview/)).toBeInTheDocument()
    expect(screen.getByText('PlantUML mind map')).toBeInTheDocument()
  })
})

describe('Step 8 - glossary', () => {
  beforeEach(() => resetStore({ knowledgeStructure }))

  it('adds, edits, removes and saves terms into the knowledge structure', async () => {
    const user = userEvent.setup()
    renderStep(<Step8Glossary />)
    expect(screen.getByText('Bleaching')).toBeInTheDocument()

    const add = button(msg('steps.step8.addButton'))
    expect(add).toBeDisabled()
    await user.type(screen.getByPlaceholderText(msg('steps.step8.termPlaceholder')), 'Albedo')
    await user.type(screen.getByPlaceholderText(msg('steps.step8.defPlaceholder')), 'Reflectivity of a surface')
    await user.click(add)
    expect(screen.getByText('Albedo')).toBeInTheDocument()

    await user.click(screen.getAllByTitle('Remove')[0])
    expect(screen.queryByText('Bleaching')).not.toBeInTheDocument()

    await user.click(button(new RegExp(msg('steps.step8.continueButton'))))
    expect(state().knowledgeStructure?.glossary).toEqual([{ term: 'Albedo', definition: 'Reflectivity of a surface' }])
    expect(state().workflowStep).toBe('step9_explanation')
  })

  it('cannot save an empty glossary', async () => {
    const user = userEvent.setup()
    renderStep(<Step8Glossary />)
    await user.click(screen.getAllByTitle('Remove')[0])
    expect(button(new RegExp(msg('steps.step8.continueButton')))).toBeDisabled()
  })
})

describe('Step 9 - explanation', () => {
  const valid = {
    outline: ['Intro', 'Evidence'], argument_core: 'Warming drives bleaching', evidence_references: ['Silva, 2020'],
    bibliography: ['Silva, 2020. Paper.'], open_issues: ['Long-term data'],
  }
  const ready = () =>
    resetStore({ finalResearchQuestion: approvedQuestion, knowledgeStructure, evidenceRecords: [evidenceRecord()], searchArticles: [article('a1')] })

  it('is locked until question, structure and evidence exist', () => {
    resetStore()
    renderStep(<Step5Explanation />)
    expect(screen.getByText(msg('steps.step5.locked'))).toBeInTheDocument()
    expect(button(msg('steps.step5.generateButton'))).toBeDisabled()
  })

  it('stores a validated draft with bibliography and open issues', async () => {
    ready()
    const api = mockFetch({ ai: () => aiOk(valid) })
    renderStep(<Step5Explanation />)
    fireEvent.click(button(msg('steps.step5.generateButton')))
    await waitFor(() => expect(state().explanationDraft).not.toBeNull())
    expect(state().explanationDraft).toMatchObject({
      outline: ['Intro', 'Evidence'], argumentCore: 'Warming drives bleaching', bibliography: ['Silva, 2020. Paper.'], openIssues: ['Long-term data'],
    })
    const body = api.ai()[0].body
    expect(body).toMatchObject({ promptId: 'step9', stage: 2, audience: 'expert' })
    expect(body.bibliographySeed).toEqual(['Silva, 2020'])
  })

  it('rejects an explanation without bibliography (no draft is stored)', async () => {
    ready()
    mockFetch({ ai: () => aiOk({ ...valid, bibliography: [] }) })
    renderStep(<Step5Explanation />)
    fireEvent.click(button(msg('steps.step5.generateButton')))
    expect(await screen.findByText(/incompleta|incomplete/i, undefined, { timeout: 6000 })).toBeInTheDocument()
    expect(state().explanationDraft).toBeNull()
  })
})
