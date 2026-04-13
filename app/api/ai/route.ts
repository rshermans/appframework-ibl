import { NextResponse } from 'next/server'
import { callChatGPT } from '@/lib/ai'
import { buildDefaultUserMessage, getPrompt, resolvePromptId, type PromptMode } from '@/lib/prompts'
import { saveInteraction } from '@/lib/db'
import { getMissingRequiredFields, resolveWorkflowStepId } from '@/lib/workflow'
import { getMessage, normalizeLocale, type Locale } from '@/lib/i18n'

export async function POST(req: Request) {
  let safeLocale: Locale = 'pt-PT'

  try {
    const body = await req.json()
    const {
      projectId,
      stage,
      promptId,
      stepId,
      stepLabel,
      topic,
      rq,
      selectedRQs,
      finalRQ,
      context,
      content,
      locale,
      mode = 'standard',
    } = body

    const parsedStage = typeof stage === 'number' ? stage : Number(stage) || 0
    const safeStepId = stepId || 'unknown-step'
    const safePromptKey = promptId || stepId || 'generic_guidance'
    const resolvedPromptId = resolvePromptId(safePromptKey)
    const resolvedWorkflowStep = stepId ? resolveWorkflowStepId(safeStepId) : null
    const safeStepLabel = stepLabel || 'AI response'
    safeLocale = normalizeLocale(locale)
    const safeMode: PromptMode =
      mode === 'quick' || mode === 'advanced' || mode === 'standard' ? mode : 'standard'
    const finalResearchQuestion = body.finalResearchQuestion
    const resolvedRQ =
      rq ||
      finalRQ ||
      (typeof finalResearchQuestion?.question === 'string' ? finalResearchQuestion.question : '')
    const promptVariables = {
      TOPIC: topic || '',
      RQ: resolvedRQ,
      LEVEL: body.level || '',
      SOURCE: body.source || '',
      EVIDENCE: body.evidence || '',
      AUDIENCE: body.audience || '',
      CONTENT: content || '',
      CONTEXT: context || '',
      FINAL_RQ: finalRQ || resolvedRQ,
      SELECTED_RQS: Array.isArray(selectedRQs) ? selectedRQs.join('\n') : resolvedRQ,
    }
    const missingFields = resolvedWorkflowStep
      ? getMissingRequiredFields(resolvedWorkflowStep, {
          topic,
          level: body.level,
          selectedQuestions: body.selectedQuestions || selectedRQs,
          comparisonResult: body.comparisonResult,
          finalResearchQuestion: finalResearchQuestion || finalRQ,
          searchDesign: body.searchDesign,
          source: body.source,
          evidenceRecords: body.evidenceRecords,
          knowledgeStructure: body.knowledgeStructure,
          explanationDraft: body.explanationDraft,
          multimodalPlan: body.multimodalPlan,
          reflection: body.reflection,
          mode: safeMode,
        })
      : []

    if (resolvedWorkflowStep && missingFields.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: getMessage(safeLocale, 'api.missingRequiredInputs'),
          details: `${getMessage(safeLocale, 'api.missingRequiredInputs')}: ${missingFields.join(', ')}`,
          missingFields,
          workflowStep: resolvedWorkflowStep,
        },
        { status: 400 }
      )
    }

    if (
      resolvedWorkflowStep === 'step2_search_design' &&
      !finalResearchQuestion?.approvedByUser
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: getMessage(safeLocale, 'api.finalQuestionRequired'),
          details: getMessage(safeLocale, 'api.finalQuestionRequired'),
          workflowStep: resolvedWorkflowStep,
        },
        { status: 400 }
      )
    }

    if (
      resolvedWorkflowStep === 'step3_evidence_extraction' &&
      !body.searchDesign
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: getMessage(safeLocale, 'api.searchDesignRequired'),
          details: getMessage(safeLocale, 'api.searchDesignRequired'),
          workflowStep: resolvedWorkflowStep,
        },
        { status: 400 }
      )
    }

    console.log(`[API] Received request - Step: ${safeStepId}, Prompt: ${resolvedPromptId}, Topic: ${topic}`)

    const systemPrompt = getPrompt(safePromptKey, promptVariables, { mode: safeMode, locale: safeLocale })
    console.log(`[API] Generated system prompt for prompt: ${resolvedPromptId}`)

    const userMessage =
      content || buildDefaultUserMessage(safePromptKey, promptVariables, { mode: safeMode, locale: safeLocale })
    console.log(`[API] Calling ChatGPT with user message length: ${userMessage.length}`)

    const { content: aiOutput, tokens } = await callChatGPT(systemPrompt, userMessage)
    console.log(`[API] ChatGPT responded with ${tokens} tokens`)

    let dbSaved = false
    let dbError: string | null = null
    if (projectId) {
      dbSaved = true
      saveInteraction(
        projectId,
        parsedStage,
        safeStepId,
        safeStepLabel,
        userMessage,
        aiOutput,
        topic,
        safeMode,
        tokens
      )
        .then(() => {
          console.log('[API] Background: saved interaction to database')
        })
        .catch((saveErr) => {
          dbSaved = false
          dbError = saveErr instanceof Error ? saveErr.message : String(saveErr)
          console.error(`[API] Background: database save failed: ${dbError}`)
        })
    }

    return NextResponse.json({
      ok: true,
      data: {
        output: aiOutput,
        tokens,
        promptId: resolvedPromptId,
        stepId: safeStepId,
        stepLabel: safeStepLabel,
        dbSaved,
        dbError,
      },
      output: aiOutput,
      tokens,
      promptId: resolvedPromptId,
      stepId: safeStepId,
      stepLabel: safeStepLabel,
      dbSaved,
      dbError,
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[API] Error: ${errorMsg}`)
    console.error('Error details:', error)

    return NextResponse.json(
      {
        ok: false,
        error: getMessage(safeLocale, 'api.genericFailure'),
        details: errorMsg,
      },
      { status: 500 }
    )
  }
}
