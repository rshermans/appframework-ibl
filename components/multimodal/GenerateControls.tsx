'use client'

import { useI18n } from '@/components/I18nProvider'
import { useMultimodalGeneration } from './useMultimodalGeneration'
import type { MultimodalKind } from '@/lib/multimodalParts'

interface GenerateControlsProps {
  kind: MultimodalKind
  durationMinutes?: number
  hasDraft: boolean
}

/** Generate / cancel button with progress, shared by the five Stage 2 outputs. */
export default function GenerateControls({ kind, durationMinutes, hasDraft }: GenerateControlsProps) {
  const { locale } = useI18n()
  const pt = locale === 'pt-PT'
  const { generate, cancel, loading, error, progress, canGenerate } = useMultimodalGeneration(kind)

  const label = loading
    ? progress?.phase === 'parts'
      ? pt ? `A gerar partes ${progress.done}/${progress.total}…` : `Generating parts ${progress.done}/${progress.total}…`
      : pt ? 'A planear…' : 'Planning…'
    : hasDraft
      ? pt ? 'Gerar novamente' : 'Regenerate'
      : pt ? 'Gerar com IA' : 'Generate with AI'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void generate({ durationMinutes })}
          disabled={loading || !canGenerate}
          title={
            canGenerate
              ? undefined
              : pt
                ? 'Complete o Step 9 (explicação científica) para gerar aqui, ou use "Exportar para NotebookLM".'
                : 'Complete Step 9 (scientific explanation) to generate here, or use "Export to NotebookLM".'
          }
          className="rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--on_primary)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {label}
        </button>
        {loading && (
          <button
            type="button"
            onClick={cancel}
            className="rounded-[var(--radius-md)] bg-[var(--surface_container)] px-3 py-2 text-sm font-medium text-[var(--on_surface)] hover:bg-[var(--surface_container_high)]"
          >
            {pt ? 'Cancelar' : 'Cancel'}
          </button>
        )}
      </div>
      {!canGenerate && (
        <p className="text-xs text-[var(--on_surface_variant)]">
          {pt
            ? 'Para gerar aqui, conclua o Step 9 (explicação científica). Pode sempre usar a exportação para o NotebookLM.'
            : 'To generate here, finish Step 9 (scientific explanation). You can always use the NotebookLM export.'}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
