import { NextResponse } from 'next/server'
import { callChatGPT } from '@/lib/ai'
import { buildDefaultUserMessage, getPrompt, resolvePromptId, type PromptMode } from '@/lib/prompts'
import { saveInteraction } from '@/lib/db'
import { auth } from '@/lib/auth'
import { getMissingRequiredFields, resolveWorkflowStepId } from '@/lib/workflow'
import { getMessage, normalizeLocale, type Locale } from '@/lib/i18n'
import { withTimeout, TimeoutError, isAbortedError } from '@/lib/timeoutHelper'
import { API_CONFIG, getTimeRemaining, canContinueProcessing } from '@/lib/apiTimeout'

export async function POST(req: Request) {
  const startTime = Date.now()
  let safeLocale: Locale = 'pt-PT'

  try {
    // Check if we have time to process
    if (!canContinueProcessing(startTime, 5000)) {
      console.error('[API] Insufficient time to process request')
      return NextResponse.json(
        {
          ok: false,
          error: 'Server timeout - insufficient processing time',
          details: 'The request could not be processed within the available time window.',
        },
        { status: 504 }
      )
    }

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
      aiConsentAccepted,
    } = body

    if (aiConsentAccepted !== true) {
      return NextResponse.json(
        {
          ok: false,
          error: getMessage(safeLocale, 'api.aiConsentRequired'),
          details: getMessage(safeLocale, 'api.aiConsentRequired'),
        },
        { status: 403 }
      )
    }

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
    console.log(`[API] Time remaining: ${getTimeRemaining(startTime)}ms`)

    const systemPrompt = getPrompt(safePromptKey, promptVariables, { mode: safeMode, locale: safeLocale })
    console.log(`[API] Generated system prompt for prompt: ${resolvedPromptId}`)

    const userMessage =
      content || buildDefaultUserMessage(safePromptKey, promptVariables, { mode: safeMode, locale: safeLocale })
    console.log(`[API] Calling ChatGPT with user message length: ${userMessage.length}`)

    // Check time before expensive operation
    if (!canContinueProcessing(startTime, 5000)) {
      console.error('[API] Insufficient time before ChatGPT call')
      return NextResponse.json(
        {
          ok: false,
          error: 'Server timeout - insufficient time for AI processing',
          details: 'The request is taking too long. Try again.',
        },
        { status: 504 }
      )
    }

    // Call ChatGPT with timeout enforcement + hybrid model selection
    const { content: aiOutput, tokens, model: usedModel } = await withTimeout(
      callChatGPT(systemPrompt, userMessage, safeStepId),
      { timeoutMs: API_CONFIG.FUNCTION_TIMEOUT_MS - 3000 } // 22s timeout for API level
    )

    console.log(`[API] ChatGPT responded with ${tokens} tokens using model: ${usedModel}`)
    console.log(`[API] Time remaining after ChatGPT: ${getTimeRemaining(startTime)}ms`)

    let dbSaved = false
    let dbError: string | null = null
    if (projectId) {
      const session = await auth()
      const userId = (session?.user as { id?: string } | undefined)?.id
      dbSaved = true
      // Fire and forget - don't await database save to avoid timeout
      saveInteraction(
        projectId,
        parsedStage,
        safeStepId,
        safeStepLabel,
        userMessage,
        aiOutput,
        topic,
        safeMode,
        tokens,
        userId
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

    const responseTime = Date.now() - startTime
    console.log(`[API] Total response time: ${responseTime}ms`)

    return NextResponse.json({
      ok: true,
      data: {
        output: aiOutput,
        tokens,
        model: usedModel,
        promptId: resolvedPromptId,
        stepId: safeStepId,
        stepLabel: safeStepLabel,
        dbSaved,
        dbError,
        responseTime,
      },
      output: aiOutput,
      tokens,
      model: usedModel,
      promptId: resolvedPromptId,
      stepId: safeStepId,
      stepLabel: safeStepLabel,
      dbSaved,
      dbError,
    })
  } catch (error) {
    const isTimeout = error instanceof TimeoutError || isAbortedError(error)
    const statusCode = isTimeout ? 504 : 500
    const errorType = isTimeout ? 'TIMEOUT' : 'ERROR'
    const errorMsg = error instanceof Error ? error.message : String(error)
    const responseTime = Date.now() - startTime

    console.error(`[API] ${errorType} (${responseTime}ms elapsed):`, errorMsg)
    console.error('Error details:', error)

    return NextResponse.json(
      {
        ok: false,
        error: isTimeout ? 'Request timeout' : getMessage(safeLocale, 'api.genericFailure'),
        errorType,
        details: errorMsg,
        responseTime,
      },
      { status: statusCode }
    )
  }
}
