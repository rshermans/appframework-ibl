'use client'

import { useMemo } from 'react'

interface ConceptMapGraphProps {
  nodes: string[]
  edges: Array<{ from: string; to: string; relation: string }>
  emptyLabel?: string
}

const MAX_NODES = 24
const LABEL_LIMIT = 22

function shorten(label: string): string {
  return label.length > LABEL_LIMIT ? `${label.slice(0, LABEL_LIMIT - 1)}…` : label
}

/**
 * Dependency-free concept map: nodes on a circle, directed labelled edges.
 * Replaces the plain text list so the relations are actually visible.
 */
export default function ConceptMapGraph({ nodes, edges, emptyLabel }: ConceptMapGraphProps) {
  const graph = useMemo(() => {
    const names = Array.from(
      new Set([...nodes, ...edges.flatMap((edge) => [edge.from, edge.to])].map((n) => n.trim()).filter(Boolean))
    ).slice(0, MAX_NODES)

    const size = Math.max(520, names.length * 46)
    const center = size / 2
    const radius = center - 90
    const positions = new Map<string, { x: number; y: number }>()

    names.forEach((name, index) => {
      const angle = (2 * Math.PI * index) / Math.max(names.length, 1) - Math.PI / 2
      positions.set(name, {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
      })
    })

    const drawable = edges.filter(
      (edge) => edge.from !== edge.to && positions.has(edge.from.trim()) && positions.has(edge.to.trim())
    )

    return { names, positions, drawable, size }
  }, [nodes, edges])

  if (graph.names.length === 0 || graph.drawable.length === 0) {
    return <p className="text-sm italic opacity-60">{emptyLabel ?? 'No relations to draw.'}</p>
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface_container_lowest)] ghost-border">
      <svg
        viewBox={`0 0 ${graph.size} ${graph.size}`}
        role="img"
        aria-label="Concept map"
        className="mx-auto block h-auto w-full max-w-[760px]"
      >
        <defs>
          <marker id="concept-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
          </marker>
        </defs>

        {graph.drawable.map((edge, index) => {
          const from = graph.positions.get(edge.from.trim())!
          const to = graph.positions.get(edge.to.trim())!
          const dx = to.x - from.x
          const dy = to.y - from.y
          const length = Math.hypot(dx, dy) || 1
          const inset = 34 // keep arrow tips outside the node pill
          const x1 = from.x + (dx / length) * inset
          const y1 = from.y + (dy / length) * inset
          const x2 = to.x - (dx / length) * inset
          const y2 = to.y - (dy / length) * inset

          return (
            <g key={`${edge.from}-${edge.to}-${index}`}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#94a3b8" strokeWidth={1.5} markerEnd="url(#concept-arrow)" />
              {edge.relation && (
                <text
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2 - 4}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#475569"
                  paintOrder="stroke"
                  stroke="#ffffff"
                  strokeWidth={3}
                >
                  {edge.relation}
                </text>
              )}
            </g>
          )
        })}

        {graph.names.map((name) => {
          const { x, y } = graph.positions.get(name)!
          return (
            <g key={name}>
              <title>{name}</title>
              <rect x={x - 52} y={y - 14} width={104} height={28} rx={14} fill="#eff6ff" stroke="#2563eb" strokeWidth={1.2} />
              <text x={x} y={y + 4} textAnchor="middle" fontSize={10.5} fontWeight={600} fill="#1e3a8a">
                {shorten(name)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
