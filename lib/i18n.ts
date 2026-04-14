export type Locale = 'pt-PT' | 'en'

type MessageTree = {
  [key: string]: string | MessageTree
}

const FALLBACK_LOCALE: Locale = 'pt-PT'

const messages: Record<Locale, MessageTree> = {
  'pt-PT': {
    app: {
      name: 'RELIA Research Wizard',
      description: 'Estrutura de investigação orientada por IA',
    },
    language: {
      label: 'Idioma',
      ptPT: 'Português PT',
      en: 'English',
    },
    home: {
      title: 'Assistente de Investigação',
      subtitle: 'Estrutura de investigação orientada por IA',
      topicLabel: 'Tópico de investigação',
      topicPlaceholder: 'O que gostarias de investigar?',
      startButton: 'Iniciar investigação',
      intro:
        'Define o tema, gera perguntas de investigação, compara opções e constrói uma estrutura de evidência em português europeu.',
    },
    stage1: {
      title: 'Etapa 1: Perguntar e Investigar',
      intro:
        'Gera, seleciona, compara, sintetiza e operacionaliza uma pergunta de investigação rigorosa antes de avançar para o trabalho com evidência.',
    },
    workflow: {
      step0_generate: {
        badge: 'Etapa 0',
        label: 'Candidate Research Questions',
        description: 'Gerar um conjunto limitado de candidatos a perguntas de investigação.',
      },
      step1_select: {
        badge: 'Etapa 1',
        label: 'Final RQ Candidate Selection',
        description: 'Seleciona até três candidatos para comparação posterior.',
      },
      step1a_compare: {
        badge: 'Etapa 1A',
        label: 'Final RQ Synthesis Support',
        description: 'Comparação assistida para apoiar a síntese final da pergunta de investigação.',
      },
      step1b_synthesize: {
        badge: 'Etapa 1B',
        label: 'Epistemological Analysis & Final RQ Decision',
        description: 'Consolida a decisão final da pergunta e justificação metodológica.',
      },
      step2_search_design: {
        badge: 'Etapa 2',
        label: 'Search String Builder / Search Design',
        description: 'Transforma a pergunta final num plano de pesquisa reutilizável.',
      },
      step3_evidence_extraction: {
        badge: 'Etapa 4',
        label: 'Evidence Extractor',
        description: 'Extrai evidência de fontes externas para registos estruturados.',
      },
      step5_source_selection: {
        badge: 'Etapa 5',
        label: 'Source Selection & CRAAP Analysis',
        description: 'Avalia a credibilidade das fontes usando o método CRAAP.',
      },
      step4_knowledge_structure: {
        badge: 'Etapas 6-7',
        label: 'Topic/Subtopic Mapper + Mind Map',
        description: 'Organiza evidência em tópicos e gera estrutura conceptual visual.',
      },
      step8_glossary: {
        badge: 'Etapa 8',
        label: 'Scientific Glossary Builder',
        description: 'Constrói um glossário de termos científicos baseado na evidência.',
      },
      step5_explanation: {
        badge: 'Etapa 9',
        label: 'Scientific Explanation Scaffolder',
        description: 'Transforma o conhecimento estruturado num esboço de explicação científica.',
      },
    },
    common: {
      lockedStep2: 'Bloqueado até a pergunta final estar aprovada.',
      lockedStep3: 'Bloqueado até a pesquisa devolver pelo menos um artigo.',
      lockedStep4: 'Bloqueado até existir pelo menos um registo de evidência.',
      lockedStep5: 'Bloqueado até existir uma estrutura de conhecimento.',
      approved: 'Aprovado pela pessoa utilizadora',
      pendingApproval: 'A aguardar aprovação',
      noData: 'Sem dados disponíveis',
      unknownAuthors: 'Autores desconhecidos',
      noAbstract: 'Sem resumo disponível.',
      loading: 'A carregar...',
      provider: 'Fornecedor',
      audience: 'Público-alvo',
      ethicalTip: 'Dica ética',
      stageEthicalTip: 'Dica ética do estágio',
      optional: 'Opcional',
      step0Archived: 'A Etapa 0 foi arquivada na memória. Podes reabri-la se precisares.',
      reopen: 'Reabrir',
    },
    steps: {
      step0: {
        title: 'Etapa 0 - Gerar Perguntas de Investigação',
        topicLabel: 'Tópico de investigação',
        topicPlaceholder: "Ex.: 'Expressão génica no desenvolvimento neural'",
        generate: 'Gerar perguntas de investigação',
        generating: 'A gerar...',
        candidateTitle: 'Perguntas de investigação candidatas',
        candidateIntro: 'Analisa as opções abaixo antes de avançares.',
        typeLabel: 'Tipo',
        researchableLabel: 'Investigável?',
        challengesLabel: 'Desafios',
        databasesLabel: 'Bases de dados',
        scoreLabel: 'Pontuação IBL',
        continueButton: 'Continuar para a seleção',
        invalidTopic: 'Introduz um tópico.',
      },
      step1Select: {
        title: 'Etapa 1 - Selecionar até 3 perguntas',
        continueButton: 'Continuar',
      },
      step1A: {
        title: 'Etapa 1A - Comparar Perguntas de Investigação',
        quick: 'Rápida',
        advanced: 'Avançada',
        run: 'Executar análise',
        running: 'A analisar...',
        selectedTitle: 'Perguntas selecionadas',
        invalidSelection: 'Seleciona pelo menos duas perguntas antes de comparar.',
      },
      step1B: {
        title: 'Etapa 1B - Sintetizar a Pergunta Final',
        intro:
          'Este é o ponto de ancoragem do projeto. A IA propõe uma pergunta final, mas a decisão continua a ser tua.',
        recommendedTitle: 'Recomendação da comparação',
        selectedTitle: 'Perguntas selecionadas',
        noComparison: 'Ainda não existe uma comparação estruturada.',
        createButton: 'Criar pergunta final',
        creating: 'A sintetizar...',
        approveButton: 'Aprovar pergunta final',
        statusLabel: 'Estado',
        continueButton: 'Continuar para a Etapa 2',
        anchorNote: 'A Etapa 2 poderá usar esta pergunta como âncora canónica para o desenho da pesquisa.',
        invalidState: 'Executa a comparação antes de sintetizar a pergunta final.',
      },
      step2: {
        title: 'Etapa 2 - Desenho da pesquisa',
        intro:
          'Transforma a pergunta final aprovada em palavras-chave, cadeias booleanas, bases de dados e filtros.',
        currentQuestion: 'Pergunta final atual',
        statusApproved: 'Aprovada pela pessoa utilizadora',
        statusPending: 'A aguardar aprovação',
        locked:
          'O desenho da pesquisa está bloqueado até a pergunta final ser aprovada explicitamente na Etapa 1B.',
        generateButton: 'Gerar desenho da pesquisa',
        generating: 'A desenhar a pesquisa...',
        keywords: 'Palavras-chave',
        synonyms: 'Sinónimos',
        booleanQuery: 'Consulta booleana',
        searchStrings: 'Cadeias de pesquisa prontas a usar',
        recommendedDatabases: 'Bases de dados recomendadas',
        filters: 'Filtros',
        retrievalTitle: 'Etapa 2.5 - Recuperar artigos',
        retrieveButton: 'Recuperar artigos',
        retrieving: 'A recuperar...',
        articleLabel: 'Artigo',
        noArticles:
          'Ainda não foram recuperados artigos. Executa a recuperação para ancorar a Etapa 3 em fontes reais.',
        continueButton: 'Continuar para a Etapa 3',
        providerLabel: 'Fornecedor',
      },
      step3: {
        title: 'Etapa 4 - Evidence Extractor',
        intro:
          'Analisa artigos científicos recuperados com um clique ou cola texto personalizado quando necessário.',
        anchor: 'Âncora da investigação',
        locked:
          'A extração de evidência está bloqueada até a pergunta final estar aprovada e existir um desenho de pesquisa.',
        retrievedArticles: 'Artigos recuperados',
        noRetrievedArticles:
          'Não existem artigos recuperados. Volta à Etapa 2 e executa a recuperação de artigos.',
        manualTitle: 'Alternativa manual de fonte',
        manualPlaceholder: 'Cola um excerto, resumo ou notas de uma fonte personalizada.',
        sourceRequired: 'Introduz um texto de fonte para fazer a extracção.',
        analyzeButton: 'Analisar esta fonte',
        analyzeManual: 'Analisar fonte manual',
        analyzing: 'A analisar...',
        evidenceTitle: 'Registos de evidência extraídos',
        claim: 'Tese',
        methodology: 'Metodologia',
        findings: 'Resultados',
        limitations: 'Limitações',
        citation: 'Citação',
        evidenceLabel: 'Evidência',
        relevanceLabel: 'Relevância',
        typeLabel: 'Tipo',
        continueButton: 'Continuar para a Etapa 4',
      },
      step4: {
        title: 'Etapas 6-7 - Topic/Subtopic Mapper e Mind Map',
        intro:
          'Converte a evidência extraída num modelo estruturado de tópicos, subtópicos e relações conceptuais.',
        evidenceInput: 'Entrada de evidência',
        locked: 'A Etapa 4 está bloqueada até existir pelo menos um registo de evidência da Etapa 3.',
        generateButton: 'Gerar estrutura de conhecimento',
        generating: 'A estruturar conhecimento...',
        topics: 'Tópicos',
        subtopics: 'Subtópicos',
        conceptNodes: 'Nós conceptuais',
        conceptEdges: 'Arestas conceptuais',
        continueButton: 'Continuar',
        availableEvidence: '{count} registo(s) de evidência disponível(eis).',
      },
      step5_source_selection: {
        title: 'Passo 5 - Seleção de Fontes e Análise CRAAP',
        intro: 'Avalie a qualidade e relevância das suas fontes de evidência utilizando os critérios CRAAP.',
        ethicalTip: 'Dica ética — Credibilidade das Fontes',
        locked: 'Bloqueado até que existam registos de evidência.',
        noSources: 'Nenhuma fonte de evidência encontrada. Complete o Passo 3 primeiro.',
        confirmButton: 'Confirmar esta fonte',
        confirmedButton: '✓ Confirmada — avançar',
        scoreToConfirm: 'Pontuação ≥ 3/5 para confirmar',
        summary: '<strong>{confirmed}</strong> de <strong>{total}</strong> fontes confirmadas.',
        continueButton: 'Continuar',
        dimensions: {
          currency: 'Atualidade',
          currencyDesc: 'A informação é atual / publicada recentemente?',
          relevance: 'Relevância',
          relevanceDesc: 'Responde diretamente à pergunta de investigação?',
          authority: 'Autoridade',
          authorityDesc: 'O autor/editor é credível?',
          accuracy: 'Precisão',
          accuracyDesc: 'Baseia-se em evidências, revisão por pares, verificável?',
          purpose: 'Objetivo',
          purposeDesc: 'O intuito é informar/investigar (não persuadir/vender)?',
        },
      },
      step8: {
        title: 'Passo 8 - Construtor de Glossário Científico',
        intro: 'Reveja o glossário gerado pela IA. Edite, remova ou adicione termos ancorados em fontes revistas.',
        ethicalTip: 'Dica ética — Integridade do Glossário',
        locked: 'Bloqueado até que exista uma estrutura de conhecimento.',
        noStructure: 'Nenhuma estrutura encontrada. Complete o Passo 4 primeiro.',
        noTerms: 'Sem termos no glossário. Adicione entradas abaixo.',
        addTermTitle: 'Adicionar termo',
        termPlaceholder: 'Termo ou conceito científico',
        defPlaceholder: 'Definição ancorada numa fonte revista',
        addButton: '+ Adicionar termo',
        saveButton: 'Guardar Glossário e Continuar',
        summary: '<strong>{count}</strong> termo(s) no glossário.',
        continueButton: 'Continuar',
      },
      step5: {
        title: 'Etapa 9 - Scientific Explanation Scaffolder',
        intro:
          'Constrói um esboço de explicação rigoroso a partir da evidência estruturada e do mapa de conhecimento.',
        locked:
          'A Etapa 5 está bloqueada até a pergunta final estar aprovada e existirem evidência e estrutura de conhecimento.',
        generateButton: 'Gerar esboço de explicação',
        generating: 'A construir a explicação...',
        outline: 'Estrutura',
        argumentCore: 'Tese central',
        evidenceReferences: 'Referências de evidência',
        openIssues: 'Questões em aberto',
        expert: 'Especialista',
        general: 'Geral',
        continueButton: 'Continuar',
        redoButton: 'Refazer explicação',
      },
    },
    progress: {
      title: 'Progresso',
      topic: 'Tópico definido',
      candidateQuestions: 'Perguntas candidatas',
      finalQuestion: 'Pergunta final aprovada',
      searchDesign: 'Design de pesquisa',
      searchRetrieval: 'Artigos recuperados',
      evidence: 'Evidência extraída',
      sourceSelection: 'Seleção de fontes (CRAAP)',
      knowledgeStructure: 'Estrutura de conhecimento',
      glossary: 'Glossário científico',
      explanation: 'Explicação científica',
    },
    copilot: {
      title: 'Copilot - Em breve',
      body: 'O copilot será implementado no próximo passo.',
    },
    api: {
      missingQuery: 'A consulta de pesquisa é obrigatória.',
      missingRequiredInputs: 'Faltam campos obrigatórios para esta etapa.',
      finalQuestionRequired: 'A pergunta final precisa de ser aprovada antes da Etapa 2.',
      searchDesignRequired: 'A Etapa 3 requer um desenho de pesquisa existente.',
      genericFailure: 'Falha ao processar o pedido.',
      searchFailure: 'Falha ao pesquisar artigos.',
    },
  },
  en: {
    app: {
      name: 'RELIA Research Wizard',
      description: 'AI-guided research workflow',
    },
    language: {
      label: 'Language',
      ptPT: 'European Portuguese',
      en: 'English',
    },
    home: {
      title: 'Research Wizard',
      subtitle: 'AI-guided research workflow',
      topicLabel: 'Research topic',
      topicPlaceholder: 'What would you like to research?',
      startButton: 'Start research',
      intro: 'Define a topic, generate research questions, compare options, and build evidence in English or Portuguese.',
    },
    stage1: {
      title: 'Stage 1: Ask and Research',
      intro:
        'Generate, select, compare, synthesise, and operationalise a rigorous research question before moving into evidence work.',
    },
    workflow: {
      step0_generate: {
        badge: 'Step 0',
        label: 'Candidate Research Questions',
        description: 'Generate a bounded set of candidate research questions.',
      },
      step1_select: {
        badge: 'Step 1',
        label: 'Final RQ Candidate Selection',
        description: 'Select up to three candidates for later comparison.',
      },
      step1a_compare: {
        badge: 'Step 1A',
        label: 'Final RQ Synthesis Support',
        description: 'AI-assisted comparison to support final research-question synthesis.',
      },
      step1b_synthesize: {
        badge: 'Step 1B',
        label: 'Epistemological Analysis & Final RQ Decision',
        description: 'Consolidate the final question decision with methodological justification.',
      },
      step2_search_design: {
        badge: 'Step 2',
        label: 'Search String Builder / Search Design',
        description: 'Turn the final question into a reusable search plan.',
      },
      step3_evidence_extraction: {
        badge: 'Step 4',
        label: 'Evidence Extractor',
        description: 'Extract evidence from external sources into structured records.',
      },
      step5_source_selection: {
        badge: 'Step 5',
        label: 'Source Selection & CRAAP Analysis',
        description: 'Evaluate source credibility using the CRAAP method.',
      },
      step4_knowledge_structure: {
        badge: 'Steps 6-7',
        label: 'Topic/Subtopic Mapper + Mind Map',
        description: 'Organize evidence into topic structures and concept mapping.',
      },
      step8_glossary: {
        badge: 'Step 8',
        label: 'Scientific Glossary Builder',
        description: 'Build a scientific glossary based on extracted evidence.',
      },
      step5_explanation: {
        badge: 'Step 9',
        label: 'Scientific Explanation Scaffolder',
        description: 'Transform structured knowledge into a scientific explanation draft.',
      },
    },
    common: {
      lockedStep2: 'Locked until the final question is approved.',
      lockedStep3: 'Locked until search returns at least one article.',
      lockedStep4: 'Locked until at least one evidence record exists.',
      lockedStep5: 'Locked until a knowledge structure exists.',
      approved: 'Approved by user',
      pendingApproval: 'Pending approval',
      noData: 'No data available',
      unknownAuthors: 'Unknown authors',
      noAbstract: 'No abstract available.',
      loading: 'Loading...',
      provider: 'Provider',
      audience: 'Audience',
      ethicalTip: 'Ethical tip',
      stageEthicalTip: 'Stage ethical tip',
      optional: 'Optional',
      step0Archived: 'Step 0 was archived in memory. You can reopen it whenever needed.',
      reopen: 'Reopen',
    },
    steps: {
      step0: {
        title: 'Step 0 - Generate Research Questions',
        topicLabel: 'Research topic',
        topicPlaceholder: "e.g. 'Gene expression in neural development'",
        generate: 'Generate research questions',
        generating: 'Generating...',
        candidateTitle: 'Candidate research questions',
        candidateIntro: 'Review the options below before moving on.',
        typeLabel: 'Type',
        researchableLabel: 'Researchable?',
        challengesLabel: 'Challenges',
        databasesLabel: 'Databases',
        scoreLabel: 'IBL score',
        continueButton: 'Continue to selection',
        invalidTopic: 'Please enter a topic.',
      },
      step1Select: {
        title: 'Step 1 - Select up to 3 questions',
        continueButton: 'Continue',
      },
      step1A: {
        title: 'Step 1A - Compare Research Questions',
        quick: 'Quick',
        advanced: 'Advanced',
        run: 'Run analysis',
        running: 'Analysing...',
        selectedTitle: 'Selected questions',
        invalidSelection: 'Select at least two research questions before comparing.',
      },
      step1B: {
        title: 'Step 1B - Synthesize Final Research Question',
        intro:
          'This is the anchor point of the project. The AI proposes one final question, but the decision remains yours.',
        recommendedTitle: 'Recommendation from comparison',
        selectedTitle: 'Selected questions',
        noComparison: 'No structured comparison result is available yet.',
        createButton: 'Create final question',
        creating: 'Synthesising...',
        approveButton: 'Approve final question',
        statusLabel: 'Status',
        continueButton: 'Continue to Step 2',
        anchorNote: 'Step 2 can now use this question as the canonical anchor for search design.',
        invalidState: 'Run the comparison step before synthesising the final question.',
      },
      step2: {
        title: 'Step 2 - Search Design',
        intro:
          'Turn the approved final research question into keywords, boolean strings, databases, and filters.',
        currentQuestion: 'Current final research question',
        statusApproved: 'Approved by user',
        statusPending: 'Pending user approval',
        locked:
          'Search design is locked until the final research question is explicitly approved in Step 1B.',
        generateButton: 'Generate search design',
        generating: 'Designing search strategy...',
        keywords: 'Keywords',
        synonyms: 'Synonyms',
        booleanQuery: 'Boolean Query',
        searchStrings: 'Ready-to-use search strings',
        recommendedDatabases: 'Recommended databases',
        filters: 'Filters',
        retrievalTitle: 'Step 2.5 - Retrieve Articles',
        retrieveButton: 'Retrieve articles',
        retrieving: 'Retrieving...',
        articleLabel: 'Article',
        noArticles:
          'No articles retrieved yet. Run retrieval to ground Step 3 in real sources.',
        continueButton: 'Continue to Step 3',
        providerLabel: 'Provider',
      },
      step3: {
        title: 'Step 4 - Evidence Extractor',
        intro: 'Analyse retrieved scientific articles with one click, or paste custom text when needed.',
        anchor: 'Research anchor',
        locked:
          'Evidence extraction is locked until the final research question is approved and a search design exists.',
        retrievedArticles: 'Retrieved articles',
        noRetrievedArticles: 'No retrieved articles available. Go back to Step 2 and run article retrieval.',
        manualTitle: 'Manual source fallback',
        manualPlaceholder: 'Paste a custom source abstract, excerpt, or notes.',
        sourceRequired: 'Please enter a source text for extraction.',
        analyzeButton: 'Analyse this article',
        analyzeManual: 'Analyse manual source',
        analyzing: 'Analysing...',
        evidenceTitle: 'Extracted evidence records',
        claim: 'Claim',
        methodology: 'Methodology',
        findings: 'Findings',
        limitations: 'Limitations',
        citation: 'Citation',
        evidenceLabel: 'Evidence',
        relevanceLabel: 'Relevance',
        typeLabel: 'Type',
        continueButton: 'Continue to Step 4',
      },
      step4: {
        title: 'Steps 6-7 - Topic/Subtopic Mapper and Mind Map',
        intro:
          'Convert extracted evidence into a structured model of topics, subtopics, and concept relationships.',
        evidenceInput: 'Evidence input',
        locked: 'Step 4 is locked until at least one evidence record is extracted in Step 3.',
        generateButton: 'Generate Knowledge Structure',
        generating: 'Structuring knowledge...',
        topics: 'Topics',
        subtopics: 'Subtopics',
        conceptNodes: 'Concept Nodes',
        conceptEdges: 'Concept Edges',
        continueButton: 'Continue',
        availableEvidence: '{count} evidence record(s) available.',
      },
      step5_source_selection: {
        title: 'Step 5 - Source Selection & CRAAP Analysis',
        intro: 'Evaluate the quality and relevance of your evidence sources using CRAAP criteria.',
        ethicalTip: 'Ethical tip — Source Credibility',
        locked: 'Locked until evidence records exist.',
        noSources: 'No evidence sources found. Complete Step 3 first.',
        confirmButton: 'Confirm this source',
        confirmedButton: '✓ Confirmed — carry forward',
        scoreToConfirm: 'Score ≥ 3/5 to confirm',
        summary: '<strong>{confirmed}</strong> of <strong>{total}</strong> sources confirmed.',
        continueButton: 'Continue',
        dimensions: {
          currency: 'Currency',
          currencyDesc: 'Is the information current / recently published?',
          relevance: 'Relevance',
          relevanceDesc: 'Does it directly answer the research question?',
          authority: 'Authority',
          authorityDesc: 'Is the author/publisher credible?',
          accuracy: 'Accuracy',
          accuracyDesc: 'Is it evidence-based, peer-reviewed, verifiable?',
          purpose: 'Purpose',
          purposeDesc: 'Is the intent to inform/research (not persuade/sell)?',
        },
      },
      step8: {
        title: 'Step 8 - Scientific Glossary Builder',
        intro: 'Review the AI-generated glossary. Edit, remove, or add terms anchored to reviewed sources.',
        ethicalTip: 'Ethical tip — Glossary Integrity',
        locked: 'Locked until a knowledge structure exists.',
        noStructure: 'No knowledge structure found. Complete Step 4 first.',
        noTerms: 'No glossary terms yet. Add entries below.',
        addTermTitle: 'Add a term',
        termPlaceholder: 'Scientific term or concept',
        defPlaceholder: 'Definition anchored to a reviewed source',
        addButton: '+ Add term',
        saveButton: 'Save Glossary & Continue',
        summary: '<strong>{count}</strong> term(s) in the glossary.',
        continueButton: 'Continue',
      },
      step5: {
        title: 'Step 9 - Scientific Explanation Scaffolder',
        intro: 'Build a rigorous explanation draft from the structured evidence and knowledge map.',
        locked:
          'Step 5 is locked until the final question is approved and both evidence and knowledge structure are available.',
        generateButton: 'Generate Explanation Draft',
        generating: 'Building explanation draft...',
        outline: 'Outline',
        argumentCore: 'Argument Core',
        evidenceReferences: 'Evidence References',
        openIssues: 'Open Issues',
        expert: 'Expert',
        general: 'General',
        continueButton: 'Continue',
        redoButton: 'Redo explanation',
      },
    },
    progress: {
      title: 'Progress',
      topic: 'Topic defined',
      candidateQuestions: 'Candidate questions',
      finalQuestion: 'Final question approved',
      searchDesign: 'Search design',
      searchRetrieval: 'Articles retrieved',
      evidence: 'Evidence extracted',
      sourceSelection: 'Source selection (CRAAP)',
      knowledgeStructure: 'Knowledge structure',
      glossary: 'Scientific glossary',
      explanation: 'Scientific explanation',
    },
    copilot: {
      title: 'Copilot - Coming Soon',
      body: 'The copilot will be implemented in the next step.',
    },
    api: {
      missingQuery: 'Search query is required.',
      missingRequiredInputs: 'Missing required inputs for this step.',
      finalQuestionRequired: 'The final question must be approved before Step 2.',
      searchDesignRequired: 'Step 3 requires an existing search design.',
      genericFailure: 'Failed to process request.',
      searchFailure: 'Failed to search articles.',
    },
  },
}

export const SUPPORTED_LOCALES: Locale[] = ['pt-PT', 'en']
export const DEFAULT_LOCALE: Locale = FALLBACK_LOCALE

export function normalizeLocale(locale?: string | null): Locale {
  if (locale === 'en') return 'en'
  return 'pt-PT'
}

export function isPortugueseLocale(locale?: string | null): boolean {
  return normalizeLocale(locale) === 'pt-PT'
}

export function getLocaleLabel(locale: Locale): string {
  return getMessage(locale, `language.${locale === 'pt-PT' ? 'ptPT' : 'en'}`)
}

export function getMessage(locale: Locale, key: string, variables?: Record<string, string | number>): string {
  const value =
    readMessage(messages[locale], key) ??
    readMessage(messages[FALLBACK_LOCALE], key) ??
    key

  return interpolate(value, variables)
}

export function getLocalizedStepKey(stepId: string): string {
  return `workflow.${stepId}`
}

export function appendLocaleInstruction(locale: Locale, text: string): string {
  if (!isPortugueseLocale(locale)) {
    return text
  }

  return `${text}\n\nEscreve todo o conteúdo natural em português europeu (pt-PT). Mantém as chaves JSON e a estrutura exactamente como especificado.`
}

function readMessage(tree: MessageTree, key: string): string | undefined {
  return key.split('.').reduce<string | MessageTree | undefined>((node, part) => {
    if (!node || typeof node === 'string') return undefined
    return node[part]
  }, tree) as string | undefined
}

function interpolate(value: string, variables?: Record<string, string | number>): string {
  if (!variables) return value

  return value.replace(/\{([A-Za-z0-9_]+)\}/g, (_match, key) => {
    const replacement = variables[key]
    return replacement === undefined ? `{${key}}` : String(replacement)
  })
}
