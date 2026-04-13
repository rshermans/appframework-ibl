'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import type { KnowledgeStructure } from '@/types/research-workflow'
import { useI18n } from '@/components/I18nProvider'
import { parseAiJson } from '@/lib/parseAiJson'
import { safeFetch } from '@/lib/safeFetch'

interface MindMapLine {
  level: number
  text: string
}

function normalizeMindMapText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function parseOutlineMarkdown(markdown?: string): MindMapLine[] {
  if (!markdown) return []

  return markdown
    .split('\n')
    .map((line) => {
      const match = line.match(/^(\s*)[-*]\s+(.+)$/)
      if (!match) return null
      const indentation = Math.floor(match[1].replace(/\t/g, '  ').length / 2)
      return {
        level: indentation + 1,
        text: normalizeMindMapText(match[2]),
      }
    })
    .filter((line): line is MindMapLine => Boolean(line && line.text))
}

function deriveFallbackMindMap(
  structure: KnowledgeStructure,
  rootLabel: string
): MindMapLine[] {
  const lines: MindMapLine[] = [{ level: 1, text: normalizeMindMapText(rootLabel) }]
  const safeTopics = structure.topics.slice(0, 8)

  safeTopics.forEach((topic, topicIndex) => {
    lines.push({ level: 2, text: normalizeMindMapText(topic) })

    const relatedEdges = structure.conceptMapEdges
      .filter(
        (edge) =>
          edge.from.toLowerCase().includes(topic.toLowerCase()) ||
          edge.to.toLowerCase().includes(topic.toLowerCase())
      )
      .flatMap((edge) => [edge.from, edge.to])

    const chunkedSubtopics = structure.subtopics.slice(topicIndex * 2, topicIndex * 2 + 2)
    const candidateDetails = Array.from(
      new Set([...chunkedSubtopics, ...relatedEdges, ...structure.conceptMapNodes.slice(topicIndex, topicIndex + 2)])
    )
      .map((entry) => normalizeMindMapText(entry))
      .filter((entry) => entry && entry.toLowerCase() !== topic.toLowerCase())
      .slice(0, 3)

    candidateDetails.forEach((detail) => {
      lines.push({ level: 3, text: detail })
    })
  })

  return lines
}

function buildMindMapLines(
  structure: KnowledgeStructure,
  rootLabel: string
): MindMapLine[] {
  const parsedOutline = parseOutlineMarkdown(structure.mindMapMarkdown)
  if (parsedOutline.length === 0) {
    return deriveFallbackMindMap(structure, rootLabel)
  }

  const firstLine = parsedOutline[0]
  if (firstLine.level === 1) {
    return parsedOutline
  }

  return [{ level: 1, text: normalizeMindMapText(rootLabel) }, ...parsedOutline.map((line) => ({
    level: Math.min(line.level + 1, 3),
    text: line.text,
  }))]
}

function buildPlantUmlMindMap(lines: MindMapLine[]): string {
  const normalized = lines
    .filter((line) => line.text.length > 0)
    .map((line) => `${'*'.repeat(Math.max(1, Math.min(3, line.level)))} ${line.text}`)

  return ['@startmindmap', ...normalized, '@endmindmap'].join('\n')
}

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

      const parsed = parseAiJson<{
        topics?: string[]
        main_topics?: string[]
        subtopics?: string[]
        key_subtopics?: string[]
        concept_map_nodes?: string[]
        conceptMapNodes?: string[]
        nodes?: string[]
        concept_map_edges?: Array<{ from?: string; to?: string; relation?: string }>
        conceptMapEdges?: Array<{ from?: string; to?: string; relation?: string; source?: string; target?: string; label?: string }>
        edges?: Array<{ from?: string; to?: string; relation?: string; source?: string; target?: string; label?: string }>
        mind_map_markdown?: string
        mindMapMarkdown?: string
        glossary?: KnowledgeStructure['glossary']
        terms?: KnowledgeStructure['glossary']
      }>(data.output)

      const normalizeStringArray = (value: unknown): string[] => {
        if (Array.isArray(value)) {
          return value
            .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
            .filter(Boolean)
        }

        if (typeof value === 'string') {
          return value
            .split(/[\n,;]+/)
            .map((entry) => entry.trim())
            .filter(Boolean)
        }

        return []
      }

      const normalizedTopics = normalizeStringArray(parsed?.topics ?? parsed?.main_topics)
      const normalizedSubtopics = normalizeStringArray(parsed?.subtopics ?? parsed?.key_subtopics)
      const normalizedNodes = normalizeStringArray(
        parsed?.concept_map_nodes ?? parsed?.conceptMapNodes ?? parsed?.nodes
      )

      // Derive topics from nodes/edges if model omitted the topics field
      const derivedTopicsFromNodes = normalizedTopics.length === 0 && normalizedNodes.length > 0
        ? normalizedNodes.slice(0, 6)
        : normalizedTopics

      // Derive topics from evidence records as last resort
      const lastResortTopics = derivedTopicsFromNodes.length === 0
        ? evidenceRecords
            .map((r: { claim?: string; title?: string }) => r.claim || r.title || '')
            .filter(Boolean)
            .slice(0, 5)
        : derivedTopicsFromNodes

      const rawEdges: Array<{
        from?: string
        to?: string
        relation?: string
        source?: string
        target?: string
        label?: string
      }> = Array.isArray(parsed?.concept_map_edges)
        ? parsed.concept_map_edges
        : Array.isArray(parsed?.conceptMapEdges)
          ? parsed.conceptMapEdges
          : Array.isArray(parsed?.edges)
            ? parsed.edges
            : []

      const normalizedEdges = rawEdges
        .map((edge) => ({
          from: (edge.from || edge.source || '').trim(),
          to: (edge.to || edge.target || '').trim(),
          relation: (edge.relation || edge.label || '').trim(),
        }))
        .filter((edge) => edge.from && edge.to)

      const derivedNodes = Array.from(
        new Set([
          ...normalizedNodes,
          ...lastResortTopics,
          ...normalizedSubtopics,
          ...normalizedEdges.flatMap((edge) => [edge.from, edge.to]),
        ])
      ).filter(Boolean)

      const finalDerivedNodes = derivedNodes.length === 0
        ? lastResortTopics
        : derivedNodes

      const normalizedGlossary = Array.isArray(parsed?.glossary)
        ? parsed.glossary
        : Array.isArray(parsed?.terms)
          ? parsed.terms
          : []

      const nextStructure: KnowledgeStructure = {
        topics: lastResortTopics,
        subtopics: normalizedSubtopics,
        conceptMapNodes: finalDerivedNodes,
        conceptMapEdges: normalizedEdges,
        mindMapMarkdown:
          typeof parsed?.mind_map_markdown === 'string'
            ? parsed.mind_map_markdown
            : typeof parsed?.mindMapMarkdown === 'string'
              ? parsed.mindMapMarkdown
              : '',
        glossary: Array.isArray(normalizedGlossary)
          ? normalizedGlossary
              .map((entry: { term?: string; definition?: string }) => ({
                term: entry.term || '',
                definition: entry.definition || '',
              }))
              .filter((entry: { term: string; definition: string }) => entry.term && entry.definition)
          : [],
      }

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

      <div className="flex flex-wrap items-center gap-3">
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
        <button
          onClick={() => setMindMapOpen(true)}
          disabled={!knowledgeStructure}
          className="rounded border border-indigo-300 bg-white px-4 py-3 text-indigo-800 disabled:opacity-50"
        >
          {isPortuguese ? 'Abrir popup do mind map' : 'Open mind map popup'}
        </button>
      </div>

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

      {mindMapOpen && knowledgeStructure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <div className="text-lg font-semibold text-slate-900">
                  {isPortuguese ? 'Preview do mind map' : 'Mind map preview'}
                </div>
                <div className="text-sm text-slate-500">
                  {isPortuguese
                    ? 'Representacao visual do texto futuro e codigo PlantUML pronto para editor externo.'
                    : 'Visual representation of the future text and PlantUML code ready for external editors.'}
                </div>
              </div>
              <button
                onClick={() => setMindMapOpen(false)}
                className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
              >
                {isPortuguese ? 'Fechar' : 'Close'}
              </button>
            </div>

            <div className="grid gap-6 p-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                  <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-indigo-700">
                    {isPortuguese ? 'Estrutura visual tipo markmap' : 'Markmap-style visual structure'}
                  </div>
                  <div className="space-y-2">
                    {mindMapLines.map((line, index) => (
                      <div
                        key={`${line.level}-${line.text}-${index}`}
                        className={`rounded px-3 py-2 text-sm ${
                          line.level === 1
                            ? 'bg-slate-900 font-semibold text-white'
                            : line.level === 2
                              ? 'border border-indigo-200 bg-white text-slate-900'
                              : 'border border-slate-200 bg-slate-50 text-slate-700'
                        }`}
                        style={{ marginLeft: `${(line.level - 1) * 20}px` }}
                      >
                        {line.text}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
                    {isPortuguese ? 'Leitura do mapa' : 'Map reading'}
                  </div>
                  <p className="text-sm text-slate-700">
                    {isPortuguese
                      ? 'O nodo raiz representa a pergunta final. Os ramos de segundo nivel correspondem aos topicos centrais e o terceiro nivel antecipa os detalhes que deverao aparecer no texto cientifico.'
                      : 'The root node represents the final question. Second-level branches capture the central topics, and the third level anticipates the details that should appear in the scientific text.'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-700">
                    PlantUML mind map
                  </div>
                  <pre className="overflow-x-auto rounded border border-slate-200 bg-white p-3 text-sm text-slate-900">
                    {plantUmlMindMap}
                  </pre>
                </div>

                {knowledgeStructure.mindMapMarkdown && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-700">
                      {isPortuguese ? 'Outline original' : 'Original outline'}
                    </div>
                    <pre className="overflow-x-auto rounded border border-slate-200 bg-white p-3 text-sm text-slate-900">
                      {knowledgeStructure.mindMapMarkdown}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
