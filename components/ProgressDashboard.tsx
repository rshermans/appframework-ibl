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
    { stepId: 'step9_explanation', i18nKey: 'progress.explanation', done: Boolean(state.explanationDraft) },
  ]
}

export default function ProgressDashboard() {
  const { t, locale } = useI18n()
  const { stage, multimodalOutputs, peerReviews, selfAssessment, reflectionJournal, extensionPlan } = useWizardStore()
  const pt = locale === 'pt-PT'
  const stage1Steps = useProgressSteps()
  const stage1Completed = stage1Steps.filter((s) => s.done).length
  const stage1Total = stage1Steps.length
  const stage1Pct = Math.round((stage1Completed / stage1Total) * 100)

  const stage2Done = [
    Boolean(multimodalOutputs.poster),
    Boolean(multimodalOutputs.podcast),
    Boolean(multimodalOutputs.videocast),
    Boolean(multimodalOutputs.game),
    Boolean(multimodalOutputs.oral),
  ]
  const stage2Completed = stage2Done.filter(Boolean).length
  const stage2Total = stage2Done.length
  const stage2Pct = Math.round((stage2Completed / stage2Total) * 100)

  const stage3Done = [
    peerReviews.length > 0,
    Boolean(selfAssessment),
    reflectionJournal.length > 0,
    Boolean(extensionPlan),
  ]
  const stage3Completed = stage3Done.filter(Boolean).length
  const stage3Total = stage3Done.length
  const stage3Pct = Math.round((stage3Completed / stage3Total) * 100)

  const activeStagePct = stage === 1 ? stage1Pct : stage === 2 ? stage2Pct : stage3Pct
  const activeStageCompleted = stage === 1 ? stage1Completed : stage === 2 ? stage2Completed : stage3Completed
  const activeStageTotal = stage === 1 ? stage1Total : stage === 2 ? stage2Total : stage3Total
  const overallPct = Math.round((stage1Pct + stage2Pct + stage3Pct) / 3)
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
            <span className="font-label text-[10px] font-semibold text-[var(--on_surface)] opacity-60">
              {pt ? `Global ${overallPct}%` : `Overall ${overallPct}%`}
            </span>
          </div>
          <div className="w-full bg-[var(--surface_container)] h-1.5">
            <div
              className="primary-gradient h-1.5 transition-all"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>
        <span className="text-[var(--outline_variant)] text-xs flex-shrink-0">{expanded ? '▼' : '▲'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-1 text-xs max-h-52 overflow-y-auto">
          <div className="rounded-[var(--radius-sm)] bg-[var(--surface_container)] px-2 py-1.5 text-[11px] text-[var(--on_surface)]">
            <span className="font-semibold">{pt ? 'Stage ativo:' : 'Active stage:'} </span>
            <span>{stage === 1 ? 'Stage 1' : stage === 2 ? 'Stage 2' : 'Stage 3'}</span>
            <span className="opacity-70"> · {activeStagePct}% ({activeStageCompleted}/{activeStageTotal})</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 py-1">
            <div className="rounded-[var(--radius-sm)] bg-[var(--surface_container)] px-2 py-1 text-center">
              <p className="text-[10px] font-semibold text-[var(--on_surface)]">S1</p>
              <p className="text-[10px] text-[var(--on_surface_variant)]">{stage1Pct}%</p>
            </div>
            <div className="rounded-[var(--radius-sm)] bg-[var(--surface_container)] px-2 py-1 text-center">
              <p className="text-[10px] font-semibold text-[var(--on_surface)]">S2</p>
              <p className="text-[10px] text-[var(--on_surface_variant)]">{stage2Pct}%</p>
            </div>
            <div className="rounded-[var(--radius-sm)] bg-[var(--surface_container)] px-2 py-1 text-center">
              <p className="text-[10px] font-semibold text-[var(--on_surface)]">S3</p>
              <p className="text-[10px] text-[var(--on_surface_variant)]">{stage3Pct}%</p>
            </div>
          </div>

          {stage === 1 && stage1Steps.map((step) => {
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

          {stage === 2 && (
            <div className="space-y-1">
              {[
                { id: 'poster', done: Boolean(multimodalOutputs.poster), labelPt: 'Poster', labelEn: 'Poster' },
                { id: 'podcast', done: Boolean(multimodalOutputs.podcast), labelPt: 'Podcast', labelEn: 'Podcast' },
                { id: 'video', done: Boolean(multimodalOutputs.videocast), labelPt: 'Videocast', labelEn: 'Videocast' },
                { id: 'game', done: Boolean(multimodalOutputs.game), labelPt: 'Jogo', labelEn: 'Game' },
                { id: 'oral', done: Boolean(multimodalOutputs.oral), labelPt: 'Apresentação', labelEn: 'Presentation' },
              ].map((item) => (
                <div key={item.id} className="flex items-center gap-2 py-0.5">
                  <span className={item.done ? 'text-[var(--secondary)]' : 'text-[var(--outline_variant)]'}>
                    {item.done ? '●' : '○'}
                  </span>
                  <span className={item.done ? 'text-[var(--on_surface)] font-medium' : 'text-[var(--on_surface)] opacity-50'}>
                    {pt ? item.labelPt : item.labelEn}
                  </span>
                </div>
              ))}
            </div>
          )}

          {stage === 3 && (
            <div className="space-y-1">
              {[
                { id: 'peer', done: peerReviews.length > 0, labelPt: 'Revisão por pares', labelEn: 'Peer review' },
                { id: 'self', done: Boolean(selfAssessment), labelPt: 'Auto-avaliação', labelEn: 'Self-assessment' },
                { id: 'reflect', done: reflectionJournal.length > 0, labelPt: 'Reflexão', labelEn: 'Reflection journal' },
                { id: 'extend', done: Boolean(extensionPlan), labelPt: 'Extensão', labelEn: 'Extension planner' },
              ].map((item) => (
                <div key={item.id} className="flex items-center gap-2 py-0.5">
                  <span className={item.done ? 'text-[var(--secondary)]' : 'text-[var(--outline_variant)]'}>
                    {item.done ? '●' : '○'}
                  </span>
                  <span className={item.done ? 'text-[var(--on_surface)] font-medium' : 'text-[var(--on_surface)] opacity-50'}>
                    {pt ? item.labelPt : item.labelEn}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
