import type { EvidenceRecord, KnowledgeStructure } from '@/types/research-workflow'

type RawEdge = { from?: string; to?: string; relation?: string; source?: string; target?: string; label?: string }

export interface RawKnowledgeStructure {
        topics?: string[]
        main_topics?: string[]
        subtopics?: string[]
        key_subtopics?: string[]
        concept_map_nodes?: string[]
        conceptMapNodes?: string[]
        nodes?: string[]
        concept_map_edges?: RawEdge[]
        conceptMapEdges?: Array<{ from?: string; to?: string; relation?: string; source?: string; target?: string; label?: string }>
        edges?: Array<{ from?: string; to?: string; relation?: string; source?: string; target?: string; label?: string }>
        mind_map_markdown?: string
        mindMapMarkdown?: string
        glossary?: KnowledgeStructure['glossary']
        terms?: KnowledgeStructure['glossary']
      }

/**
 * Turns the model's JSON into a KnowledgeStructure. Accepts snake_case and camelCase keys,
 * derives topics/nodes from other fields when the model omitted them, and normalises edges.
 */
export function normalizeKnowledgeStructure(
  parsed: RawKnowledgeStructure | null | undefined,
  evidenceRecords: Array<Pick<EvidenceRecord, 'claim' | 'title'>>
): KnowledgeStructure {

  const normalizeStringArray = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter(Boolean)
    }

    if (typeof value === 'string') {
      return value
        .split(/[\n,;]+/)
        .map((entry) => entry.trim())
        .filter(Boolean)
    }

    return []
  }

  const normalizedTopics = normalizeStringArray(parsed?.topics ?? parsed?.main_topics)
  const normalizedSubtopics = normalizeStringArray(parsed?.subtopics ?? parsed?.key_subtopics)
  const normalizedNodes = normalizeStringArray(
    parsed?.concept_map_nodes ?? parsed?.conceptMapNodes ?? parsed?.nodes
  )

  // Derive topics from nodes/edges if model omitted the topics field
  const derivedTopicsFromNodes = normalizedTopics.length === 0 && normalizedNodes.length > 0
    ? normalizedNodes.slice(0, 6)
    : normalizedTopics

  // Derive topics from evidence records as last resort
  const lastResortTopics = derivedTopicsFromNodes.length === 0
    ? evidenceRecords
        .map((r: { claim?: string; title?: string }) => r.claim || r.title || '')
        .filter(Boolean)
        .slice(0, 5)
    : derivedTopicsFromNodes

  const rawEdges: Array<{
    from?: string
    to?: string
    relation?: string
    source?: string
    target?: string
    label?: string
  }> = Array.isArray(parsed?.concept_map_edges)
    ? parsed.concept_map_edges
    : Array.isArray(parsed?.conceptMapEdges)
      ? parsed.conceptMapEdges
      : Array.isArray(parsed?.edges)
        ? parsed.edges
        : []

  const normalizedEdges = rawEdges
    .map((edge) => ({
      from: (edge.from || edge.source || '').trim(),
      to: (edge.to || edge.target || '').trim(),
      relation: (edge.relation || edge.label || '').trim(),
    }))
    .filter((edge) => edge.from && edge.to)

  const derivedNodes = Array.from(
    new Set([
      ...normalizedNodes,
      ...lastResortTopics,
      ...normalizedSubtopics,
      ...normalizedEdges.flatMap((edge) => [edge.from, edge.to]),
    ])
  ).filter(Boolean)

  const finalDerivedNodes = derivedNodes.length === 0
    ? lastResortTopics
    : derivedNodes

  const normalizedGlossary = Array.isArray(parsed?.glossary)
    ? parsed.glossary
    : Array.isArray(parsed?.terms)
      ? parsed.terms
      : []

  const nextStructure: KnowledgeStructure = {
    topics: lastResortTopics,
    subtopics: normalizedSubtopics,
    conceptMapNodes: finalDerivedNodes,
    conceptMapEdges: normalizedEdges,
    mindMapMarkdown:
      typeof parsed?.mind_map_markdown === 'string'
        ? parsed.mind_map_markdown
        : typeof parsed?.mindMapMarkdown === 'string'
          ? parsed.mindMapMarkdown
          : '',
    glossary: Array.isArray(normalizedGlossary)
      ? normalizedGlossary
          .map((entry: { term?: string; definition?: string }) => ({
            term: entry.term || '',
            definition: entry.definition || '',
          }))
          .filter((entry: { term: string; definition: string }) => entry.term && entry.definition)
      : [],
  }

  return nextStructure
}
