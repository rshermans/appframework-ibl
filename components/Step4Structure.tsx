'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import type { KnowledgeStructure } from '@/types/research-workflow'
import { useI18n } from '@/components/I18nProvider'
import StepHeader from '@/components/StepHeader'
import MindMapModal from '@/components/MindMapModal'
import { parseAiJson } from '@/lib/parseAiJson'
import { normalizeKnowledgeStructure, type RawKnowledgeStructure } from '@/lib/knowledgeStructure'
import { safeFetch } from '@/lib/safeFetch'
import ConceptMapGraph from '@/components/ConceptMapGraph'
import { buildMarkmapMarkdown, buildMindMapLines, buildPlantUmlMindMap } from '@/lib/mindmap'

export default function Step4Structure() {
  const { locale, t } = useI18n()
  const {
    evidenceRecords,
    finalResearchQuestion,
    knowledgeStructure,
    projectId,
    setKnowledgeStructure,
    setWorkflowStep,
    topic,
  } = useWizardStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [refineInstructions, setRefineInstructions] = useState('')
  const [mindMapOpen, setMindMapOpen] = useState(false)

  const canRun = evidenceRecords.length > 0
  const isPortuguese = locale === 'pt-PT'
  const rootLabel = finalResearchQuestion?.question || topic || 'Research Question'
  const mindMapLines = knowledgeStructure ? buildMindMapLines(knowledgeStructure, rootLabel) : []
  const markmapMarkdown = knowledgeStructure ? buildMarkmapMarkdown(mindMapLines) : ''
  const plantUmlMindMap = knowledgeStructure ? buildPlantUmlMindMap(mindMapLines) : ''

  const buildKnowledgeStructure = async () => {
    if (!finalResearchQuestion?.question) {
      setError(t('steps.step4.locked'))
      return
    }
    if (!canRun) {
      setError(t('steps.step4.locked'))
      return
    }

    setLoading(true)
    setError('')

    try {
      const evidenceJson = JSON.stringify(evidenceRecords, null, 2)
      const hasRefine = Boolean(refineInstructions.trim())
      const requiredFieldsReminder = isPortuguese
        ? 'Devolve obrigatoriamente JSON com os campos "topics" (array nao vazio) e "concept_map_nodes" (array nao vazio).'
        : 'You MUST return JSON with non-empty "topics" array and non-empty "concept_map_nodes" array.'
      const { response, json: payload } = await safeFetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          stage: 1,
          promptId: 'knowledge_structure',
          stepId: 'step4_knowledge_structure',
          stepLabel: t('workflow.step4_knowledge_structure.label'),
          topic,
          rq: finalResearchQuestion.question,
          evidence: evidenceJson,
          evidenceRecords,
          content: hasRefine
            ? `${isPortuguese ? 'Instrucoes complementares' : 'Additional instructions'}: ${refineInstructions.trim()}\n\n${requiredFieldsReminder}`
            : requiredFieldsReminder,
          locale,
        }),
      })

      const data = payload?.data ?? payload

      if (!response.ok || !payload?.ok) {
        throw new Error((payload?.details || payload?.error || t('api.genericFailure')) as string)
      }

      const parsed = parseAiJson<RawKnowledgeStructure>(data.output)
      const nextStructure = normalizeKnowledgeStructure(parsed, evidenceRecords)

      if (nextStructure.topics.length === 0 && nextStructure.conceptMapNodes.length === 0) {
        throw new Error(
          isPortuguese
            ? 'A IA devolveu uma estrutura sem topicos nem nos do mapa conceptual. Tente refinar as instrucoes.'
            : 'AI returned a structure without topics or concept-map nodes. Try refining your instructions.'
        )
      }

      setKnowledgeStructure(nextStructure)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('api.genericFailure'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <StepHeader
          stepId="step4_knowledge_structure"
          title={t('steps.step4.title')}
          subtitle={t('steps.step4.intro')}
        />
      </div>

      <div className="bg-[var(--surface_container_low)] p-4">
        <div className="mb-2 text-sm font-semibold text-[var(--on_surface)] opacity-70">{t('steps.step4.evidenceInput')}</div>
        <div className="text-sm text-[var(--on_surface)]">
          {t('steps.step4.availableEvidence', { count: evidenceRecords.length })}
        </div>
      </div>

      <div className="bg-[var(--surface_container_low)] p-4">
        <div className="mb-2 text-sm font-semibold text-[var(--on_surface)]">
          {isPortuguese ? 'Refazer estrutura com instrucoes adicionais' : 'Redo structure with additional instructions'}
        </div>
        <textarea
          value={refineInstructions}
          onChange={(event) => setRefineInstructions(event.target.value)}
          rows={3}
          placeholder={
            isPortuguese
              ? 'Ex.: destacar relacoes causais e criar glossario focado em termos tecnicos'
              : 'e.g. emphasize causal links and build a glossary focused on technical terms'
          }
          className="ghost-input w-full"
        />
      </div>

      {!canRun && (
        <div className="ai-needs-validation rounded-[var(--radius-md)] p-3 text-sm">
          {t('steps.step4.locked')}
        </div>
      )}

      {error && (
        <div className="ai-needs-validation rounded-[var(--radius-md)] p-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={buildKnowledgeStructure}
          disabled={!canRun || loading}
          className="primary-gradient rounded-[var(--radius-md)] px-4 py-3 text-[var(--on_primary)] transition hover:brightness-110 disabled:opacity-50"
        >
          {loading
            ? t('steps.step4.generating')
            : isPortuguese
              ? 'Gerar ou refazer estrutura de conhecimento'
              : 'Generate or redo knowledge structure'}
        </button>
        <button
          onClick={() => setMindMapOpen(true)}
          disabled={!knowledgeStructure}
          className="tonal-card ghost-border px-4 py-3 text-[var(--on_surface)] disabled:opacity-50"
        >
          {isPortuguese ? 'Abrir popup do mind map' : 'Open mind map popup'}
        </button>
      </div>

      {knowledgeStructure && (
        <div className="space-y-5 bg-[var(--surface_container_low)] p-5">
          <div>
            <div className="mb-2 font-label text-[10px] uppercase tracking-[0.12em] text-[var(--secondary)]">
              {t('steps.step4.topics')}
            </div>
            <div className="flex flex-wrap gap-2">
              {knowledgeStructure.topics.map((topicItem) => (
                <span
                  key={topicItem}
                  className="rounded-full bg-[var(--surface_container)] px-3 py-1 text-sm text-[var(--on_surface)]"
                >
                  {topicItem}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 font-label text-[10px] uppercase tracking-[0.12em] text-[var(--secondary)]">
              {t('steps.step4.subtopics')}
            </div>
            <ul className="space-y-2">
              {knowledgeStructure.subtopics.map((subtopic) => (
                <li key={subtopic} className="bg-[var(--surface_container)] px-3 py-2 text-sm">
                  {subtopic}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-2 font-label text-[10px] uppercase tracking-[0.12em] text-[var(--secondary)]">
              {t('steps.step4.conceptNodes')}
            </div>
            <div className="flex flex-wrap gap-2">
              {knowledgeStructure.conceptMapNodes.map((node) => (
                <span
                  key={node}
                  className="bg-[var(--surface_container)] px-3 py-1 text-sm text-[var(--on_surface)]"
                >
                  {node}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 font-label text-[10px] uppercase tracking-[0.12em] text-[var(--secondary)]">
              {isPortuguese ? 'Mapa conceptual' : 'Concept map'}
            </div>
            <ConceptMapGraph
              nodes={knowledgeStructure.conceptMapNodes}
              edges={knowledgeStructure.conceptMapEdges}
              emptyLabel={isPortuguese ? 'Sem relacoes para desenhar.' : 'No relations to draw.'}
            />
          </div>

          <div>
            <div className="mb-2 font-label text-[10px] uppercase tracking-[0.12em] text-[var(--secondary)]">
              {t('steps.step4.conceptEdges')}
            </div>
            <ul className="space-y-2">
              {knowledgeStructure.conceptMapEdges.map((edge, index) => (
                <li
                  key={`${edge.from}-${edge.to}-${index}`}
                  className="bg-[var(--surface_container)] px-3 py-2 text-sm text-[var(--on_surface)]"
                >
                  {edge.from} {'->'} {edge.to} ({edge.relation})
                </li>
              ))}
            </ul>
          </div>

          {knowledgeStructure.mindMapMarkdown && (
            <div>
              <div className="mb-2 font-label text-[10px] uppercase tracking-[0.12em] text-[var(--secondary)]">
                {isPortuguese ? 'Mind map (texto)' : 'Mind map (text)'}
              </div>
              <pre className="overflow-x-auto bg-[var(--surface_container)] p-3 text-sm text-[var(--on_surface)]">
                {knowledgeStructure.mindMapMarkdown}
              </pre>
            </div>
          )}

          {Array.isArray(knowledgeStructure.glossary) && knowledgeStructure.glossary.length > 0 && (
            <div>
              <div className="mb-2 font-label text-[10px] uppercase tracking-[0.12em] text-[var(--secondary)]">
                {isPortuguese ? 'Glossario' : 'Glossary'}
              </div>
              <ul className="space-y-2">
                {knowledgeStructure.glossary.map((entry) => (
                  <li key={`${entry.term}-${entry.definition}`} className="bg-[var(--surface_container)] px-3 py-2 text-sm text-[var(--on_surface)]">
                    <span className="font-semibold">{entry.term}:</span> {entry.definition}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => setWorkflowStep('step9_explanation')}
              className="primary-gradient rounded-[var(--radius-md)] px-4 py-3 text-[var(--on_primary)] transition hover:brightness-110"
            >
              {t('steps.step4.continueButton')}
            </button>
          </div>
        </div>
      )}

      {mindMapOpen && knowledgeStructure && (
        <MindMapModal
          isPortuguese={isPortuguese}
          markmapMarkdown={markmapMarkdown}
          plantUmlMindMap={plantUmlMindMap}
          originalOutline={knowledgeStructure.mindMapMarkdown}
          onClose={() => setMindMapOpen(false)}
        />
      )}
    </div>
  )
}
