'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import type { SearchArticle } from '@/types/research-workflow'
import { useI18n } from '@/components/I18nProvider'
import { parseAiJsonWithOptions } from '@/lib/parseAiJson'
import { safeFetch } from '@/lib/safeFetch'
import { persistInteractionEvent } from '@/lib/interactionClient'
import {
  buildEvidenceRecord,
  isCompleteEvidenceExtraction,
  type RawEvidenceExtraction,
} from '@/lib/evidenceHelpers'

/** Evidence extraction (Step 3/4): one AI call per source, results stored as EvidenceRecords. */
export function useEvidenceExtraction() {
  const { locale, t } = useI18n()
  const {
    addEvidenceRecord,
    addInteraction,
    finalResearchQuestion,
    projectId,
    searchDesign,
    topic,
  } = useWizardStore()
  const isPortuguese = locale === 'pt-PT'
  const [sourceText, setSourceText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null)
  const [analyzedSourceIds, setAnalyzedSourceIds] = useState<Set<string>>(new Set())

  const extractFromSource = async (
    source: string,
    sourceId: string,
    sourceArticle?: SearchArticle
  ) => {
    if (!finalResearchQuestion?.question) {
      setError(t('steps.step3.locked'))
      return
    }

    if (!searchDesign) {
      setError(t('steps.step3.locked'))
      return
    }

    if (!source.trim()) {
      setError(t('steps.step3.sourceRequired'))
      return
    }

    setLoading(true)
    setActiveSourceId(sourceId)
    setError('')

    try {
      const { response: res, json } = await safeFetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          stage: 1,
          promptId: 'step4',
          stepId: 'step3',
          stepLabel: t('workflow.step3_evidence_extraction.label'),
          topic,
          rq: finalResearchQuestion.question,
          finalResearchQuestion,
          searchDesign,
          source,
          locale,
        }),
      })

      const payload = json?.data ?? json

      if (!res.ok || !json?.ok) {
        throw new Error((json?.details || json?.error || t('api.genericFailure')) as string)
      }

      const parsed = parseAiJsonWithOptions<RawEvidenceExtraction>(payload.output, {
        validate: (value) => isCompleteEvidenceExtraction(value),
        errorMessage: isPortuguese
          ? 'A IA devolveu uma extração de evidência incompleta. É obrigatório incluir uma tese e pelo menos um resultado.'
          : 'AI returned an incomplete evidence extraction. It must include a claim and at least one finding.',
      })
      const nextEvidenceRecord = buildEvidenceRecord(parsed, sourceArticle)
      const sourceType = nextEvidenceRecord.sourceType

      if (!nextEvidenceRecord.claim || nextEvidenceRecord.findings.length === 0) {
        throw new Error(t('api.genericFailure'))
      }

      addEvidenceRecord(nextEvidenceRecord)
      addInteraction({
        id: `interaction-${Date.now()}`,
        stage: 1,
        stepId: 'step3_evidence_extraction',
        stepLabel: t('workflow.step3_evidence_extraction.label'),
        promptId: 'step4',
        eventType: sourceId === 'manual' ? 'generate' : 'analyze',
        userInput: sourceArticle?.title || source.slice(0, 300),
        aiOutput: JSON.stringify(nextEvidenceRecord),
        mode: 'standard',
        success: true,
        metadata: {
          sourceType,
          findingsCount: nextEvidenceRecord.findings.length,
          provider: sourceArticle?.provider || 'manual',
        },
        createdAt: new Date().toISOString(),
      })
      if (projectId) {
        void persistInteractionEvent({
          projectId,
          stage: 1,
          stepId: 'step3_evidence_extraction',
          stepLabel: t('workflow.step3_evidence_extraction.label'),
          userInput: sourceArticle?.title || source.slice(0, 300),
          aiOutput: JSON.stringify({
            eventType: sourceId === 'manual' ? 'generate' : 'analyze',
            claim: nextEvidenceRecord.claim,
            findingsCount: nextEvidenceRecord.findings.length,
            provider: sourceArticle?.provider || 'manual',
          }),
          topic,
          mode: 'standard',
          locale,
        }).catch(() => null)
      }
      if (sourceId === 'manual') {
        setSourceText('')
      } else {
        setAnalyzedSourceIds((current) => {
          const next = new Set(current)
          next.add(sourceId)
          return next
        })
      }
    } catch (err) {
      addInteraction({
        id: `interaction-${Date.now()}`,
        stage: 1,
        stepId: 'step3_evidence_extraction',
        stepLabel: t('workflow.step3_evidence_extraction.label'),
        promptId: 'step4',
        eventType: sourceId === 'manual' ? 'generate' : 'analyze',
        userInput: sourceArticle?.title || source.slice(0, 300),
        aiOutput: err instanceof Error ? err.message : t('api.genericFailure'),
        mode: 'standard',
        success: false,
        createdAt: new Date().toISOString(),
      })
      if (projectId) {
        void persistInteractionEvent({
          projectId,
          stage: 1,
          stepId: 'step3_evidence_extraction',
          stepLabel: t('workflow.step3_evidence_extraction.label'),
          userInput: sourceArticle?.title || source.slice(0, 300),
          aiOutput: JSON.stringify({
            eventType: sourceId === 'manual' ? 'generate' : 'analyze',
            error: err instanceof Error ? err.message : t('api.genericFailure'),
          }),
          topic,
          mode: 'standard',
          locale,
        }).catch(() => null)
      }
      setError(err instanceof Error ? err.message : t('api.genericFailure'))
    } finally {
      setLoading(false)
      setActiveSourceId(null)
    }
  }

  const runManualExtraction = async () => {
    await extractFromSource(sourceText, 'manual')
  }

  return {
    sourceText,
    setSourceText,
    loading,
    error,
    setError,
    activeSourceId,
    analyzedSourceIds,
    extractFromSource,
    runManualExtraction,
  }
}
