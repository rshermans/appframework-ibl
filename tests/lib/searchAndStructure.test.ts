import { describe, expect, it } from 'vitest'
import { isUsableRawSearchDesign, normalizeSearchDesign } from '@/lib/searchDesign'
import { PROVIDER_SEQUENCE, mergeUniqueArticles, providerLabel } from '@/lib/searchProviders'
import { normalizeKnowledgeStructure } from '@/lib/knowledgeStructure'
import type { SearchArticle } from '@/types/research-workflow'

describe('Step 2 search design normalisation', () => {
  it('accepts snake_case, camelCase and alternative key spellings', () => {
    const variants = [
      { boolean_query: 'a AND b', search_strings: [{ database: 'X', query: 'a AND b' }] },
      { booleanQuery: 'a AND b', searchStrings: [{ database: 'X', query: 'a AND b' }] },
      { search_query: 'a AND b', strings: [{ database: 'X', query: 'a AND b' }] },
      { query: 'a AND b', search_strings: [{ database: 'X', query: 'a AND b' }] },
    ]
    for (const raw of variants) {
      expect(isUsableRawSearchDesign(raw)).toBe(true)
      expect(normalizeSearchDesign(raw)).toMatchObject({ booleanQuery: 'a AND b', searchStrings: [{ database: 'X' }] })
    }
  })

  it('rejects outputs without a query or without search strings', () => {
    expect(isUsableRawSearchDesign({ boolean_query: '  ', search_strings: [{ database: 'X', query: 'q' }] })).toBe(false)
    expect(isUsableRawSearchDesign({ boolean_query: 'q', search_strings: [] })).toBe(false)
    expect(isUsableRawSearchDesign(null)).toBe(false)
  })

  it('falls back to keywords for the query and builds a general search string', () => {
    const design = normalizeSearchDesign({ keywords: ['coral', 'warming'] })
    expect(design.booleanQuery).toBe('coral AND warming')
    expect(design.searchStrings).toEqual([{ database: 'General', query: 'coral AND warming' }])
    expect(normalizeSearchDesign({}).searchStrings).toEqual([])
  })

  it('reads recommended databases from either spelling', () => {
    expect(normalizeSearchDesign({ recommended_databases: ['Scopus'] }).recommendedDatabases).toEqual(['Scopus'])
    expect(normalizeSearchDesign({ recommendedDatabases: ['WoS'] }).recommendedDatabases).toEqual(['WoS'])
  })
})

describe('search providers', () => {
  it('labels providers and lists them all in a fixed order', () => {
    expect(providerLabel('arxiv')).toBe('arXiv')
    expect(providerLabel('semantic_scholar')).toBe('Semantic Scholar')
    expect(PROVIDER_SEQUENCE).toHaveLength(7)
    expect(new Set(PROVIDER_SEQUENCE).size).toBe(PROVIDER_SEQUENCE.length)
    expect(PROVIDER_SEQUENCE[0]).toBe('crossref')
  })

  it('mergeUniqueArticles de-duplicates by id (later wins) keeping first-seen order', () => {
    const a = (id: string, title: string) => ({ id, title }) as SearchArticle
    const merged = mergeUniqueArticles([a('1', 'old'), a('2', 'two')], [a('1', 'new'), a('3', 'three')])
    expect(merged.map((x) => `${x.id}:${x.title}`)).toEqual(['1:new', '2:two', '3:three'])
  })
})

describe('Step 4 knowledge structure normalisation', () => {
  const evidence = [{ title: 'Paper A', claim: 'Claim A' }, { title: 'Paper B', claim: 'Claim B' }]

  it('maps snake_case output and normalises edge key spellings', () => {
    const result = normalizeKnowledgeStructure(
      {
        main_topics: ['Climate', 'Reefs'], key_subtopics: ['Warming'],
        concept_map_nodes: ['CO2', 'Warming'],
        edges: [{ source: 'CO2', target: 'Warming', label: 'causes' }, { from: '', to: 'X' }],
        mind_map_markdown: '- RQ\n  - Climate',
        terms: [{ term: 'Bleaching', definition: 'Loss of algae' }, { term: '', definition: 'x' }],
      },
      evidence
    )
    expect(result.topics).toEqual(['Climate', 'Reefs'])
    expect(result.subtopics).toEqual(['Warming'])
    expect(result.conceptMapEdges).toEqual([{ from: 'CO2', to: 'Warming', relation: 'causes' }])
    expect(result.mindMapMarkdown).toBe('- RQ\n  - Climate')
    expect(result.glossary).toEqual([{ term: 'Bleaching', definition: 'Loss of algae' }])
    expect(result.conceptMapNodes).toEqual(expect.arrayContaining(['CO2', 'Warming', 'Climate', 'Reefs']))
  })

  it('splits comma/newline separated strings into arrays', () => {
    expect(normalizeKnowledgeStructure({ topics: 'a, b\nc;d' as unknown as string[] }, evidence).topics).toEqual(['a', 'b', 'c', 'd'])
  })

  it('derives topics from nodes, then from evidence claims, when the model omitted them', () => {
    const nodes = Array.from({ length: 8 }, (_, i) => `n${i}`)
    expect(normalizeKnowledgeStructure({ concept_map_nodes: nodes }, evidence).topics).toEqual(nodes.slice(0, 6))
    expect(normalizeKnowledgeStructure({}, evidence).topics).toEqual(['Claim A', 'Claim B'])
  })
})
