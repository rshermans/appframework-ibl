import { NextResponse } from 'next/server'
import { saveInteraction } from '@/lib/db'
import { getMessage, normalizeLocale, type Locale } from '@/lib/i18n'

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

    await saveInteraction(projectId, stage, stepId, stepLabel, userInput, aiOutput, topic, mode, 0)

    return NextResponse.json({ ok: true })
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