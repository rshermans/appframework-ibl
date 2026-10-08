'use client'

import { useCallback } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import { useI18n } from '@/components/I18nProvider'
import { parseAiJson } from '@/lib/parseAiJson'
import { retryWithBackoff } from '@/lib/retryHelper'
import { safeFetch } from '@/lib/safeFetch'
import { buildEvidenceDigest } from '@/lib/multimodalParts'
import { projectContextSummary } from '@/lib/stage3'

type Stage3PromptId = 'self_assessment' | 'reflection_journal' | 'inquiry_extension'

/** Turns transport/timeouts into a message a learner can act on. */
export function friendlyAiError(error: unknown, pt: boolean): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/timeout|timed out|aborted|504|502/i.test(message)) {
    return pt
      ? 'A IA demorou demasiado a responder. O seu trabalho está guardado — tente novamente dentro de instantes.'
      : 'The AI took too long to respond. Your work is saved — please try again in a moment.'
  }
  if (/consent|consentimento/i.test(message)) {
    return pt ? 'É necessário aceitar o uso de IA para continuar.' : 'You need to accept AI use to continue.'
  }
  return pt ? `Não foi possível obter ajuda da IA (${message}).` : `Could not get AI help (${message}).`
}

/** One place that builds the grounded context for every Stage 3 AI call. */
export function useStage3Ai() {
  const { locale } = useI18n()
  const pt = locale === 'pt-PT'
  const store = useWizardStore()

  const context = projectContextSummary({
    pt,
    evidenceCount: store.evidenceRecords.length,
    hasStructure: Boolean(store.knowledgeStructure),
    hasExplanation: Boolean(store.explanationDraft?.argumentCore),
    outputs: Object.entries(store.multimodalOutputs).filter(([, value]) => Boolean(value)).map(([key]) => key),
    journalEntries: store.reflectionJournal.length,
  })

  const call = useCallback(
    async (promptId: Stage3PromptId, extra: Record<string, unknown> = {}): Promise<unknown> => {
      const { response, json: payload } = await retryWithBackoff(
        () =>
          safeFetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: store.projectId,
              topic: store.topic,
              locale,
              stage: 3,
              promptId,
              stepId: 'step7_reflection',
              stepLabel: promptId,
              rq: store.finalResearchQuestion?.question ?? '',
              finalResearchQuestion: store.finalResearchQuestion,
              context,
              evidence: buildEvidenceDigest(store.evidenceRecords, 2400),
              explanation: store.explanationDraft?.argumentCore ?? '',
              ...extra,
            }),
          }),
        { maxAttempts: 2, initialDelayMs: 1500, maxDelayMs: 3000 }
      )
      if (!response.ok || !payload?.ok) throw new Error(String(payload?.details || payload?.error || 'API error'))
      const data = payload?.data ?? payload
      return parseAiJson<unknown>(data.output)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.projectId, store.topic, store.finalResearchQuestion, store.evidenceRecords, store.explanationDraft, locale, context]
  )

  return { call, pt, context, friendly: (error: unknown) => friendlyAiError(error, pt) }
}
