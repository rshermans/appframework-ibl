'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import { useI18n } from '@/components/I18nProvider'
import ArqusBrand from '@/components/ArqusBrand'
import EthicalTip from '@/components/EthicalTip'
import LocaleSwitcher from '@/components/LocaleSwitcher'
import { getIblEthicalTip } from '@/lib/iblFramework'
import Step10APoster from './multimodal/Step10APoster'
import Step10BPodcast from './multimodal/Step10BPodcast'
import Step10CVideocast from './multimodal/Step10CVideocast'
import Step10DGame from './multimodal/Step10DGame'
import Step10EOral from './multimodal/Step10EOral'

type MultimodalSubStep = 'hub' | 'poster' | 'podcast' | 'video' | 'game' | 'oral'

const OUTPUTS: Array<{
  id: MultimodalSubStep
  emoji: string
  label: string
  step: string
  descPt: string
  descEn: string
}> = [
  { id: 'poster',  emoji: '🖼️',  label: 'Poster / Infographic', step: '10A', descPt: 'Layout visual com âncoras de evidência',        descEn: 'Visual layout with evidence anchors' },
  { id: 'podcast', emoji: '🎙️', label: 'Podcast Script',         step: '10B', descPt: 'Script por segmentos com marcadores de tempo',  descEn: 'Segmented script with timestamps' },
  { id: 'video',   emoji: '🎬',  label: 'Videocast Storyboard',  step: '10C', descPt: 'Storyboard por cenas com notas visuais',        descEn: 'Scene-by-scene storyboard with visual notes' },
  { id: 'game',    emoji: '🎮',  label: 'Science Game',          step: '10D', descPt: 'Jogo de decisão com ramificações narrativas',   descEn: 'Decision game with branching narrative' },
  { id: 'oral',    emoji: '🎤',  label: 'Oral Presentation',     step: '10E', descPt: 'Outline de slides com notas de orador',         descEn: 'Slide outline with speaker notes' },
]

export default function Stage2Multimodal() {
  const { knowledgeStructure, evidenceRecords, explanationDraft, multimodalOutputs, setStage } =
    useWizardStore()
  const { t } = useI18n()
  const [activeSubStep, setActiveSubStep] = useState<MultimodalSubStep>('hub')

  const portuguese = true // component-level language heuristic; locale from store TBD

  const finalisedCount = Object.values(multimodalOutputs).filter(Boolean).length

  if (activeSubStep !== 'hub') {
    const back = () => setActiveSubStep('hub')
    switch (activeSubStep) {
      case 'poster':  return <Step10APoster onBack={back} />
      case 'podcast': return <Step10BPodcast onBack={back} />
      case 'video':   return <Step10CVideocast onBack={back} />
      case 'game':    return <Step10DGame onBack={back} />
      case 'oral':    return <Step10EOral onBack={back} />
    }
  }

  const isLocked = !knowledgeStructure || evidenceRecords.length === 0

  return (
    <div className="space-y-6">
      {/* Stage header */}
      <section className="relative overflow-hidden bg-[var(--surface_container_low)] p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(27,38,59,0.12)_0%,rgba(27,38,59,0.03)_52%,rgba(120,89,27,0.12)_100%)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3">
            <ArqusBrand />
            <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--on_surface)] md:text-4xl">
              Stage 2 — Explain &amp; Create
            </h2>
            <p className="max-w-3xl text-slate-700">
              {portuguese
                ? 'Transforma a evidência validada em outputs multimodais de comunicação científica.'
                : 'Transform validated evidence into multimodal science communication outputs.'}
            </p>
            <EthicalTip
              title={t('common.stageEthicalTip')}
              tip={getIblEthicalTip('stage2' as Parameters<typeof getIblEthicalTip>[0]) ?? 'AI visuals may misrepresent findings. Always cross-check with source evidence before publishing.'}
            />
          </div>
          <LocaleSwitcher compact />
        </div>
      </section>

      {/* Navigation to Stage 1 */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => setStage(1)}
          className="rounded-[var(--radius-md)] bg-[var(--surface_container)] px-4 py-2 text-sm font-medium text-[var(--on_surface)] transition hover:bg-[var(--surface_container_low)]"
        >
          ← {portuguese ? 'Voltar ao Stage 1' : 'Back to Stage 1'}
        </button>
        <button
          type="button"
          onClick={() => setStage(3)}
          className="rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--on_primary)] transition hover:opacity-90"
        >
          {portuguese ? 'Avançar para Stage 3 →' : 'Continue to Stage 3 →'}
        </button>
      </div>

      {/* Evidence Anchor summary */}
      <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--outline_variant)] bg-[var(--surface_container)] p-4 md:grid-cols-3">
        <div className="text-sm">
          <span className="font-semibold text-[var(--on_surface)]">
            {portuguese ? 'Pergunta de investigação' : 'Research question'}:
          </span>
          <p className="mt-1 text-[var(--on_surface_variant)]">
            {explanationDraft?.argumentCore ?? (portuguese ? '—' : '—')}
          </p>
        </div>
        <div className="text-sm">
          <span className="font-semibold text-[var(--on_surface)]">
            {portuguese ? 'Estrutura de conhecimento' : 'Knowledge structure'}:
          </span>
          <p className="mt-1 text-[var(--on_surface_variant)]">
            {knowledgeStructure
              ? `${knowledgeStructure.topics.length} ${portuguese ? 'tópicos' : 'topics'}, ${knowledgeStructure.subtopics.length} ${portuguese ? 'subtópicos' : 'subtopics'}`
              : portuguese ? 'Não disponível' : 'Not available'}
          </p>
        </div>
        <div className="text-sm">
          <span className="font-semibold text-[var(--on_surface)]">
            {portuguese ? 'Outputs finalizados' : 'Outputs finalised'}:
          </span>
          <p className="mt-1 text-[var(--on_surface_variant)]">
            {finalisedCount}/5
          </p>
        </div>
      </div>

      {isLocked && (
        <div className="rounded-[var(--radius-md)] border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          ⚠{' '}
          {portuguese
            ? 'Completa pelo menos o Stage 1 (evidência + estrutura de conhecimento) antes de criar outputs multimodais.'
            : 'Complete Stage 1 (evidence + knowledge structure) before creating multimodal outputs.'}
        </div>
      )}

      {/* Output cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {OUTPUTS.map((output) => {
          const isDone = Boolean(multimodalOutputs[output.id as keyof typeof multimodalOutputs])
          return (
            <button
              key={output.id}
              type="button"
              disabled={isLocked}
              onClick={() => setActiveSubStep(output.id)}
              className={`group flex flex-col gap-3 rounded-[var(--radius-md)] border p-5 text-left transition
                ${isLocked
                  ? 'cursor-not-allowed border-[var(--outline_variant)] opacity-50'
                  : isDone
                    ? 'border-green-400 bg-green-50 hover:bg-green-100'
                    : 'border-[var(--outline_variant)] bg-[var(--surface_container_lowest)] hover:bg-[var(--surface_container_low)]'
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{output.emoji}</span>
                <span className="rounded-full bg-[var(--surface_container)] px-2 py-0.5 text-[11px] font-semibold text-[var(--on_surface_variant)]">
                  Step {output.step}
                </span>
              </div>
              <div>
                <p className="font-semibold text-[var(--on_surface)]">{output.label}</p>
                <p className="mt-1 text-xs text-[var(--on_surface_variant)]">
                  {portuguese ? output.descPt : output.descEn}
                </p>
              </div>
              {isDone && (
                <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-green-700">
                  ✓ {portuguese ? 'Gerado' : 'Generated'}
                </span>
              )}
              {!isDone && !isLocked && (
                <span className="mt-auto text-xs text-[var(--on_surface_variant)] transition group-hover:text-[var(--primary)]">
                  {portuguese ? 'Começar →' : 'Start →'}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
