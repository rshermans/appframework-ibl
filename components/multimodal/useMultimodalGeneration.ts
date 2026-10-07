'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import { useI18n } from '@/components/I18nProvider'
import { parseAiJson } from '@/lib/parseAiJson'
import { retryWithBackoff } from '@/lib/retryHelper'
import { safeFetch } from '@/lib/safeFetch'
import { isValidMultimodalArtifact } from '@/lib/multimodalContract'
import {
  ARTIFACT_LABELS,
  KIND_CONFIG,
  assembleArtifact,
  buildEvidenceDigest,
  normalizePlan,
  runPool,
  unwrapPart,
  type MultimodalKind,
} from '@/lib/multimodalParts'

const PART_CONCURRENCY = 3
const STEP_ID = 'step6_multimodal'

export interface GenerationProgress {
  phase: 'plan' | 'parts'
  done: number
  total: number
}

interface GenerateOptions {
  /** Target duration in minutes (podcast / oral presentation). */
  durationMinutes?: number
}

/** A failure with a learner-facing message and a technical detail they can copy to report it. */
class GenerationError extends Error {
  constructor(message: string, public detail: string) {
    super(message)
    this.name = 'GenerationError'
  }
}

export function useMultimodalGeneration(kind: MultimodalKind) {
  const { locale } = useI18n()
  const pt = locale === 'pt-PT'
  const store = useWizardStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errorDetail, setErrorDetail] = useState('')
  const [progress, setProgress] = useState<GenerationProgress | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const canGenerate = Boolean(store.explanationDraft) && store.evidenceRecords.length > 0

  const callAi = useCallback(
    async (extra: Record<string, unknown>, signal: AbortSignal): Promise<unknown> => {
      const { response, json: payload } = await retryWithBackoff(
        () =>
          safeFetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal,
            body: JSON.stringify({
              projectId: store.projectId,
              topic: store.topic,
              locale,
              stage: 2,
              stepId: STEP_ID,
              rq: store.finalResearchQuestion?.question ?? '',
              audience: store.audience,
              explanationDraft: store.explanationDraft,
              kind,
              ...extra,
            }),
          }),
        { maxAttempts: 2, initialDelayMs: 800, maxDelayMs: 2000 }
      )

      if (!response.ok || !payload?.ok) {
        if (response.status === 504) {
          throw new Error(
            pt
              ? 'O servidor demorou demasiado a responder. Tente de novo ou use "Exportar para NotebookLM".'
              : 'The server took too long to respond. Try again or use "Export to NotebookLM".'
          )
        }
        throw new Error((payload?.details || payload?.error || 'API error') as string)
      }
      return parseAiJson<unknown>((payload?.data ?? payload).output)
    },
    [kind, locale, pt, store.audience, store.explanationDraft, store.finalResearchQuestion, store.projectId, store.topic]
  )

  const cancel = useCallback(() => abortRef.current?.abort(), [])

  const generate = useCallback(
    async ({ durationMinutes = 10 }: GenerateOptions = {}) => {
      if (loading) return
      const records = store.evidenceRecords
      if (!canGenerate) {
        setError(
          pt
            ? 'Complete o Step 9 (explicação científica) e a evidência antes de gerar.'
            : 'Complete Step 9 (scientific explanation) and the evidence before generating.'
        )
        return
      }

      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      setError('')
      setErrorDetail('')

      try {
        const config = KIND_CONFIG[kind]
        const digest = buildEvidenceDigest(records)

        setProgress({ phase: 'plan', done: 0, total: 1 })
        const rawPlan = await callAi(
          {
            promptId: 'multimodal_plan',
            stepLabel: `Plan - ${ARTIFACT_LABELS[kind]}`,
            evidence: digest,
            duration: durationMinutes,
            minItems: config.minItems,
            maxItems: config.maxItems,
          },
          controller.signal
        )
        let plan
        try {
          plan = normalizePlan(rawPlan, kind, records)
        } catch (planError) {
          throw new GenerationError(
            pt ? 'A IA não devolveu um plano utilizável. Tente de novo.' : 'The AI did not return a usable plan. Please try again.',
            planError instanceof Error ? planError.message : String(planError)
          )
        }
        const planJson = JSON.stringify(plan)

        setProgress({ phase: 'parts', done: 0, total: plan.items.length })
        let done = 0
        const parts = await runPool(
          plan.items.map((item, index) => async () => {
            let lastIssue = ''
            // One extra attempt when the answer arrives without usable content (e.g. empty or off-schema).
            for (let attempt = 1; attempt <= 2; attempt += 1) {
              const part = await callAi(
                {
                  promptId: 'multimodal_part',
                  stepLabel: `Part ${index + 1}/${plan.items.length} - ${ARTIFACT_LABELS[kind]}`,
                  evidence: digest,
                  plan: planJson,
                  partIndex: index + 1,
                  partTotal: plan.items.length,
                  partFocus: item.focus,
                  shape: config.shape,
                },
                controller.signal
              )
              try {
                const record = unwrapPart(part, kind)
                setProgress({ phase: 'parts', done: ++done, total: plan.items.length })
                return record
              } catch (partError) {
                lastIssue = partError instanceof Error ? partError.message : String(partError)
              }
            }
            throw new GenerationError(
              pt
                ? `A parte ${index + 1} de ${plan.items.length} veio sem conteúdo utilizável. Tente gerar de novo.`
                : `Part ${index + 1} of ${plan.items.length} came back without usable content. Please try again.`,
              lastIssue
            )
          }),
          PART_CONCURRENCY,
          controller.signal
        )

        const meta = { durationMinutes }
        const artifact =
          kind === 'poster' ? assembleArtifact('poster', plan, parts, records, meta)
          : kind === 'podcast' ? assembleArtifact('podcast', plan, parts, records, meta)
          : kind === 'video' ? assembleArtifact('video', plan, parts, records, meta)
          : kind === 'game' ? assembleArtifact('game', plan, parts, records, meta)
          : assembleArtifact('oral', plan, parts, records, meta)

        if (!isValidMultimodalArtifact(kind, artifact)) {
          throw new Error(pt ? 'A IA devolveu partes incompletas. Tente de novo.' : 'The AI returned incomplete parts. Please try again.')
        }

        if (kind === 'poster') store.setMultimodalPoster(artifact as never)
        else if (kind === 'podcast') store.setMultimodalPodcast(artifact as never)
        else if (kind === 'video') store.setMultimodalVideocast(artifact as never)
        else if (kind === 'game') store.setMultimodalGame(artifact as never)
        else store.setMultimodalOral(artifact as never)
        store.setEvidenceFidelityScore(artifact.fidelityScore)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setError(pt ? 'Geração cancelada.' : 'Generation cancelled.')
        } else if (err instanceof GenerationError) {
          setError(err.message)
          setErrorDetail(err.detail)
        } else {
          setError(err instanceof Error ? err.message : String(err))
          setErrorDetail(err instanceof Error ? `${err.name}: ${err.message}` : String(err))
        }
      } finally {
        setLoading(false)
        setProgress(null)
        abortRef.current = null
      }
    },
    [callAi, canGenerate, kind, loading, pt, store]
  )

  return { generate, cancel, loading, error, errorDetail, progress, canGenerate }
}
