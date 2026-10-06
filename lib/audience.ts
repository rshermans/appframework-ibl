export type Audience = 'general' | 'school' | 'academic'

export const AUDIENCES: readonly Audience[] = ['general', 'school', 'academic']

export function normalizeAudience(value: unknown): Audience {
  return value === 'school' || value === 'academic' ? value : 'general'
}

export const AUDIENCE_LABELS: Record<Audience, { pt: string; en: string }> = {
  general: { pt: 'Público geral', en: 'General public' },
  school: { pt: 'Escola (12-18 anos)', en: 'School (12-18 yrs)' },
  academic: { pt: 'Académico', en: 'Academic' },
}

const AUDIENCE_GUIDANCE: Record<Audience, { pt: string; en: string }> = {
  general: {
    pt: '- Linguagem simples e quotidiana; explique qualquer termo técnico na primeira vez que aparece.\n- Use analogias e exemplos do dia a dia; comece pelo "porque é que isto importa".\n- Frases curtas; números com comparações fáceis de visualizar.',
    en: '- Plain, everyday language; explain any technical term the first time it appears.\n- Use analogies and everyday examples; open with "why this matters".\n- Short sentences; numbers paired with easy-to-picture comparisons.',
  },
  school: {
    pt: '- Público de 12 a 18 anos: tom curioso e direto, sem infantilizar.\n- Abra com uma pergunta ou facto surpreendente; use exemplos próximos da vida dos jovens.\n- Inclua uma atividade, desafio ou pergunta final para os alunos discutirem.\n- Evite jargão; quando for inevitável, defina-o numa frase.',
    en: '- Audience aged 12-18: curious, direct tone without talking down.\n- Open with a question or surprising fact; use examples close to young people\'s lives.\n- Include an activity, challenge or closing question for students to discuss.\n- Avoid jargon; when unavoidable, define it in one sentence.',
  },
  academic: {
    pt: '- Público académico: use terminologia técnica correta e seja preciso nas afirmações.\n- Indique o desenho do estudo, a amostra e as limitações de cada resultado.\n- Cite as fontes no formato Autor (Ano) e distinga evidência forte de evidência preliminar.\n- Evite simplificações que alterem o sentido dos resultados.',
    en: '- Academic audience: use correct technical terminology and be precise in claims.\n- State study design, sample and limitations for each result.\n- Cite sources as Author (Year) and distinguish strong from preliminary evidence.\n- Avoid simplifications that change the meaning of findings.',
  },
}

export function getAudienceGuidance(audience: Audience, locale: 'pt-PT' | 'en'): string {
  return AUDIENCE_GUIDANCE[audience][locale === 'pt-PT' ? 'pt' : 'en']
}

const INTEGRITY_RULES = {
  pt: '- Use apenas afirmações que estejam nas evidências fornecidas; não acrescente factos novos.\n- Diga quando um resultado é incerto, preliminar ou limitado a um contexto.\n- Não transforme correlação em causalidade nem exagere a dimensão dos efeitos.\n- Mantenha a referência à fonte junto de cada afirmação-chave.',
  en: '- Use only claims present in the supplied evidence; do not add new facts.\n- Say when a result is uncertain, preliminary or limited to a context.\n- Do not turn correlation into causation or overstate effect sizes.\n- Keep the source reference next to every key claim.',
}

export function getIntegrityRules(locale: 'pt-PT' | 'en'): string {
  return INTEGRITY_RULES[locale === 'pt-PT' ? 'pt' : 'en']
}
