export interface RubricDimension {
  id: string
  label: string
  desc: { pt: string; en: string }
  /** What a 1, a 3 and a 5 look like, so a self-rating is anchored in something concrete. */
  levels: { pt: [string, string, string]; en: [string, string, string] }
}

export const RUBRIC_DIMENSIONS: RubricDimension[] = [
  { id: 'R1', label: 'R1: Research Question Quality', desc: { pt: 'Testabilidade, especificidade e relevância', en: 'Testability, specificity and relevance' },
    levels: { pt: ['Pergunta vaga ou impossível de testar', 'Razoável, mas ainda ampla', 'Específica, testável e relevante'], en: ['Vague or untestable', 'Reasonable but still broad', 'Specific, testable and relevant'] } },
  { id: 'R2', label: 'R2: Search Strategy', desc: { pt: 'Abrangência e rigor da pesquisa', en: 'Breadth and rigor of the search' },
    levels: { pt: ['Pesquisa ocasional numa só fonte', 'Algumas bases e termos', 'Estratégia documentada: várias bases, termos e filtros'], en: ['Occasional search in one source', 'A few databases and terms', 'Documented strategy: several databases, terms and filters'] } },
  { id: 'R3', label: 'R3: Evidence Quality', desc: { pt: 'Qualidade e diversidade das fontes', en: 'Quality and diversity of sources' },
    levels: { pt: ['Poucas fontes, sem critério', 'Fontes variadas, critério parcial', 'Fontes de qualidade, avaliadas (CRAAP) e diversas'], en: ['Few sources, no criteria', 'Varied sources, partial criteria', 'Quality sources, assessed (CRAAP) and diverse'] } },
  { id: 'R4', label: 'R4: Synthesis & Structure', desc: { pt: 'Coerência da estrutura de conhecimento', en: 'Knowledge structure coherence' },
    levels: { pt: ['Ideias soltas', 'Tópicos organizados', 'Estrutura coerente com relações claras'], en: ['Loose ideas', 'Organised topics', 'Coherent structure with clear relations'] } },
  { id: 'R5', label: 'R5: Scientific Explanation', desc: { pt: 'Clareza e rigor da explicação', en: 'Clarity and rigor of explanation' },
    levels: { pt: ['Resumo sem argumento', 'Argumento com lacunas', 'Argumento claro, ancorado na evidência e com limitações'], en: ['Summary without an argument', 'Argument with gaps', 'Clear, evidence-anchored argument with limitations'] } },
  { id: 'R6', label: 'R6: Multimodal Communication', desc: { pt: 'Qualidade e fidelidade dos produtos de comunicação', en: 'Quality and fidelity of the communication outputs' },
    levels: { pt: ['Nenhum produto', 'Um produto básico', 'Produtos adequados ao público e fiéis à evidência'], en: ['No output', 'One basic output', 'Outputs suited to the audience and faithful to the evidence'] } },
  { id: 'R7', label: 'R7: Reflection Quality', desc: { pt: 'Profundidade e honestidade da reflexão', en: 'Depth and honesty of reflection' },
    levels: { pt: ['Sem reflexão', 'Reflexão apenas descritiva', 'Reflexão honesta sobre decisões e dificuldades'], en: ['No reflection', 'Descriptive reflection only', 'Honest reflection on decisions and difficulties'] } },
  { id: 'R8', label: 'R8: Ethical AI Use', desc: { pt: 'Transparência, atribuição e controlo', en: 'Transparency, attribution, control' },
    levels: { pt: ['Uso de IA não declarado', 'Uso declarado em parte', 'Uso de IA transparente, verificado e decidido por mim'], en: ['AI use not disclosed', 'Partly disclosed', 'Transparent, verified AI use that I decided'] } },
]

export const RUBRIC_IDS = RUBRIC_DIMENSIONS.map((dimension) => dimension.id)

/** "R3: Evidence Quality" -> "R3" */
export function rubricIdFromLabel(label: string): string | null {
  const match = /^\s*(R[1-8])\b/i.exec(label)
  return match ? match[1].toUpperCase() : null
}
