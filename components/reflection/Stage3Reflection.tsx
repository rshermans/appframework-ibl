'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import { useI18n } from '@/components/I18nProvider'
import ArqusBrand from '@/components/ArqusBrand'
import EthicalTip from '@/components/EthicalTip'
import LocaleSwitcher from '@/components/LocaleSwitcher'
import StepPeerReview from './StepPeerReview'
import StepSelfAssessment from './StepSelfAssessment'
import StepReflection from './StepReflection'
import StepExtension from './StepExtension'

type ReflectionSubStep = 'hub' | 'peer' | 'self' | 'reflect' | 'extend'

const STEPS: Array<{
  id: ReflectionSubStep
  emoji: string
  badge: string
  labelPt: string
  labelEn: string
  descPt: string
  descEn: string
}> = [
  { id: 'peer',    emoji: '👥', badge: 'S3-Peer',    labelPt: 'Revisão por Pares',    labelEn: 'Peer Review',              descPt: 'Feedback por rúbrica com anonimato',            descEn: 'Rubric-based feedback with anonymity' },
  { id: 'self',    emoji: '🪞', badge: 'S3-Self',    labelPt: 'Auto-Avaliação',        labelEn: 'Self-Assessment',          descPt: 'Mapeamento das dimensões R1–R8',                descEn: 'Map your work against R1–R8' },
  { id: 'reflect', emoji: '📓', badge: 'S3-Reflect', labelPt: 'Diário de Reflexão',   labelEn: 'Reflection Journal',       descPt: 'Micro-prompts metacognitivos com journaling',   descEn: 'Metacognitive micro-prompts and journaling' },
  { id: 'extend',  emoji: '🔭', badge: 'S3-Extend',  labelPt: 'Planeador de Extensão', labelEn: 'Inquiry Extension Planner', descPt: 'Deteção de lacunas e 3 caminhos possíveis',   descEn: 'Gap detection and 3 extension paths' },
]

export default function Stage3Reflection() {
  const { t } = useI18n()
  const { setStage, peerReviews, selfAssessment, reflectionJournal, extensionPlan } =
    useWizardStore()
  const [activeSubStep, setActiveSubStep] = useState<ReflectionSubStep>('hub')

  const isDone: Record<ReflectionSubStep, boolean> = {
    hub:     false,
    peer:    peerReviews.length > 0,
    self:    selfAssessment !== null,
    reflect: reflectionJournal.length > 0,
    extend:  extensionPlan !== null,
  }

  if (activeSubStep !== 'hub') {
    const back = () => setActiveSubStep('hub')
    switch (activeSubStep) {
      case 'peer':    return <div className="space-y-6 mt-6"><StepPeerReview onBack={back} /></div>
      case 'self':    return <div className="space-y-6 mt-6"><StepSelfAssessment onBack={back} /></div>
      case 'reflect': return <div className="space-y-6 mt-6"><StepReflection onBack={back} /></div>
      case 'extend':  return <div className="space-y-6 mt-6"><StepExtension onBack={back} /></div>
    }
  }

  const completedCount = STEPS.filter((s) => isDone[s.id]).length

  return (
    <div className="space-y-6">
      {/* Stage header */}
      <section className="relative overflow-hidden bg-[var(--surface_container_low)] p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(27,38,59,0.12)_0%,rgba(27,38,59,0.03)_52%,rgba(120,89,27,0.12)_100%)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3">
            <ArqusBrand />
            <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--on_surface)] md:text-4xl">
              Stage 3 — Reflect &amp; Improve
            </h2>
            <p className="max-w-3xl text-slate-700">
              Fecha o ciclo IBL com reflexão metacognitiva, revisão por pares e extensão da investigação.
            </p>
            <EthicalTip
              title={t('common.stageEthicalTip')}
              tip="A reflexão é trabalho humano. A IA convida à metacognição — as respostas verdadeiras são do estudante."
            />
          </div>
          <LocaleSwitcher compact />
        </div>
      </section>

      {/* Navigation */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => setStage(2)}
          className="rounded-[var(--radius-md)] bg-[var(--surface_container)] px-4 py-2 text-sm font-medium text-[var(--on_surface)] transition hover:bg-[var(--surface_container_low)]"
        >
          ← Voltar ao Stage 2
        </button>
        <span className="text-xs text-[var(--on_surface_variant)]">
          {completedCount}/{STEPS.length} completos
        </span>
      </div>

      {/* Progress thread */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSubStep(step.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition
                ${isDone[step.id]
                  ? 'bg-green-100 text-green-800'
                  : 'bg-[var(--surface_container)] text-[var(--on_surface)] hover:bg-[var(--surface_container_low)]'
                }`}
            >
              {isDone[step.id] ? '✓ ' : ''}{step.badge}
            </button>
            {i < STEPS.length - 1 && (
              <span className="text-[var(--outline_variant)]">──</span>
            )}
          </div>
        ))}
      </div>

      {/* Step cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {STEPS.map((step) => (
          <button
            key={step.id}
            type="button"
            onClick={() => setActiveSubStep(step.id)}
            className={`group flex flex-col gap-3 rounded-[var(--radius-md)] border p-5 text-left transition
              ${isDone[step.id]
                ? 'border-green-400 bg-green-50 hover:bg-green-100'
                : 'border-[var(--outline_variant)] bg-[var(--surface_container_lowest)] hover:bg-[var(--surface_container_low)]'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">{step.emoji}</span>
              <span className="rounded-full bg-[var(--surface_container)] px-2 py-0.5 text-[11px] font-semibold text-[var(--on_surface_variant)]">
                {step.badge}
              </span>
            </div>
            <div>
              <p className="font-semibold text-[var(--on_surface)]">{step.labelPt}</p>
              <p className="mt-1 text-xs text-[var(--on_surface_variant)]">{step.descPt}</p>
            </div>
            {isDone[step.id] && (
              <span className="mt-auto text-xs font-semibold text-green-700">✓ Concluído</span>
            )}
            {!isDone[step.id] && (
              <span className="mt-auto text-xs text-[var(--on_surface_variant)] transition group-hover:text-[var(--primary)]">
                Começar →
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
