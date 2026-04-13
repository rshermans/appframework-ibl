'use client'

import React, { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'

interface ProgressStep {
  label: string
  done: boolean
}

function useProgressSteps(): ProgressStep[] {
  const state = useWizardStore()
  return [
    { label: 'Tópico', done: Boolean(state.topic) },
    { label: 'Perguntas', done: (state.candidateResearchQuestions?.length ?? 0) > 0 || (state.rqCandidates?.length ?? 0) > 0 },
    { label: 'Pergunta final', done: Boolean(state.finalResearchQuestion) },
    { label: 'Pesquisa', done: Boolean(state.searchDesign) },
    { label: 'Evidência', done: (state.evidenceRecords?.length ?? 0) > 0 },
    { label: 'Estrutura', done: Boolean(state.knowledgeStructure) },
    { label: 'Explicação', done: Boolean(state.explanationDraft) },
  ]
}

export default function ProgressDashboard() {
  const steps = useProgressSteps()
  const completed = steps.filter((s) => s.done).length
  const total = steps.length
  const pct = Math.round((completed / total) * 100)
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="fixed bottom-0 right-0 left-0 sm:left-auto sm:w-80 bg-white shadow-lg border-t sm:border-l sm:rounded-tl-lg border-slate-200 z-50">
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-2 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-700 truncate">Progresso</span>
            <span className="text-xs font-semibold text-slate-500">{pct}% ({completed}/{total})</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <span className="text-slate-400 text-xs flex-shrink-0">{expanded ? '▼' : '▲'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-1 text-xs max-h-52 overflow-y-auto border-t border-slate-100">
          {steps.map((step) => (
            <div key={step.label} className="flex items-center gap-2 py-0.5">
              <span className={step.done ? 'text-emerald-600' : 'text-slate-300'}>
                {step.done ? '●' : '○'}
              </span>
              <span className={step.done ? 'text-slate-800 font-medium' : 'text-slate-500'}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
