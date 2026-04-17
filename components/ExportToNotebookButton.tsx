'use client'

import { useState } from 'react'
import NotebookLmExporter from '@/components/NotebookLmExporter'
import type { NotebookLmArtifactType } from '@/lib/notebookLmPrompts'
import type { EvidenceRecord } from '@/types/research-workflow'

interface ExportToNotebookButtonProps {
  projectId: string
  topic: string
  researchQuestion: string
  evidenceRecords: EvidenceRecord[]
  artifactType: NotebookLmArtifactType
  className?: string
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

export default function ExportToNotebookButton({
  projectId,
  topic,
  researchQuestion,
  evidenceRecords,
  artifactType,
  className = '',
  variant = 'secondary',
  size = 'sm',
}: ExportToNotebookButtonProps) {
  const [showExporter, setShowExporter] = useState(false)

  const variantClasses = {
    primary:
      'bg-[var(--primary)] text-[var(--on_primary)] hover:opacity-90 disabled:opacity-50',
    secondary:
      'bg-[var(--surface_container)] text-[var(--on_surface)] hover:bg-[var(--surface_container_high)]',
    outline:
      'border border-[var(--outline)] text-[var(--on_surface)] hover:bg-[var(--surface_container_low)]',
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowExporter(true)}
        className={`rounded-[var(--radius-md)] font-semibold transition ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      >
        📓 {artifactType === 'presentation' ? 'Exportar Apresentação' : 'Exportar para NotebookLM'}
      </button>

      {showExporter && (
        <NotebookLmExporter
          projectId={projectId}
          topic={topic}
          researchQuestion={researchQuestion}
          evidenceRecords={evidenceRecords}
          artifactType={artifactType}
          onClose={() => setShowExporter(false)}
        />
      )}
    </>
  )
}
