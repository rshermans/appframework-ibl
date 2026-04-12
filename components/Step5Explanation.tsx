'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import type { ExplanationDraft } from '@/types/research-workflow'
import { useI18n } from '@/components/I18nProvider'

export default function Step5Explanation() {
  const { locale, t } = useI18n()
  const {
    evidenceRecords,
    explanationDraft,
    finalResearchQuestion,
    knowledgeStructure,
    projectId,
    setExplanationDraft,
    topic,
  } = useWizardStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [audience, setAudience] = useState<'expert' | 'general'>('expert')

  const canRun = Boolean(
    finalResearchQuestion?.approvedByUser &&
    knowledgeStructure &&
    evidenceRecords.length > 0
  )

  const buildExplanationDraft = async () => {
    if (!finalResearchQuestion?.question) {
      setError(t('steps.step5.locked'))
      return
    }
    if (!knowledgeStructure || evidenceRecords.length === 0) {
      setError(t('steps.step5.locked'))
      return
    }

    setLoading(true)
    setError('')

    try {
      const evidenceJson = JSON.stringify(evidenceRecords, null, 2)
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          stage: 2,
          promptId: 'step9',
          stepId: 'step5_explanation',
          stepLabel: t('workflow.step5_explanation.label'),
          topic,
          rq: finalResearchQuestion.question,
          finalResearchQuestion,
          evidenceRecords,
          knowledgeStructure,
          evidence: evidenceJson,
          audience,
          locale,
        }),
      })

      const payload = await response.json()
      const data = payload?.data ?? payload

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.details || payload?.error || t('api.genericFailure'))
      }

      const parsed = JSON.parse(data.output)
      const nextDraft: ExplanationDraft = {
        outline: Array.isArray(parsed?.outline) ? parsed.outline : [],
        argumentCore: parsed?.argument_core || '',
        evidenceReferences: Array.isArray(parsed?.evidence_references)
          ? parsed.evidence_references
          : [],
        openIssues: Array.isArray(parsed?.open_issues) ? parsed.open_issues : [],
      }

      if (nextDraft.outline.length === 0 || !nextDraft.argumentCore) {
        throw new Error(t('api.genericFailure'))
      }

      setExplanationDraft(nextDraft)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('api.genericFailure'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-xl font-semibold">{t('steps.step5.title')}</h2>
        <p className="text-sm text-gray-600">{t('steps.step5.intro')}</p>
      </div>

      {!canRun && (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {t('steps.step5.locked')}
        </div>
      )}

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="mb-2 text-sm font-semibold text-slate-700">{t('common.audience')}</div>
        <select
          value={audience}
          onChange={(event) => setAudience(event.target.value as 'expert' | 'general')}
          className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="expert">{t('steps.step5.expert')}</option>
          <option value="general">{t('steps.step5.general')}</option>
        </select>
      </div>

      <button
        onClick={buildExplanationDraft}
        disabled={!canRun || loading}
        className="rounded bg-slate-900 px-4 py-3 text-white disabled:opacity-50"
      >
        {loading ? t('steps.step5.generating') : t('steps.step5.generateButton')}
      </button>

      {explanationDraft && (
        <div className="space-y-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div>
            <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
              {t('steps.step5.outline')}
            </div>
            <ol className="space-y-2">
              {explanationDraft.outline.map((item, index) => (
                <li key={`${item}-${index}`} className="rounded border bg-white px-3 py-2 text-sm">
                  {index + 1}. {item}
                </li>
              ))}
            </ol>
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
              {t('steps.step5.argumentCore')}
            </div>
            <div className="rounded border bg-white p-4 text-sm text-slate-900">
              {explanationDraft.argumentCore}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
                {t('steps.step5.evidenceReferences')}
              </div>
              <ul className="space-y-2">
                {explanationDraft.evidenceReferences.map((reference) => (
                  <li key={reference} className="rounded border bg-white px-3 py-2 text-sm text-slate-900">
                    {reference}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
                {t('steps.step5.openIssues')}
              </div>
              <ul className="space-y-2">
                {explanationDraft.openIssues.map((issue) => (
                  <li key={issue} className="rounded border bg-white px-3 py-2 text-sm text-slate-900">
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
