import { NextResponse } from 'next/server'
import { callChatGPT } from '@/lib/ai'
import { buildDefaultUserMessage, getPrompt, resolvePromptId, type PromptMode } from '@/lib/prompts'
import { saveInteraction } from '@/lib/db'
import { getMissingRequiredFields, resolveWorkflowStepId } from '@/lib/workflow'

export async function POST(req: Request) {
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
      mode = 'standard',
    } = body

    const parsedStage = typeof stage === 'number' ? stage : Number(stage) || 0
    const safeStepId = stepId || 'unknown-step'
    const safePromptKey = promptId || stepId || 'generic_guidance'
    const resolvedPromptId = resolvePromptId(safePromptKey)
    const resolvedWorkflowStep = stepId ? resolveWorkflowStepId(safeStepId) : null
    const safeStepLabel = stepLabel || 'AI response'
    const safeMode: PromptMode =
      mode === 'quick' || mode === 'advanced' || mode === 'standard' ? mode : 'standard'
    const promptVariables = {
      TOPIC: topic || '',
      RQ: rq || '',
      LEVEL: body.level || '',
      SOURCE: body.source || '',
      EVIDENCE: body.evidence || '',
      AUDIENCE: body.audience || '',
      CONTENT: content || '',
      CONTEXT: context || '',
      FINAL_RQ: finalRQ || rq || '',
      SELECTED_RQS: Array.isArray(selectedRQs) ? selectedRQs.join('\n') : rq || '',
    }
    const missingFields = resolvedWorkflowStep
      ? getMissingRequiredFields(resolvedWorkflowStep, {
          topic,
          level: body.level,
          selectedQuestions: body.selectedQuestions || selectedRQs,
          comparisonResult: body.comparisonResult,
          finalResearchQuestion: body.finalResearchQuestion || finalRQ,
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
          error: 'Missing required step inputs',
          details: `Missing fields for ${resolvedWorkflowStep}: ${missingFields.join(', ')}`,
          missingFields,
          workflowStep: resolvedWorkflowStep,
        },
        { status: 400 }
      )
    }

    console.log(`[API] Received request - Step: ${safeStepId}, Prompt: ${resolvedPromptId}, Topic: ${topic}`)

    const systemPrompt = getPrompt(safePromptKey, promptVariables, { mode: safeMode })
    console.log(`[API] Generated system prompt for prompt: ${resolvedPromptId}`)

    const userMessage =
      content || buildDefaultUserMessage(safePromptKey, promptVariables, { mode: safeMode })
    console.log(`[API] Calling ChatGPT with user message length: ${userMessage.length}`)

    const { content: aiOutput, tokens } = await callChatGPT(systemPrompt, userMessage)
    console.log(`[API] ChatGPT responded with ${tokens} tokens`)

    let dbSaved = false
    let dbError: string | null = null
    if (projectId) {
      try {
        await saveInteraction(
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
        dbSaved = true
        console.log('[API] Saved interaction to database')
      } catch (saveErr) {
        dbError = saveErr instanceof Error ? saveErr.message : String(saveErr)
        console.error(`[API] Database save failed: ${dbError}`)
      }
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
        error: 'Failed to process request',
        details: errorMsg,
      },
      { status: 500 }
    )
  }
}
