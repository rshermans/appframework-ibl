'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import type { KnowledgeStructure } from '@/types/research-workflow'

export default function Step4Structure() {
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

  const canRun = evidenceRecords.length > 0

  const buildKnowledgeStructure = async () => {
    if (!finalResearchQuestion?.question) {
      setError('A final research question is required before structuring knowledge.')
      return
    }
    if (!canRun) {
      setError('At least one evidence record is required before Step 4.')
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
          stage: 1,
          promptId: 'knowledge_structure',
          stepId: 'step4_knowledge_structure',
          stepLabel: 'Knowledge Structure',
          topic,
          rq: finalResearchQuestion.question,
          evidence: evidenceJson,
          evidenceRecords,
          content: evidenceJson,
        }),
      })

      const payload = await response.json()
      const data = payload?.data ?? payload

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.details || payload?.error || 'Failed to build knowledge structure')
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
      }

      if (nextStructure.topics.length === 0 || nextStructure.conceptMapNodes.length === 0) {
        throw new Error('AI response did not return a valid knowledge structure')
      }

      setKnowledgeStructure(nextStructure)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to build knowledge structure')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-xl font-semibold">Step 4 - Knowledge Structure</h2>
        <p className="text-sm text-gray-600">
          Convert extracted evidence into a structured model of topics, subtopics, and concept
          relationships.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="mb-2 text-sm font-semibold text-slate-700">Evidence input</div>
        <div className="text-sm text-slate-800">
          {evidenceRecords.length} evidence record{evidenceRecords.length === 1 ? '' : 's'} available.
        </div>
      </div>

      {!canRun && (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Step 4 is locked until at least one evidence record is extracted in Step 3.
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
        {loading ? 'Structuring knowledge...' : 'Generate Knowledge Structure'}
      </button>

      {knowledgeStructure && (
        <div className="space-y-5 rounded-xl border border-indigo-200 bg-indigo-50 p-5">
          <div>
            <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-indigo-700">
              Topics
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
              Subtopics
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
              Concept Nodes
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
              Concept Edges
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

          <div className="flex justify-end">
            <button
              onClick={() => setWorkflowStep('step5_explanation')}
              className="rounded bg-slate-900 px-4 py-3 text-white hover:bg-slate-800"
            >
              Continue to Step 5
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
