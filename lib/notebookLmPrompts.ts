/**
 * NotebookLM Export Prompts - Optimized for Delegated Multimodal Creation
 * 
 * Strategy: Instead of generating full artifacts in-app (limited tokens),
 * provide structured, reusable prompts to NotebookLM where students can
 * craft publication-quality outputs.
 * 
 * Token budgets: 800-1500 max per prompt (includes evidence + instructions)
 */

export type NotebookLmArtifactType = 'poster' | 'podcast' | 'video' | 'game' | 'presentation'

export interface NotebookLmExportData {
  projectId: string
  artifactType: NotebookLmArtifactType
  locale: 'pt-PT' | 'en'
  researchQuestion: string
  topic: string
  compressedEvidence: string // Summarized key claims
  evidenceKeyPoints: Array<{ claim: string; source: string }>
  promptText: string
  instructions: string
}

// ============================================================================
// POSTER / INFOGRAPHIC (800 tokens max)
// ============================================================================

function getPosterPrompt(locale: 'pt-PT' | 'en'): string {
  const pt = locale === 'pt-PT'

  return pt
    ? `## Criar Infográfico Científico

### Objetivo
Transforme a questão de investigação e as evidências fornecidas num infográfico visual claro, educativo e atrativo.

### Estrutura Esperada
Organize o infográfico em **3-5 secções** principais:
1. **Título & Questão** — pergunta investigada em linguagem simples
2. **Contexto** — 2-3 factos-chave para enquadrar o tópico
3. **Evidência Principal** — 3-4 descobertas principais com ícones/símbolos visuais
4. **Implicações** — O que isto significa? Por que importa?
5. **Fontes** — Ligação a 2-3 referências principais (tipo: Author, Year, DOI)

### Regras de Design
- Linguagem simples, sem jargão técnico (ou explique em rodapé)
- Use setas, ícones, cores para criar fluxo visual
- Inclua escalas (ex: "100x mais rápido", "4 em cada 5")
- Cada secção = máx 30 palavras
- Sugestões de cor: azul (confiança), verde (progresso), laranja (atenção)

### Saída Esperada
Forneça um layout em texto estruturado que possa ser:
1. Copiado para PowerPoint/Canva
2. Enviado para designer
3. Implementado em código HTML/CSS

---`
    : `## Create Scientific Infographic

### Objective
Transform the research question and provided evidence into a clear, educational, and engaging visual infographic.

### Expected Structure
Organize the infographic into **3-5 main sections**:
1. **Title & Question** — research question in plain language
2. **Context** — 2-3 key facts to frame the topic
3. **Main Evidence** — 3-4 key findings with visual icons/symbols
4. **Implications** — What does this mean? Why does it matter?
5. **Sources** — Link to 2-3 key references (format: Author, Year, DOI)

### Design Rules
- Simple language, no jargon (or explain in footer)
- Use arrows, icons, colors to create visual flow
- Include scales (e.g., "100x faster", "4 out of 5")
- Each section = max 30 words
- Color suggestions: blue (trust), green (progress), orange (attention)

### Expected Output
Provide a structured text layout that can be:
1. Copied to PowerPoint/Canva
2. Sent to designer
3. Implemented in HTML/CSS code

---`
}

// ============================================================================
// PODCAST SCRIPT (1200 tokens max)
// ============================================================================

function getPodcastPrompt(locale: 'pt-PT' | 'en'): string {
  const pt = locale === 'pt-PT'

  return pt
    ? `## Escrever Script de Podcast Científico

### Objetivo
Criar um script de podcast de 8-10 minutos que explique a questão de investigação e as descobertas principais de forma envolvente e acessível.

### Estrutura
**Introdução (1 min):**
- Gancho: pergunta provocadora ou facto surpreendente
- "Neste episódio, vamos explorar..."
- O que vai aprender

**Segmento 1: Contexto (2 min):**
- Por que importa este tópico?
- Enquadramento histórico ou atual
- Questão investigada

**Segmento 2: Descobertas (4-5 min):**
- Apresente 3-4 descobertas principais
- Para cada: "Descobrimos que..." + explicação simples
- Analogias / exemplos do dia-a-dia

**Segmento 3: Implicações (1-2 min):**
- O que significam estas descobertas?
- Aplicações práticas
- Próximas perguntas

**Encerramento (30 seg):**
- "Para aprender mais, visite..."
- Agradecimentos

### Regras de Tom & Linguagem
- Conversacional, como conversa entre amigos
- Explique conceitos técnicos sem jargão
- Inclua pausas naturais ("...")
- Use: "Imagina que..." para analogias
- Tom entusiasmado mas credível

### Saída Esperada
Script com:
- [00:00 - 01:00] Introdução
- [01:00 - 03:00] Contexto
- Etc.
- Duração total: ~8-10 minutos a falar

---`
    : `## Write Scientific Podcast Script

### Objective
Create an 8-10 minute podcast script that explains the research question and main findings in an engaging and accessible way.

### Structure
**Introduction (1 min):**
- Hook: provocative question or surprising fact
- "In this episode, we'll explore..."
- What you'll learn

**Segment 1: Context (2 min):**
- Why does this topic matter?
- Historical or current framing
- Research question

**Segment 2: Findings (4-5 min):**
- Present 3-4 main findings
- For each: "We discovered that..." + simple explanation
- Everyday analogies/examples

**Segment 3: Implications (1-2 min):**
- What do these findings mean?
- Practical applications
- Next questions

**Closing (30 sec):**
- "To learn more, visit..."
- Thank yous

### Tone & Language Rules
- Conversational, like friends chatting
- Explain technical concepts without jargon
- Include natural pauses ("...")
- Use: "Imagine that..." for analogies
- Tone: enthusiastic but credible

### Expected Output
Script with:
- [00:00 - 01:00] Introduction
- [01:00 - 03:00] Context
- Etc.
- Total duration: ~8-10 minutes of speaking

---`
}

// ============================================================================
// VIDEO / VIDEOCAST STORYBOARD (1500 tokens max)
// ============================================================================

function getVideoPrompt(locale: 'pt-PT' | 'en'): string {
  const pt = locale === 'pt-PT'

  return pt
    ? `## Planejar Storyboard de Vídeo Científico

### Objetivo
Criar um plano detalhado de vídeo (3-5 minutos) com descritiva visual, narração e transições.

### Estrutura por Cenas
Organize em **5-8 cenas**. Para cada cena, forneça:

| Cena | Duração | Visual | Narração | Áudio |
|------|---------|--------|----------|-------|
| 1 | 0:00-0:15 | [Descrevê o que se vê] | [Texto para ator ler] | [Música/som] |
| 2 | 0:15-1:00 | ... | ... | ... |

### Guia Visual
- Cena 1: Abertura (título + pergunta)
- Cenas 2-4: Desenvolvimento (animações, gráficos, entrevista)
- Cenas 5-6: Resultados (dados visuais, interpretação)
- Cena Final: Conclusão (chamada à ação, fontes)

### Elementos Técnicos
- **Animações recomendadas**: Gráficos em movimento, zoom em textos-chave
- **Transições**: Corte simples, fade, swipe (use com moderação)
- **Duração ideial**: 3-5 minutos total
- **Resolução**: 1080p mínimo
- **Formato**: 16:9 para YouTube, 9:16 para TikTok/Reels

### Saída Esperada
Storyboard com 5-8 cenas, cada uma com visual + script de narração. Pronto para:
1. Contratar animator
2. Usar Canva/Adobe Animate
3. Enviar a videógrafo

---`
    : `## Plan Scientific Video Storyboard

### Objective
Create a detailed 3-5 minute video plan with visual descriptions, narration, and transitions.

### Scene Structure
Organize into **5-8 scenes**. For each scene, provide:

| Scene | Duration | Visual | Narration | Audio |
|-------|----------|--------|-----------|-------|
| 1 | 0:00-0:15 | [Describe what we see] | [Text for actor to read] | [Music/sound] |
| 2 | 0:15-1:00 | ... | ... | ... |

### Visual Guide
- Scene 1: Opening (title + question)
- Scenes 2-4: Development (animations, graphics, interview)
- Scenes 5-6: Results (data visuals, interpretation)
- Final Scene: Conclusion (call-to-action, sources)

### Technical Elements
- **Recommended animations**: Moving graphs, text zooms
- **Transitions**: Simple cut, fade, swipe (use sparingly)
- **Ideal duration**: 3-5 minutes total
- **Resolution**: 1080p minimum
- **Format**: 16:9 for YouTube, 9:16 for TikTok/Reels

### Expected Output
Storyboard with 5-8 scenes, each with visual + narration script. Ready for:
1. Hiring animator
2. Using Canva/Adobe Animate
3. Sending to videographer

---`
}

// ============================================================================
// SCIENCE GAME / INTERACTIVE (1200 tokens max)
// ============================================================================

function getGamePrompt(locale: 'pt-PT' | 'en'): string {
  const pt = locale === 'pt-PT'

  return pt
    ? `## Desenhar Jogo Científico Interativo

### Objetivo
Criar um jogo educativo de decisão (5-10 minutos para jogar) que ensine a questão de investigação através de escolhas do jogador.

### Tipo de Jogo
**Decision Tree Game**: Jogador faz 3-4 escolhas críticas; cada escolha revela consequências baseadas em descobertas científicas.

### Estrutura
**Setup (Cena 1):**
- Cenário: "Você é um [cientista/engenheiro/médico] enfrentando um dilema"
- Objetivo claro: "Você precisa decidir..."

**Pontos de Decisão (3-4):**
Para cada decisão:
\`\`\`
[ESCOLHA A] → [Consequência + Aprendizado científico]
[ESCOLHA B] → [Alternativa + Contraponto]
[ESCOLHA C] → [Armadilha + Erro comum]
\`\`\`

**Fim (Cena Final):**
- Desfecho baseado em escolhas feitas
- Pontuação / badges (Ex: "Decisor Cuidadoso", "Inovador")
- "Recomendação": qual caminho foi mais eficaz? Por quê?

### Exemplos de Mecânicas
- **Ponto**: +1 para escolha baseada em evidência, -1 para mito comum
- **Tempo**: Limite de tempo por decisão (cria pressão realista)
- **Recursos**: Orçamento finito (ex: "tens €100 para investigação, gasta-os")
- **Consequência em Cadeia**: Escolha 1 afeta opções em Escolha 2

### Plataformas
- **Fácil**: Construtor de no-code (Twine, Ink, ChoiceScript)
- **Intermédio**: HTML/JavaScript + branching narrative
- **Avançado**: Game engine (Unity, Unreal)

### Saída Esperada
Árvore de decisão em texto/diagrama, com:
1. 3-4 nós de decisão principais
2. 8-12 possibilidades de fim
3. Pontuação / feedback por caminho
4. Pedagogical learning outcome por branch

---`
    : `## Design Scientific Interactive Game

### Objective
Create an educational decision game (5-10 minutes to play) that teaches the research question through player choices.

### Game Type
**Decision Tree Game**: Player makes 3-4 critical choices; each choice reveals consequences based on scientific findings.

### Structure
**Setup (Scene 1):**
- Scenario: "You are a [scientist/engineer/doctor] facing a dilemma"
- Clear objective: "You need to decide..."

**Decision Points (3-4):**
For each decision:
\`\`\`
[CHOICE A] → [Consequence + Scientific learning]
[CHOICE B] → [Alternative + Counterpoint]
[CHOICE C] → [Trap + Common misconception]
\`\`\`

**End (Final Scene):**
- Outcome based on choices made
- Score/badges (Ex: "Careful Decider", "Innovator")
- "Recommendation": which path was most effective? Why?

### Example Mechanics
- **Point**: +1 for evidence-based choice, -1 for common myth
- **Time**: Time limit per decision (creates realistic pressure)
- **Resources**: Finite budget (e.g., "you have €100 for research, spend it")
- **Chain Consequence**: Choice 1 affects options in Choice 2

### Platforms
- **Easy**: No-code builder (Twine, Ink, ChoiceScript)
- **Intermediate**: HTML/JavaScript + branching narrative
- **Advanced**: Game engine (Unity, Unreal)

### Expected Output
Decision tree in text/diagram format with:
1. 3-4 main decision nodes
2. 8-12 possible endings
3. Score/feedback per path
4. Pedagogical learning outcome per branch

---`
}

// ============================================================================
// ORAL PRESENTATION (1000 tokens max)
// ============================================================================

function getPresentationPrompt(locale: 'pt-PT' | 'en'): string {
  const pt = locale === 'pt-PT'

  return pt
    ? `## Preparar Apresentação Oral Científica

### Objetivo
Estruturar uma apresentação de 8-12 minutos pronta para apresentar em seminário, conferência ou sala de aula.

### Estrutura de Slides
**Slide 1: Abertura (1 min)**
- Título claro
- Seus nomes / instituição
- Data
- Visual impactante (imagem relevante)

**Slides 2-3: Contexto & Questão (2 min)**
- Por que importa este tópico?
- Questão de investigação em linguagem clara
- Objetivos

**Slides 4-7: Método & Resultados (5-6 min)**
- Como foi feita a investigação? (breve)
- Resultados principais (1 slide por resultado principal)
- Use gráficos/tabelas (máx 1 por slide)
- Texto: máx 5 bullets por slide

**Slides 8-9: Discussão & Implicações (2 min)**
- O que significam os resultados?
- Limitações
- Aplicações práticas

**Slide Final: Conclusão & Fontes (1 min)**
- Mensagem chave (1 frase)
- Agradecer
- Contato / Referências QR

### Guia de Apresentação
- **Tempo por slide**: 1-1.5 minutos
- **Voz**: Fale claramente, pause em pontos-chave
- **Gestos**: Apontar para slide, manter contacto visual
- **Notas de orador**: Prepare 2-3 pontos por slide (não leia)

### Design Visual
- Fonte: Mínimo 24pt (legível de trás da sala)
- Cores: 2-3 cores primárias, fundo claro
- Animações: Apenas entrada de conteúdo (evite efeitos)
- Imagens: 1 por slide (alta resolução)

### Saída Esperada
Deck completo com:
1. 10-12 slides estruturados
2. Notas de orador por slide
3. Duração: 8-12 minutos
4. Pronto para Zoom, teatro ou seminário

---`
    : `## Prepare Scientific Oral Presentation

### Objective
Structure an 8-12 minute presentation ready to present at seminar, conference, or classroom.

### Slide Structure
**Slide 1: Opening (1 min)**
- Clear title
- Your names / institution
- Date
- Impactful visual (relevant image)

**Slides 2-3: Context & Question (2 min)**
- Why does this topic matter?
- Research question in plain language
- Objectives

**Slides 4-7: Method & Results (5-6 min)**
- How was the research conducted? (brief)
- Main results (1 slide per main result)
- Use graphs/tables (max 1 per slide)
- Text: max 5 bullets per slide

**Slides 8-9: Discussion & Implications (2 min)**
- What do the results mean?
- Limitations
- Practical applications

**Final Slide: Conclusion & Sources (1 min)**
- Key takeaway (1 sentence)
- Thank you
- Contact / QR References

### Presentation Guide
- **Time per slide**: 1-1.5 minutes
- **Voice**: Speak clearly, pause at key points
- **Gestures**: Point to slide, maintain eye contact
- **Speaker notes**: Prepare 2-3 points per slide (don't read)

### Visual Design
- Font: Minimum 24pt (readable from back of room)
- Colors: 2-3 primary colors, light background
- Animations: Content entry only (avoid effects)
- Images: 1 per slide (high resolution)

### Expected Output
Complete deck with:
1. 10-12 structured slides
2. Speaker notes per slide
3. Duration: 8-12 minutes
4. Ready for Zoom, theater, or seminar

---`
}

// ============================================================================
// EXPORT PROMPT BUILDER
// ============================================================================

export function buildNotebookLmPrompt(
  data: NotebookLmExportData
): {
  systemPrompt: string
  userPrompt: string
  fullPrompt: string
} {
  const basePrompt = (() => {
    switch (data.artifactType) {
      case 'poster':
        return getPosterPrompt(data.locale)
      case 'podcast':
        return getPodcastPrompt(data.locale)
      case 'video':
        return getVideoPrompt(data.locale)
      case 'game':
        return getGamePrompt(data.locale)
      case 'presentation':
        return getPresentationPrompt(data.locale)
    }
  })()

  const pt = data.locale === 'pt-PT'

  const systemPrompt = pt
    ? `Você é um especialista educativo em comunicação científica. O seu trabalho é transformar perguntas de investigação e evidências científicas em artefatos criativos, educativos e de qualidade profissional para alunos.`
    : `You are an expert in science communication and educational content creation. Your job is to transform research questions and scientific evidence into creative, educational, and professionally high-quality artifacts for students.`

  const userPrompt = `
${pt ? '## Contexto de Investigação' : '## Research Context'}

${pt ? '**Pergunta de Investigação:**' : '**Research Question:**'} ${data.researchQuestion}
${pt ? '**Tópico:**' : '**Topic:**'} ${data.topic}

${pt ? '## Evidência Comprimida (Pontos-Chave)' : '## Compressed Evidence (Key Points)'}

${data.evidenceKeyPoints.map((ep) => `- ${ep.claim} (${pt ? 'Fonte' : 'Source'}: ${ep.source})`).join('\n')}

${pt ? '## Instruções Detalhadas' : '## Detailed Instructions'}

${data.instructions}

${pt ? 'Lembre-se: O output deve ser educativo, acessível, e pronto para' : 'Remember: The output should be educational, accessible, and ready for'} ${
    data.artifactType === 'poster'
      ? (pt ? 'ser copiado para Canva/PowerPoint/CSS' : 'copying to Canva/PowerPoint/CSS')
      : data.artifactType === 'podcast'
        ? (pt ? 'ser enviado a um podcaster' : 'sending to a podcaster')
        : data.artifactType === 'video'
          ? (pt ? 'ser enviado a um videógrafo' : 'sending to a videographer')
          : data.artifactType === 'game'
            ? (pt ? 'ser implementado num game engine' : 'implementing in a game engine')
            : (pt ? 'ser apresentado em seminário' : 'presenting at a seminar')
  }.
`

  return {
    systemPrompt,
    userPrompt,
    fullPrompt: `${systemPrompt}\n\n${userPrompt}\n\n${basePrompt}`,
  }
}

// ============================================================================
// EXPORT METADATA
// ============================================================================

export const NOTEBOOK_LM_ARTIFACTS = {
  poster: {
    name: { pt: 'Infográfico Científico', en: 'Scientific Infographic' },
    tokenBudget: 800,
    duration: '1 sessão NotebookLM',
    output: { pt: 'PDF/Design pronto para imprimir', en: 'Print-ready PDF/Design' },
  },
  podcast: {
    name: { pt: 'Podcast Científico', en: 'Scientific Podcast' },
    tokenBudget: 1200,
    duration: '8-10 minutos áudio',
    output: { pt: 'Script + Ficheiro áudio (MP3)', en: 'Script + Audio file (MP3)' },
  },
  video: {
    name: { pt: 'Videocast Científico', en: 'Scientific Videocast' },
    tokenBudget: 1500,
    duration: '3-5 minutos vídeo',
    output: { pt: 'Storyboard + Vídeo (MP4)', en: 'Storyboard + Video (MP4)' },
  },
  game: {
    name: { pt: 'Jogo Científico Interativo', en: 'Interactive Science Game' },
    tokenBudget: 1200,
    duration: '5-10 minutos para jogar',
    output: { pt: 'Prototipo jogável', en: 'Playable prototype' },
  },
  presentation: {
    name: { pt: 'Apresentação Oral', en: 'Oral Presentation' },
    tokenBudget: 1000,
    duration: '8-12 minutos apresentação',
    output: { pt: 'Deck PowerPoint/Slides', en: 'PowerPoint/Slides deck' },
  },
}
