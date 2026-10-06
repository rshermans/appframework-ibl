import type { KnowledgeStructure } from '@/types/research-workflow'

export interface MindMapLine {
  level: number
  text: string
}

const MAX_TEXT_LENGTH = 120
const MAX_LEVEL = 4

export function normalizeMindMapText(value: string): string {
  const cleaned = value
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // markdown links -> label
    .replace(/[*_`]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned.length > MAX_TEXT_LENGTH ? `${cleaned.slice(0, MAX_TEXT_LENGTH - 1)}…` : cleaned
}

/**
 * Parses an LLM-produced outline into levelled lines. Tolerates literal "\n"
 * sequences, "-", "*", "+", "1." bullets, "#" headings, tabs and irregular
 * indentation (levels are derived from an indentation stack, not a fixed width).
 */
export function parseOutlineMarkdown(markdown?: string): MindMapLine[] {
  if (!markdown) return []

  const source = !markdown.includes('\n') && markdown.includes('\\n')
    ? markdown.replace(/\\n/g, '\n')
    : markdown

  const lines: MindMapLine[] = []
  const indentStack: number[] = []

  for (const rawLine of source.split('\n')) {
    const line = rawLine.replace(/\t/g, '  ').replace(/\s+$/, '')
    if (!line.trim()) continue

    const heading = line.match(/^\s*(#{1,6})\s+(.+)$/)
    if (heading) {
      const text = normalizeMindMapText(heading[2])
      if (text) lines.push({ level: Math.min(heading[1].length, MAX_LEVEL), text })
      indentStack.length = 0
      continue
    }

    const bullet = line.match(/^(\s*)(?:[-*+]|\d+[.)])\s+(.+)$/)
    if (!bullet) continue

    const indent = bullet[1].length
    while (indentStack.length > 0 && indentStack[indentStack.length - 1] > indent) {
      indentStack.pop()
    }
    if (indentStack.length === 0 || indentStack[indentStack.length - 1] < indent) {
      indentStack.push(indent)
    }

    const text = normalizeMindMapText(bullet[2])
    if (text) lines.push({ level: Math.min(indentStack.length, MAX_LEVEL), text })
  }

  return lines
}

export function deriveFallbackMindMap(structure: KnowledgeStructure, rootLabel: string): MindMapLine[] {
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

/**
 * Single source of truth for every mind map representation (Markmap, PlantUML,
 * outline). Guarantees exactly one root node, so a model that returns several
 * top-level bullets (or none) no longer produces a broken map.
 */
export function buildMindMapLines(structure: KnowledgeStructure, rootLabel: string): MindMapLine[] {
  const parsed = parseOutlineMarkdown(structure.mindMapMarkdown)
  if (parsed.length === 0) {
    return deriveFallbackMindMap(structure, rootLabel)
  }

  const rootCount = parsed.filter((line) => line.level === 1).length
  if (parsed[0].level === 1 && rootCount === 1) {
    return parsed
  }

  return [
    { level: 1, text: normalizeMindMapText(rootLabel) },
    ...parsed.map((line) => ({ level: Math.min(line.level + 1, MAX_LEVEL), text: line.text })),
  ]
}

export function buildPlantUmlMindMap(lines: MindMapLine[]): string {
  const normalized = lines
    .filter((line) => line.text.length > 0)
    .map((line) => `${'*'.repeat(Math.max(1, Math.min(3, line.level)))} ${line.text}`)

  return ['@startmindmap', ...normalized, '@endmindmap'].join('\n')
}

export function buildMarkmapMarkdown(lines: MindMapLine[]): string {
  return lines
    .filter((line) => line.text.length > 0)
    .map((line) => `${'  '.repeat(Math.max(0, line.level - 1))}- ${line.text}`)
    .join('\n')
}
