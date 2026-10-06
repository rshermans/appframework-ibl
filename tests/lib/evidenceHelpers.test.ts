import { describe, expect, it } from 'vitest'
import {
  buildEvidenceRecord,
  buildRelatedQueryCandidates,
  buildSourcePayload,
  filterArticlesByText,
  filterEvidenceByText,
  isCompleteEvidenceExtraction,
  paginate,
  simplifyRelatedQuery,
  uniqueProviders,
} from '@/lib/evidenceHelpers'
import type { EvidenceRecord, SearchArticle } from '@/types/research-workflow'

const article = (over: Partial<SearchArticle> = {}): SearchArticle => ({
  id: 'a1', title: 'Coral bleaching under warming', authors: ['Silva', 'Costa'], year: 2020,
  abstract: 'Abstract text', provider: 'crossref', doi: '10.1/abc', url: 'https://x.org/a1', ...over,
} as SearchArticle)

describe('Step 3 evidence helpers', () => {
  it('buildSourcePayload includes metadata and a fallback abstract', () => {
    const payload = buildSourcePayload(article())
    expect(payload).toContain('Title: Coral bleaching under warming')
    expect(payload).toContain('Authors: Silva, Costa')
    expect(payload).toContain('DOI: 10.1/abc')
    expect(buildSourcePayload(article({ abstract: '', authors: [], doi: undefined, year: undefined }))).toMatch(
      /Unknown authors[\s\S]*DOI: N\/A[\s\S]*No abstract available\./
    )
  })

  it('simplifyRelatedQuery strips boolean syntax and punctuation but keeps accents', () => {
    expect(simplifyRelatedQuery('("coral reefs" AND (bleaching OR "acidificação")) NOT fish')).toBe(
      'coral reefs bleaching acidificação fish'
    )
  })

  it('uniqueProviders puts the preferred provider first without duplicates', () => {
    const list = uniqueProviders('arxiv')
    expect(list[0]).toBe('arxiv')
    expect(new Set(list).size).toBe(list.length)
    expect(list).toHaveLength(5)
  })

  it('buildRelatedQueryCandidates is ordered, de-duplicated and skips blanks', () => {
    const candidates = buildRelatedQueryCandidates('reef AND coral', 'Why do reefs bleach?', [article()], 'custom words')
    expect(candidates[0]).toBe('custom words')
    expect(candidates[1]).toBe('reef AND coral')
    expect(candidates).toContain('reef coral')
    expect(candidates).toContain('Why do reefs bleach?')
    expect(new Set(candidates).size).toBe(candidates.length)
    expect(buildRelatedQueryCandidates('q', undefined, [], '')).toEqual(['q'])
  })

  it('paginate clamps the page and slices', () => {
    const items = Array.from({ length: 25 }, (_, i) => i)
    expect(paginate(items, 1).pageItems).toHaveLength(10)
    expect(paginate(items, 3).pageItems).toEqual([20, 21, 22, 23, 24])
    expect(paginate(items, 99).page).toBe(3)
    expect(paginate([], 1)).toMatchObject({ totalPages: 1, pageItems: [] })
  })

  it('filters articles by title or author and evidence by title or claim', () => {
    const list = [article(), article({ id: 'a2', title: 'Fish stocks', authors: ['Pereira'] })]
    expect(filterArticlesByText(list, 'pereira').map((a) => a.id)).toEqual(['a2'])
    expect(filterArticlesByText(list, '  ')).toHaveLength(2)
    const records = [
      { id: 'e1', title: 'T1', claim: 'CO2 warms' }, { id: 'e2', title: 'Other', claim: 'Fish decline' },
    ] as EvidenceRecord[]
    expect(filterEvidenceByText(records, 'co2').map((r) => r.id)).toEqual(['e1'])
    expect(filterEvidenceByText(records, 'other').map((r) => r.id)).toEqual(['e2'])
  })

  it('an extraction is complete only with a claim and at least one non-empty finding', () => {
    expect(isCompleteEvidenceExtraction({ claim: 'c', findings: ['f'] })).toBe(true)
    expect(isCompleteEvidenceExtraction({ claim: ' ', findings: ['f'] })).toBe(false)
    expect(isCompleteEvidenceExtraction({ claim: 'c', findings: ['', ''] })).toBe(false)
    expect(isCompleteEvidenceExtraction(null)).toBe(false)
  })

  it('buildEvidenceRecord maps source type, links the article and defaults safely', () => {
    const record = buildEvidenceRecord(
      { title: 'T', source_type: 'report', claim: 'C', findings: ['f'], relevance_score: 4, citation: 'X, 2020' },
      article(),
      'evidence-1'
    )
    expect(record).toMatchObject({
      id: 'evidence-1', sourceType: 'report', sourceArticleId: 'a1', sourceProvider: 'crossref',
      sourceArticleTitle: 'Coral bleaching under warming', relevanceScore: 4, citation: 'X, 2020',
    })
    const bare = buildEvidenceRecord({ source_type: 'blog', claim: 'C', findings: ['f'] })
    expect(bare.sourceType).toBe('unknown')
    expect(bare.title).toBe('Untitled source')
    expect(bare.relevanceScore).toBe(0)
    expect(bare.limitations).toEqual([])
  })
})
