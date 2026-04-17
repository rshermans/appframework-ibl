# IBL Stage 2 & Stage 3 — Future Innovation Plan

> Documento vivo: ideias, mockups conceptuais e plano de implementação para os estágios futuros do IBL Research Framework.

---

## Stage 2 — Explain & Create

### Visão

Stage 2 transforma evidência validada (Stage 1) em outputs multimodais de comunicação científica. A IA actua como **scaffolding criativo**: propõe estrutura, mas o conteúdo final é sempre decisão humana com âncora em evidência.

### Steps previstos

| Step | Nome                              | Componente futuro         | Funcionalidade core                                          |
| ---- | --------------------------------- | ------------------------- | ------------------------------------------------------------ |
| 9    | Scientific Explanation Scaffolder | `Step5Explanation.tsx` ✅ | Já implementado no Stage 1 como ponte para Stage 2           |
| 10   | Multimodal Output Generator       | `Step6Multimodal.tsx`     | Orquestrador dos sub-outputs abaixo                          |
| 10A  | Poster / Infographic              | `Step10APoster.tsx`       | Layout canvas com drag-and-drop, export PDF/PNG              |
| 10B  | Podcast Script                    | `Step10BPodcast.tsx`      | Script scaffolder + timeline + TTS preview                   |
| 10C  | Videocast Storyboard              | `Step10CVideocast.tsx`    | Storyboard por cenas, thumbnails IA, export de roteiro       |
| 10D  | Science Game                      | `Step10DGame.tsx`         | Quiz/game builder baseado em evidência + gamification engine |
| 10E  | Oral Presentation                 | `Step10EOral.tsx`         | Slide scaffolder com notas de orador e timer de prática      |

### Mockup conceptual — Stage 2 Editorial Canvas

```
+----------------------------------------------------------------------------------+
| IBL-AI                                  Stage 2 — Explain & Create               |
|----------------------------------------------------------------------------------|
| Evidence Integrity Gauge 92 %        Scientific Thread                           |
| [Gold signal based on citation depth]| Step 9 → 10A → 10B → 10C → 10D          |
|---------------------------------------+------------------------------------------|
| Left Rail: Source Anchors             | Main Editorial Canvas                    |
| - Claim A (3 references)              | - Explanation scaffold blocks            |
| - Claim B (2 references)              | - Cross-check cards (human validation)   |
| - Open issue C                         | - Multimodal storyboard board            |
|---------------------------------------+------------------------------------------|
| Stage 3 Reflection Studio: Peer lens | Self lens | Extension lens               |
+----------------------------------------------------------------------------------+
```

### Mockup conceptual — Step 10 (Multimodal Hub)

```
┌─────────────────────────────────────────────────────────────────┐
│  Stage 2: Explain & Create                                      │
│  ════════════════════════════════════════════════════════════    │
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │  🖼️ Poster   │ │  🎙️ Podcast  │ │  🎬 Video    │            │
│  │  Step 10A    │ │  Step 10B    │ │  Step 10C    │            │
│  │              │ │              │ │              │            │
│  │ [Start →]    │ │ [Start →]    │ │ [Start →]    │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐                              │
│  │  🎮 Game     │ │  🎤 Oral     │   ┌─────────────────────┐   │
│  │  Step 10D    │ │  Step 10E    │   │ 🛡️ Ethical Tip       │   │
│  │              │ │              │   │ AI visuals may        │   │
│  │ [Start →]    │ │ [Start →]    │   │ misrepresent. Cross-  │   │
│  └──────────────┘ └──────────────┘   │ check with sources.   │   │
│                                       └─────────────────────┘   │
│                                                                 │
│  Evidence Anchor: "How does X affect Y in Z context?"           │
│  Knowledge Structure: 6 topics, 14 subtopics, 8 edges          │
│  ──────────────────────────────────────────────────             │
│  📊 Progress: 1/5 outputs finalized                             │
└─────────────────────────────────────────────────────────────────┘
```

### Ideias inovadoras para Stage 2

1. **Evidence Watermark** — Cada output multimodal mantém uma "marca d'água de evidência": JSON metadata embedded que liga cada claim visual/textual ao registo de evidência de origem. Se um nó do poster não tiver âncora de evidência, é sinalizado com `ai-needs-validation`.

2. **Evidence Fidelity Meter** — Score computado a partir da cobertura de citações e ligação claim-to-source. Mostrado por secção para detetar risco de alucinação.

3. **Counterfactual Drafting** — Modo "desafia este claim": pede interpretações alternativas à IA a partir da mesma evidência. O estudante escolhe a interpretação aceite com justificação explícita.

4. **Multimodal Consistency Engine** — Antes de gerar poster/podcast/vídeo, faz uma passagem de consistência para verificar se todos os outputs preservam o mesmo argumento central. Emite avisos quando as narrativas divergem.

5. **Live Collaboration Canvas** — Step 10A usa um canvas estilo Figma simplificado, com blocos arrastáveis pré-populados pela estrutura de conhecimento. Layout sugerido pela IA mas rearranjável livremente.

6. **AI Audio Preview** — No Step 10B, o script gerado pode ser pré-visualizado com TTS (Web Speech API). O estudante ouve, corrige, re-grava secções. A IA sugere transições e timing.

7. **Gamification Engine** — Step 10D não é um quiz simples. A IA gera cenários baseados em evidência onde o jogador toma decisões científicas. Usa branching narrativo com consequências baseadas na qualidade da evidência.

8. **Rubric-Aligned Self-Check** — Cada sub-output inclui um painel lateral onde o estudante avalia o próprio trabalho contra a rúbrica relevante (R3 Poster, R4 Podcast, etc.) antes de submeter.

---

## Stage 3 — Reflect & Improve

### Visão

Stage 3 fecha o ciclo IBL com reflexão metacognitiva. A IA **provoca** reflexão mas nunca a substitui. Outputs de Stage 3 são textos livres do estudante, com prompts guiados.

### Steps previstos

| Step       | Nome                      | Componente futuro        | Funcionalidade core                                         |
| ---------- | ------------------------- | ------------------------ | ----------------------------------------------------------- |
| S3-Peer    | Peer Review               | `StepPeerReview.tsx`     | Rubric-based peer feedback com anonimato opcional           |
| S3-Self    | Self-Assessment           | `StepSelfAssessment.tsx` | Auto-avaliação guiada por rúbricas R1-R8                    |
| S3-Reflect | Metacognition Reflection  | `StepReflection.tsx`     | Journaling guiado: "O que aprendi? O que faria diferente?"  |
| S3-Extend  | Inquiry Extension Planner | `StepExtension.tsx`      | IA propõe novos caminhos com base nas lacunas identificadas |

### Mockup conceptual — Stage 3 (Reflection Hub)

```
┌─────────────────────────────────────────────────────────────────┐
│  Stage 3: Reflect & Improve                                     │
│  ════════════════════════════════════════════════════════════    │
│                                                                 │
│  ┌─── Thread Progress ──────────────────────────────────────┐   │
│  │  ● Peer Review  ──  ○ Self-Assessment  ──  ○ Reflection  │   │
│  │                                          ──  ○ Extension │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────┐ ┌──────────────────┐   │
│  │  📝 Peer Review Panel               │ │  Rubric Sidebar  │   │
│  │                                     │ │                  │   │
│  │  Reviewing: Team B's Poster         │ │  R3: Poster      │   │
│  │                                     │ │  □ Visual clarity│   │
│  │  ┌─────────────────────────────┐    │ │  □ Evidence use  │   │
│  │  │ Strengths:                  │    │ │  □ Layout logic  │   │
│  │  │ [                          ]│    │ │  □ Accessibility │   │
│  │  │                             │    │ │                  │   │
│  │  │ Improvements:              │    │ │  R8: Ethical AI   │   │
│  │  │ [                          ]│    │ │  □ Transparency  │   │
│  │  └─────────────────────────────┘    │ │  □ Attribution   │   │
│  │                                     │ │  □ Human control │   │
│  │  🛡️ Reflection is human work.       │ │                  │   │
│  │  AI prompts — honest answers are    │ └──────────────────┘   │
│  │  yours.                             │                        │
│  └─────────────────────────────────────┘                        │
│                                                                 │
│  [Submit Peer Review]                                           │
└─────────────────────────────────────────────────────────────────┘
```

### Ideias inovadoras para Stage 3

1. **Reflective Delta Timeline** — Mostra como a explicação final mudou do primeiro rascunho para a versão aprovada. Destaca quais mudanças foram edições humanas vs sugestões da IA.

2. **Inquiry Heatmap** — Visualização que mostra "temperatura" de cada etapa do processo: onde o estudante investiu mais tempo, onde houve mais iterações AI, onde a evidência é mais densa. Identifica vieses de esforço.

3. **Peer Calibration Matrix** — Recolhe ratings dos pares por dimensão de rúbrica (R1-R8) e computa hotspots de desacordo. Prioriza prompts de discussão onde a variância entre pares é maior.

4. **AI-Prompted Journaling** — A cada 48h durante o projeto, a IA envia micro-prompts de reflexão (1 frase). No final, compila um "diário de aprendizagem" cronológico como artefacto de metacognição.

5. **Evidence Gap Detector** — A IA cruza a estrutura de conhecimento do Stage 1 com os outputs do Stage 2 e identifica gaps: "O tópico X foi mencionado na evidência mas não aparece no poster."

6. **Peer Review Anonymization Layer** — Revisão por pares é anónima por defeito, com opção de revelar identidade após o feedback.

7. **Inquiry Extension as Branching** — O Extension Planner propõe 3 caminhos distintos com estimativa de complexidade, bases de dados relevantes e potenciais metodologias.

---

## Plano de Implementação Técnico

### Prioridades (Incremental)

| Fase | Escopo                     | Complexidade | Dependências                     |
| ---- | -------------------------- | ------------ | -------------------------------- |
| A    | Step 10 Hub (orquestrador) | Média        | Stage 1 completo ✅              |
| B    | Step 10A Poster            | Alta         | Canvas library (fabric.js/konva) |
| C    | Step 10B-E restantes       | Média        | Padrão do 10A como template      |
| D    | Stage 3 — Peer Review      | Média        | Multi-user auth (opcional)       |
| E    | Stage 3 — Reflection       | Baixa        | Journaling UI only               |
| F    | Stage 3 — Extension        | Média        | Evidence gap analysis prompt     |

### Ficheiros a criar (Stage 2)

```
components/
  Step6Multimodal.tsx         ← Hub orquestrador
  multimodal/
    Step10APoster.tsx
    Step10BPodcast.tsx
    Step10CVideocast.tsx
    Step10DGame.tsx
    Step10EOral.tsx
    EvidenceWatermark.tsx     ← Componente de âncora de evidência
    RubricSelfCheck.tsx       ← Auto-avaliação por rúbrica
```

### Ficheiros a criar (Stage 3)

```
components/
  reflection/
    StepPeerReview.tsx
    StepSelfAssessment.tsx
    StepReflection.tsx
    StepExtension.tsx
    InquiryHeatmap.tsx
    RubricSidebar.tsx
```

### Prompts a adicionar em `lib/prompts.ts`

- `multimodal_poster` — Layout scaffolding para poster científico
- `multimodal_podcast` — Script de podcast com marcadores de tempo
- `multimodal_video` — Storyboard por cenas
- `multimodal_game` — Cenários e branching narrativo
- `multimodal_oral` — Notas de orador e slide outline
- `peer_review_guide` — Prompts guiados de feedback
- `self_assessment` — Mapeamento rúbrica → auto-avaliação
- `reflection_journal` — Micro-prompts de metacognição
- `inquiry_extension` — Deteção de gaps e proposta de caminhos

### Extensões ao Store

```typescript
// Adições ao WizardState (types/wizard.ts)
multimodalOutputs: {
  poster?: PosterDraft
  podcast?: PodcastScript
  videocast?: VideostoryBoard
  game?: GameScenario
  oral?: OralPresentation
}
peerReviews: PeerReview[]
selfAssessment: SelfAssessmentRecord | null
reflectionJournal: ReflectionEntry[]
extensionPlan: ExtensionPath[] | null
```

### Novas store slices

- `evidenceFidelity` — Score de fidelidade por secção
- `reflectionRecords` — Registos de reflexão e journaling
- `multimodalConsistency` — Validação de consistência narrativa entre outputs

### API contracts a adicionar

- `stage2_validation` — Verificação de fidelidade de evidência
- `reflection_prompts` — Geração de prompts de reflexão contextual

---

## Design System — Extensões para Stage 2/3

### Novas CSS classes sugeridas

```css
/* Canvas workspace for poster/multimodal */
.canvas-workspace {
  background: var(--surface_container_low);
  min-height: 60vh;
}

/* Rubric sidebar */
.rubric-sidebar {
  background: var(--surface_container);
  border-left: 4px solid var(--secondary);
}

/* Reflection journal entry */
.journal-entry {
  background: var(--surface_container_lowest);
  border-left: 3px solid var(--primary_fixed_dim);
}

/* Heatmap cell tones */
.heatmap-cold {
  background: var(--surface_container_low);
}
.heatmap-warm {
  background: rgba(120, 89, 27, 0.15);
}
.heatmap-hot {
  background: rgba(120, 89, 27, 0.35);
}
```

### Validação

- Feature flags: `stage2Experimental` e `stage3Studio`
- Rollout progressivo com telemetria de taxa de conclusão e qualidade de revisão
- Contract tests para evidence-to-claim linking
- Smoke tests para labels multilingue e rendering de ethical-tips

---

_Última atualização: 14 abril 2026 — Rômulo Sherman & Prof. Sílvia Araújo_
