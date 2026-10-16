import type { EvidenceRecord, SearchArticle } from '@/types/research-workflow'
import { buildReviewedReferences, type ReviewedReference } from '@/lib/explanationReferences'

/** Shown on every simulation: these are illustrations for learning, never a submission-ready text. */
export function simulationNotice(pt: boolean): string {
  return pt
    ? 'Simulação ilustrativa, para fins pedagógicos da formação sobre escrita com IA generativa. Não é um texto final: leia, questione e reescreva por palavras suas.'
    : 'Illustrative simulation for the pedagogical purposes of the training on writing with generative AI. It is not a final text: read it, question it and rewrite it in your own words.'
}

export interface AbstractSimulation {
  title: string
  abstract: string
  keywords: string[]
  teachingNote: string
}

/** Tolerant: models sometimes wrap the object or rename fields. */
export function parseAbstractSimulation(raw: unknown): AbstractSimulation {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
  const abstract = text(source.abstract) || text(source.summary) || text(source.resumo)
  if (!abstract) throw new Error('The AI did not return an abstract.')
  const keywords = Array.isArray(source.keywords) ? source.keywords.map(text).filter(Boolean).slice(0, 6) : []
  return {
    title: text(source.title) || text(source.titulo),
    abstract,
    keywords,
    teachingNote: text(source.teachingNote) || text(source.teaching_note) || text(source.note),
  }
}

/** Alphabetical, de-duplicated "References" section, the way a paper lists them. */
export function buildReferenceSection(
  evidenceRecords: EvidenceRecord[],
  searchArticles: SearchArticle[]
): ReviewedReference[] {
  return buildReviewedReferences(evidenceRecords, searchArticles).sort((a, b) =>
    a.citation.localeCompare(b.citation, undefined, { sensitivity: 'base' })
  )
}

export function referenceSectionText(references: ReviewedReference[], pt: boolean): string {
  const heading = pt ? 'Referências' : 'References'
  const lines = references.map((reference) => {
    const link = reference.doiUrl || reference.articleUrl
    return link && !reference.citation.includes(link) ? `${reference.citation} ${link}` : reference.citation
  })
  return `${heading}\n\n${lines.join('\n\n')}`
}

export interface ThinkingPrompt {
  id: string
  text: string
}

/** Questions that make the learner interrogate their own central thesis. */
export function thesisPrompts(pt: boolean): ThinkingPrompt[] {
  return pt
    ? [
        { id: 'change', text: 'Que evidência nova mudaria ou enfraqueceria esta tese? Onde a procuraria?' },
        { id: 'objection', text: 'Qual seria a objeção mais forte que um cético faria? Como responderia, com que fonte?' },
        { id: 'scope', text: 'Em que condições (população, contexto, escala) esta tese deixa de ser válida?' },
      ]
    : [
        { id: 'change', text: 'What new evidence would change or weaken this thesis? Where would you look for it?' },
        { id: 'objection', text: 'What is the strongest objection a sceptic would raise? How would you answer it, with which source?' },
        { id: 'scope', text: 'Under which conditions (population, context, scale) does this thesis stop holding?' },
      ]
}

/** "What next?" prompts about where the research could go from here. */
export function nextResearchPrompts(pt: boolean): ThinkingPrompt[] {
  return pt
    ? [
        { id: 'vary', text: 'Se mudasse um elemento da pergunta (população, contexto, método), que nova pergunta surgiria?' },
        { id: 'method', text: 'Que método (revisão sistemática, estudo observacional, experiência, inquérito) responderia melhor ao que ficou por saber?' },
        { id: 'who', text: 'Quem poderia ajudar a avançar (colega, especialista, comunidade) e que pergunta lhe faria?' },
      ]
    : [
        { id: 'vary', text: 'If you changed one element of the question (population, context, method), what new question would appear?' },
        { id: 'method', text: 'Which method (systematic review, observational study, experiment, survey) would best answer what is still unknown?' },
        { id: 'who', text: 'Who could help move this forward (a peer, an expert, a community) and what would you ask them?' },
      ]
}
