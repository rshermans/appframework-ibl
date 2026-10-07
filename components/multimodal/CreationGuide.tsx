'use client'

import { useState } from 'react'
import { useI18n } from '@/components/I18nProvider'
import { CREATION_TOOLS } from '@/lib/outputExports'

type ToolKind = keyof typeof CREATION_TOOLS

export interface GuideAction {
  id: string
  label: string
  /** Text copied to the clipboard. */
  copyText?: string
  /** Text downloaded as a file. */
  download?: { filename: string; text: string; mime?: string }
  /** Anything else (e.g. build and download a .pptx). */
  onClick?: () => void | Promise<void>
  primary?: boolean
}

interface CreationGuideProps {
  /** Which tool list to show; omit when the output is played in the page itself. */
  kind?: ToolKind
  title: string
  description: string
  actions: GuideAction[]
}

function downloadText(filename: string, text: string, mime = 'text/markdown;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

/** After generating a script/prompt: take it with you and find where to turn it into the final media. */
export default function CreationGuide({ kind, title, description, actions }: CreationGuideProps) {
  const { locale } = useI18n()
  const pt = locale === 'pt-PT'
  const [status, setStatus] = useState('')

  const run = async (action: GuideAction) => {
    try {
      if (action.copyText !== undefined) {
        await navigator.clipboard.writeText(action.copyText)
        setStatus(pt ? `Copiado: ${action.label}` : `Copied: ${action.label}`)
      } else if (action.download) {
        downloadText(action.download.filename, action.download.text, action.download.mime)
        setStatus(pt ? `Descarregado: ${action.download.filename}` : `Downloaded: ${action.download.filename}`)
      } else if (action.onClick) {
        await action.onClick()
        setStatus(pt ? `Concluído: ${action.label}` : `Done: ${action.label}`)
      }
    } catch (error) {
      console.error('[creation guide]', error)
      setStatus(pt ? 'Não foi possível concluir a ação. Tente novamente.' : 'Could not complete the action. Please try again.')
    }
  }

  return (
    <section className="space-y-4 rounded-[var(--radius-md)] border border-[var(--outline_variant)] bg-[var(--surface_container_low)] p-4 md:p-5">
      <div>
        <h3 className="font-display text-base font-semibold text-[var(--on_surface)]">{title}</h3>
        <p className="mt-1 text-sm text-[var(--on_surface_variant)]">{description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => void run(action)}
            className={`min-h-[44px] rounded-[var(--radius-md)] px-4 text-sm font-semibold transition ${
              action.primary
                ? 'bg-[var(--primary)] text-[var(--on_primary)] hover:opacity-90'
                : 'bg-[var(--surface_container)] text-[var(--on_surface)] hover:bg-[var(--surface_container_high)]'
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>
      <p role="status" aria-live="polite" className="min-h-[1.25rem] text-xs text-[var(--on_surface_variant)]">
        {status}
      </p>

      {kind && (
      <div>
        <p className="mb-2 font-label text-[10px] uppercase tracking-[0.12em] text-[var(--secondary)]">
          {pt ? 'Onde criar' : 'Where to create it'}
        </p>
        <ul className="grid gap-2 md:grid-cols-2">
          {CREATION_TOOLS[kind].map((tool) => (
            <li key={tool.name} className="rounded-[var(--radius-sm)] bg-[var(--surface_container_lowest)] p-3 ring-1 ring-[var(--outline_variant)]">
              <a href={tool.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[var(--primary)] underline">
                {tool.name}
              </a>
              <p className="mt-1 text-xs text-[var(--on_surface_variant)]">{tool.why[pt ? 'pt' : 'en']}</p>
            </li>
          ))}
        </ul>
      </div>
      )}
    </section>
  )
}
