import { NextResponse } from 'next/server'
import { callChatGPTText } from '@/lib/ai'
import fs from 'fs'
import path from 'path'

// Step descriptions for context injection — keyed by WorkflowStepId
const STEP_CONTEXT: Record<string, string> = {
  'step0_generate':           'Stage 1 · Step 0 → Candidate Research Questions: generating 4–6 diverse RQ candidates.',
  'step1_select':             'Stage 1 · Step 1 → RQ Selection: choosing from the candidate research questions.',
  'step1a_compare':           'Stage 1 · Step 1A → Final RQ Synthesis: comparing candidates and constructing the final Research Question using 8 evaluation dimensions.',
  'step1b_synthesize':        'Stage 1 · Step 1B → Epistemological Analysis: deep analysis of the final RQ covering knowledge type, variables, scope, and methodology.',
  'step2_search_design':      'Stage 1 · Step 2 → Search String Builder: creating Boolean search strings for databases (Crossref, OpenAIRE, Semantic Scholar, RCAAP).',
  'step3_evidence_extraction':'Stage 1 · Step 4 → Evidence Extractor: extracting structured evidence (claim, methodology, findings, limitations) from scientific papers.',
  'step5_source_selection':   'Stage 1 · Step 5 → Source Selection & CRAAP Analysis: applying the CRAAP test (Currency, Relevance, Authority, Accuracy, Purpose) to evaluate sources.',
  'step4_knowledge_structure':'Stage 1 · Steps 6–7 → Topic Mapper & Mind Map: organising evidence into a thematic hierarchy and visual mind map.',
  'step8_glossary':           'Stage 1 · Step 8 → Scientific Glossary: defining key terms from sources with precision.',
  'step9_explanation':        'Stage 2 · Step 9 → Scientific Explanation Scaffolder: building the evidence-based scientific argument and first draft.',
  'step6_multimodal':         'Stage 2 · Step 10 → Multimodal Output Generator: creating posters, podcast scripts, videocasts, science games, or oral presentations.',
  'step7_reflection':         'Stage 3 → Reflect & Improve: peer review, self-reflection/metacognition, and inquiry extension planning.',
}

function loadManual(): string {
  const manualPath = path.join(process.cwd(), 'docs', 'MANUAL_IBL_FRAMEWORK.md')
  try {
    return fs.readFileSync(manualPath, 'utf-8')
  } catch {
    console.warn('[Assistant] Manual file not found, falling back to empty context.')
    return ''
  }
}

// Truncate manual to fit token budget (approx 8000 chars ≈ 2000 tokens)
function truncateManual(manual: string, maxChars = 8000): string {
  if (manual.length <= maxChars) return manual
  return manual.slice(0, maxChars) + '\n\n[Manual truncated for context window]'
}

export async function POST(req: Request) {
  try {
    const { messages, locale = 'pt-PT', currentStep, currentStage } = await req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ ok: false, error: 'Messages are required' }, { status: 400 })
    }

    const manualContent = truncateManual(loadManual())

    // Build context about the user's current position in the workflow
    const stepContext = currentStep
      ? (STEP_CONTEXT[currentStep] ?? `Step: ${currentStep} (Stage ${currentStage ?? '?'})`)
      : 'Unknown step — user may be on the dashboard or navigating between steps.'

    const systemPrompt = `
Você é o "Copiloto IBL-AI", um assistente especializado em orientar utilizadores no framework de investigação IBL-AI da Universidade do Minho.

POSIÇÃO ATUAL DO UTILIZADOR:
${stepContext}

BASE DE CONHECIMENTO (MANUAL IBL-AI):
---
${manualContent}
---

DIRETRIZES DE RESPOSTA (GUARDLINES):
1. FOCO TOTAL: Responde APENAS sobre o funcionamento da plataforma IBL-AI ou sobre a metodologia Inquiry-Based Learning descrita no manual.
2. RECUSA DE OFF-TOPIC: Se o utilizador perguntar sobre temas não relacionados, responde: "Como Copiloto IBL-AI, só posso ajudar com questões sobre a plataforma e a metodologia IBL. Como posso ajudar no teu projeto hoje?"
3. ANCORAGEM: Não inventes funcionalidades. Se algo não estiver no manual, diz que não tens essa informação.
4. TOM: Profissional, encorajador, direto. Usa "tu" (informal, académico).
5. LÍNGUA: Responde na língua do utilizador (padrão: ${locale}).
6. CONTEXT-AWARE: O utilizador está em "${stepContext}". Usa isto para dar orientações específicas a esta etapa.
8. FORMATO: Usa texto corrido, listas com traço (-) e **negrito** quando útil. NUNCA retornes JSON, código, ou estruturas técnicas. Máximo 200 palavras por resposta.
9. CONCISÃO: Sé direto e prático. Não repitas o enunciado da pergunta.

IMPORTANTE: Age como um guia prático. Ajuda a resolver bloqueios concretos, não apenas a repetir o texto do manual.
`.trim()

    // Use full conversation history for multi-turn context
    // Limit to last 10 messages to avoid token overflow
    const conversationHistory = messages.slice(-10)
    const lastUserMessage = conversationHistory[conversationHistory.length - 1]?.content ?? ''

    // Build a multi-turn prompt by injecting prior turns into the user message
    const historyPrefix = conversationHistory.slice(0, -1)
      .map(m => `${m.role === 'user' ? 'Utilizador' : 'Assistente'}: ${m.content}`)
      .join('\n')

    const contextualUserMessage = historyPrefix
      ? `[Histórico da conversa]\n${historyPrefix}\n\n[Mensagem atual]\n${lastUserMessage}`
      : lastUserMessage

    const { content: aiResponse, tokens, model } = await callChatGPTText(
      systemPrompt,
      contextualUserMessage,
      'assistant_help',
      250  // max output tokens — keeps responses concise
    )

    return NextResponse.json({
      ok: true,
      content: aiResponse,
      model,
      tokens,
    })
  } catch (error) {
    console.error('[Assistant API] Error:', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
