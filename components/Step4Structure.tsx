'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import type { KnowledgeStructure } from '@/types/research-workflow'
import { useI18n } from '@/components/I18nProvider'

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

  const canRun = evidenceRecords.length > 0
  const isPortuguese = locale === 'pt-PT'

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
      const response = await fetch('/api/ai', {
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
            ? `${evidenceJson}\n${isPortuguese ? 'Instrucoes complementares' : 'Complementary instructions'}: ${refineInstructions.trim()}`
            : evidenceJson,
          locale,
        }),
      })

      const payload = await response.json()
      const data = payload?.data ?? payload

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.details || payload?.error || t('api.genericFailure'))
      }

      const parsed = JSON.parse(data.output)
      const nextStructure: KnowledgeStructure = {
        topics: Array.isArray(parsed?.topics) ? parsed.topics : [],
        subtopics: Array.isArray(parsed?.subtopics) ? parsed.subtopics : [],
        conceptMapNodes: Array.isArray(parsed?.concept_map_nodes) ? parsed.concept_map_nodes : [],
        conceptMapEdges: Array.isArray(parsed?.concept_map_edges)
          ? parsed.concept_map_edges
              .map((edge: { from?: string; to?: string; relation?: string }) => ({
                from: edge.from || '',
                to: edge.to || '',
                relation: edge.relation || '',
              }))
              .filter((edge: { from: string; to: string; relation: string }) => edge.from && edge.to)
          : [],
        mindMapMarkdown:
          typeof parsed?.mind_map_markdown === 'string' ? parsed.mind_map_markdown : '',
        glossary: Array.isArray(parsed?.glossary)
          ? parsed.glossary
              .map((entry: { term?: string; definition?: string }) => ({
                term: entry.term || '',
                definition: entry.definition || '',
              }))
              .filter((entry: { term: string; definition: string }) => entry.term && entry.definition)
          : [],
      }

      if (nextStructure.topics.length === 0 || nextStructure.conceptMapNodes.length === 0) {
        throw new Error(t('api.genericFailure'))
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
        <h2 className="mb-2 text-xl font-semibold">{t('steps.step4.title')}</h2>
        <p className="text-sm text-gray-600">{t('steps.step4.intro')}</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="mb-2 text-sm font-semibold text-slate-700">{t('steps.step4.evidenceInput')}</div>
        <div className="text-sm text-slate-800">
          {t('steps.step4.availableEvidence', { count: evidenceRecords.length })}
        </div>
      </div>

      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
        <div className="mb-2 text-sm font-semibold text-indigo-900">
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
          className="w-full rounded border border-indigo-200 bg-white px-3 py-2 text-sm"
        />
      </div>

      {!canRun && (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {t('steps.step4.locked')}
        </div>
      )}

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={buildKnowledgeStructure}
        disabled={!canRun || loading}
        className="rounded bg-slate-900 px-4 py-3 text-white disabled:opacity-50"
      >
        {loading
          ? t('steps.step4.generating')
          : isPortuguese
            ? 'Gerar ou refazer estrutura de conhecimento'
            : 'Generate or redo knowledge structure'}
      </button>

      {knowledgeStructure && (
        <div className="space-y-5 rounded-xl border border-indigo-200 bg-indigo-50 p-5">
          <div>
            <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-indigo-700">
              {t('steps.step4.topics')}
            </div>
            <div className="flex flex-wrap gap-2">
              {knowledgeStructure.topics.map((topicItem) => (
                <span
                  key={topicItem}
                  className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-sm text-slate-900"
                >
                  {topicItem}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-indigo-700">
              {t('steps.step4.subtopics')}
            </div>
            <ul className="space-y-2">
              {knowledgeStructure.subtopics.map((subtopic) => (
                <li key={subtopic} className="rounded border border-indigo-200 bg-white px-3 py-2 text-sm">
                  {subtopic}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-indigo-700">
              {t('steps.step4.conceptNodes')}
            </div>
            <div className="flex flex-wrap gap-2">
              {knowledgeStructure.conceptMapNodes.map((node) => (
                <span
                  key={node}
                  className="rounded border border-indigo-200 bg-white px-3 py-1 text-sm text-slate-900"
                >
                  {node}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-indigo-700">
              {t('steps.step4.conceptEdges')}
            </div>
            <ul className="space-y-2">
              {knowledgeStructure.conceptMapEdges.map((edge, index) => (
                <li
                  key={`${edge.from}-${edge.to}-${index}`}
                  className="rounded border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {edge.from} {'->'} {edge.to} ({edge.relation})
                </li>
              ))}
            </ul>
          </div>

          {knowledgeStructure.mindMapMarkdown && (
            <div>
              <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-indigo-700">
                {isPortuguese ? 'Mind map (texto)' : 'Mind map (text)'}
              </div>
              <pre className="overflow-x-auto rounded border border-indigo-200 bg-white p-3 text-sm text-slate-900">
                {knowledgeStructure.mindMapMarkdown}
              </pre>
            </div>
          )}

          {Array.isArray(knowledgeStructure.glossary) && knowledgeStructure.glossary.length > 0 && (
            <div>
              <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-indigo-700">
                {isPortuguese ? 'Glossario' : 'Glossary'}
              </div>
              <ul className="space-y-2">
                {knowledgeStructure.glossary.map((entry) => (
                  <li key={`${entry.term}-${entry.definition}`} className="rounded border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-900">
                    <span className="font-semibold">{entry.term}:</span> {entry.definition}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => setWorkflowStep('step5_explanation')}
              className="rounded bg-slate-900 px-4 py-3 text-white hover:bg-slate-800"
            >
              {t('steps.step4.continueButton')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

