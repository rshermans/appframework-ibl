# Plan: IBL Framework — Tooltips, Ethical Tips & Nomenclature

## TL;DR

Extrair a estrutura de estágios/passos, nomenclaturas e dicas éticas do ficheiro `ibl-ai-research-lab.html` e integrá-las na aplicação Next.js como tooltips inline e popups de dicas éticas, em consonância com a framework IBL de Rômulo Sherman e Professora Sílvia Araújo.

---

## Estrutura extraída do ibl-ai-research-lab.html

### Estágios

- Stage 0 — Team Setup & Role Distribution
- Stage 1 — Ask & Research (9 steps)
- Stage 2 — Explain & Create (Steps 9–10)
- Stage 3 — Reflect & Improve

### Nomenclatura dos Passos (Stage 1)

- Step 0 — Candidate Research Questions
- Step 1A — Final RQ Synthesis ✦ (NEW, required)
- Step 1B — Epistemological Analysis
- Step 2 — Search String Builder / Search Design
- Step 3 — Database Search / Source Evaluation
- Step 4 — Evidence Extractor
- Step 5 — Source Selection & CRAAP Analysis
- Step 6 — Topic & Subtopic Mapper
- Step 7 — Mind Map Generator
- Step 8 — Scientific Glossary Builder

### Stage 2

- Step 9 — Scientific Explanation Scaffolder
- Step 10 — Multimodal Output Generator (10A Poster, 10B Podcast, 10C Videocast, 10D Game, 10E Oral)

### Stage 3

- Peer Review & Reflection
- Self-Reflection / Metacognition
- Inquiry Extension Planner

### 8 Rubrics

R1 Scientific Explanation · R2 Research Process · R3 Poster/Infographic
R4 Podcast · R5 Science Game · R6 Oral Presentation
R7 Group Collaboration · R8 Ethical AI Use

---

## Dicas Éticas por Passo

| Passo                | Dica Ética                                                                                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stage 0              | AI role assignments are proposals, not mandates. Final task distribution must be decided collaboratively.                                                               |
| Step 0               | AI-generated questions are starting points. Evaluation decision must remain fully human.                                                                                |
| Step 1A              | AI helps compare and synthesise — cannot understand disciplinary context. Team must independently rank candidates first.                                                |
| Step 1B              | Use AI's analysis to _test_ your question, not to replace thinking.                                                                                                     |
| Step 2               | Always test each string manually. Simplify any string < 5 or > 500 results.                                                                                             |
| Step 3 (Source Eval) | AI cannot independently verify journal credibility. Cross-check at least 2 sources using Scimago or Sherpa Romeo. Automatic exclusions: Wikipedia, Studocu, SlideShare. |
| Step 4 (Evidence)    | AI extracts from what you provide. Never assume AI found something the text doesn't say. Paper wins over AI.                                                            |
| Step 5 (CRAAP)       | CRAAP evaluates credibility — but relevance to your RQ is your judgment.                                                                                                |
| Step 6 (Topics)      | Map should reflect your evidence. Each subtopic must anchor to at least one source you read.                                                                            |
| Step 7 (Mind Map)    | Check every node: "Can I point to a source for this?" Delete nodes without literature anchor.                                                                           |
| Step 8 (Glossary)    | Include only terms from your sources. Remove AI jargon not in your topic.                                                                                               |
| Stage 2              | All explanations must be faithful to evidence from Stage 1. AI-scaffolded content is yours to revise.                                                                   |
| Step 10 (Multimodal) | AI-generated visuals may misrepresent scientific structures. Always compare against peer-reviewed figures.                                                              |
| Stage 3              | Reflection is human. AI can prompt — honest answers must come from you.                                                                                                 |

---

## Ficheiros a criar/modificar

### Novo ficheiro

- `lib/iblFramework.ts` — fonte única de verdade: nomenclaturas, dicas éticas, labels por step/stage, tipagem TypeScript

### Novo componente

- `components/EthicalTip.tsx` — componente reutilizável (accordion/popup) com ícone 🛡️ e estilos consistentes

### Componentes a atualizar (adicionar tooltips + dica ética nos headers)

- `components/steps/Step0.tsx` — Step 0
- `components/Step1A.tsx` — Step 1A
- `components/Step1B.tsx` — Step 1B
- `components/Step2Search.tsx` — Step 2
- `components/Step3Evidence.tsx` — Step 4
- `components/Step4Structure.tsx` — Steps 6+7
- `components/Step5Explanation.tsx` — Step 9
- `components/Wizard.tsx` — navegação entre passos (labels corretos)

### lib/i18n.ts

- Adicionar chaves de tradução para as labels e dicas (pt-PT e en)

---

## Verificação

1. Visualizar cada componente — clicar no ícone ético → popup abre corretamente
2. Hover sobre labels de passos → tooltip com nome completo da framework
3. Verificar `npm run build` sem erros TypeScript
4. Confirmar que nomenclatura dos passos é consistente no sidebar/progresso do Wizard
