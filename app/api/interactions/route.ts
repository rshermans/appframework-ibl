import { NextResponse } from 'next/server'
import { saveInteraction } from '@/lib/db'
import { getMessage, normalizeLocale, type Locale } from '@/lib/i18n'
import { enrichInteraction } from '@/lib/telemetry/processor'

export async function POST(req: Request) {
  let locale: Locale = 'pt-PT'

  try {
    const body = await req.json()
    locale = normalizeLocale(body?.locale)

    const projectId = String(body?.projectId || '').trim()
    const stage = Number(body?.stage || 0)
    const stepId = String(body?.stepId || '').trim()
    const stepLabel = String(body?.stepLabel || '').trim()
    const userInput = String(body?.userInput || '')
    const aiOutput = String(body?.aiOutput || '')
    const topic = typeof body?.topic === 'string' ? body.topic : undefined
    const mode = typeof body?.mode === 'string' ? body.mode : undefined
    const tokens = Number(body?.tokens || 0)
    const eventType = typeof body?.eventType === 'string' ? body.eventType : undefined
    
    // Telemetry fields
    const userId = body?.userId ? String(body.userId) : undefined
    const sessionId = body?.sessionId ? String(body.sessionId) : undefined
    const metadata = {
      ...(body?.metadata || {}),
      ...(eventType ? { eventType } : {}),
    }

    if (!projectId || !stepId || !stepLabel) {
      return NextResponse.json(
        {
          ok: false,
          error: getMessage(locale, 'api.missingRequiredInputs'),
          details: 'projectId, stepId, and stepLabel are required.',
        },
        { status: 400 }
      )
    }

    const interaction = await saveInteraction(
      projectId, 
      stage, 
      stepId, 
      stepLabel, 
      userInput, 
      aiOutput, 
      topic, 
      mode, 
      tokens,
      userId,
      sessionId,
      metadata
    )

    // Trigger asynchronous enrichment (Cognitive/Affective layers)
    // We do not await this to return the response immediately to the user.
    void enrichInteraction(interaction.id).catch(err => {
      console.error(`[Telemetry API] Background enrichment error:`, err)
    })

    return NextResponse.json({ ok: true, id: interaction.id })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getMessage(locale, 'api.genericFailure'),
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}