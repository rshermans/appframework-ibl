'use client'

import React, { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import { useI18n } from '@/components/I18nProvider'
import { getIblStepMeta, type IBLStepKey } from '@/lib/iblFramework'

interface ProgressStep {
  stepId: IBLStepKey | null
  i18nKey: string
  done: boolean
  customBadge?: string
}

function useProgressSteps(): ProgressStep[] {
  const state = useWizardStore()
  return [
    { stepId: 'step0_generate', i18nKey: 'progress.topic', done: Boolean(state.topic) },
    { stepId: 'step1_select', i18nKey: 'progress.candidateQuestions', done: (state.candidateResearchQuestions?.length ?? 0) > 0 || (state.rqCandidates?.length ?? 0) > 0 },
    { stepId: 'step1b_synthesize', i18nKey: 'progress.finalQuestion', done: Boolean(state.finalResearchQuestion) },
    { stepId: 'step2_search_design', i18nKey: 'progress.searchDesign', done: Boolean(state.searchDesign) },
    { stepId: null, i18nKey: 'progress.searchRetrieval', done: (state.searchArticles?.length ?? 0) > 0, customBadge: 'Step 3' },
    { stepId: 'step3_evidence_extraction', i18nKey: 'progress.evidence', done: (state.evidenceRecords?.length ?? 0) > 0 },
    { stepId: 'step5_source_selection', i18nKey: 'progress.sourceSelection', done: (state.evidenceRecords?.length ?? 0) > 0 },
    { stepId: 'step4_knowledge_structure', i18nKey: 'progress.knowledgeStructure', done: Boolean(state.knowledgeStructure) },
    { stepId: 'step8_glossary', i18nKey: 'progress.glossary', done: Boolean(state.knowledgeStructure) },
    { stepId: 'step5_explanation', i18nKey: 'progress.explanation', done: Boolean(state.explanationDraft) },
  ]
}

export default function ProgressDashboard() {
  const { t } = useI18n()
  const steps = useProgressSteps()
  const completed = steps.filter((s) => s.done).length
  const total = steps.length
  const pct = Math.round((completed / total) * 100)
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="fixed bottom-0 right-0 left-0 sm:left-auto sm:w-80 glass-panel ambient-shadow z-50">
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="font-label text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--on_surface)]">{t('progress.title')}</span>
            <span className="font-label text-[10px] font-semibold text-[var(--on_surface)] opacity-60">{pct}% ({completed}/{total})</span>
          </div>
          <div className="w-full bg-[var(--surface_container)] h-1.5">
            <div
              className="primary-gradient h-1.5 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <span className="text-[var(--outline_variant)] text-xs flex-shrink-0">{expanded ? '▼' : '▲'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-1 text-xs max-h-52 overflow-y-auto">
          {steps.map((step) => {
            const meta = step.stepId ? getIblStepMeta(step.stepId) : null
            return (
              <div key={step.i18nKey} className="flex items-center gap-2 py-0.5">
                <span className={step.done ? 'text-[var(--secondary)]' : 'text-[var(--outline_variant)]'}>
                  {step.done ? '●' : '○'}
                </span>
                {(meta || step.customBadge) && (
                  <span className="font-label text-[9px] font-semibold uppercase tracking-wide text-[var(--outline_variant)] min-w-[3.5rem]">
                    {step.customBadge || meta?.badge}
                  </span>
                )}
                <span className={step.done ? 'text-[var(--on_surface)] font-medium' : 'text-[var(--on_surface)] opacity-50'}>
                  {t(step.i18nKey)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
