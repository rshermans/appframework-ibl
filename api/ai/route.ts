import { NextResponse } from 'next/server'
import { callChatGPT } from '@/lib/ai'
import { getPrompt } from '@/lib/prompts'
import { saveInteraction } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      projectId,
      stage,
      stepId,
      stepLabel,
      topic,
      rq,
      content,
      mode = 'standard',
    } = body

    const parsedStage = typeof stage === 'number' ? stage : Number(stage) || 0
    const safeStepId = stepId || 'unknown-step'
    const safeStepLabel = stepLabel || 'AI response'

    console.log(`[API] Received request - Step: ${safeStepId}, Topic: ${topic}`)

    // Get the prompt template
    const systemPrompt = getPrompt(safeStepId, { TOPIC: topic || '', RQ: rq || '' })
    console.log(`[API] Generated system prompt for step: ${safeStepId}`)

    // Call ChatGPT
    const userMessage = content || `Please provide guidance for ${safeStepLabel}`
    console.log(`[API] Calling ChatGPT with user message length: ${userMessage.length}`)

    const { content: aiOutput, tokens } = await callChatGPT(systemPrompt, userMessage)
    console.log(`[API] ChatGPT responded with ${tokens} tokens`)

    // Save to database (non-blocking for AI response)
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
          mode,
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
      output: aiOutput,
      tokens,
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
      { error: 'Failed to process request', details: errorMsg },
      { status: 500 }
    )
  }
}
