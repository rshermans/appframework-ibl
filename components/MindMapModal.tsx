'use client'

import MarkmapPreview from '@/components/MarkmapPreview'

interface MindMapModalProps {
  isPortuguese: boolean
  markmapMarkdown: string
  plantUmlMindMap: string
  /** The outline exactly as returned by the model (shown for comparison). */
  originalOutline?: string
  onClose: () => void
}

export default function MindMapModal({
  isPortuguese,
  markmapMarkdown,
  plantUmlMindMap,
  originalOutline,
  onClose,
}: MindMapModalProps) {
  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
        <div className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <div className="text-lg font-semibold text-[var(--on_surface)]">
                {isPortuguese ? 'Preview do mind map' : 'Mind map preview'}
              </div>
              <div className="text-sm text-[var(--on_surface)] opacity-70">
                {isPortuguese
                  ? 'Representacao visual do texto futuro e codigo PlantUML pronto para editor externo.'
                  : 'Visual representation of the future text and PlantUML code ready for external editors.'}
              </div>
            </div>
            <button
              onClick={() => onClose()}
              className="ghost-input"
            >
              {isPortuguese ? 'Fechar' : 'Close'}
            </button>
          </div>

          <div className="grid gap-6 p-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="bg-[var(--surface_container_low)] p-4">
                <div className="mb-3 font-label text-[10px] uppercase tracking-[0.12em] text-[var(--secondary)]">
                  {isPortuguese ? 'Preview visual interativo do mind map' : 'Interactive mind map preview'}
                </div>
                <MarkmapPreview markdown={markmapMarkdown} />
              </div>

              <div className="ai-user-decided rq-active-accent p-4">
                <div className="mb-2 font-label text-[10px] uppercase tracking-[0.12em] text-[var(--primary_container)]">
                  {isPortuguese ? 'Leitura do mapa' : 'Map reading'}
                </div>
                <p className="text-sm text-[var(--on_surface)] opacity-90">
                  {isPortuguese
                    ? 'O nodo raiz representa a pergunta final. Os ramos de segundo nivel correspondem aos topicos centrais e o terceiro nivel antecipa os detalhes que deverao aparecer no texto cientifico.'
                    : 'The root node represents the final question. Second-level branches capture the central topics, and the third level anticipates the details that should appear in the scientific text.'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-[var(--surface_container_low)] p-4">
                <div className="mb-2 font-label text-[10px] uppercase tracking-[0.12em] text-[var(--secondary)]">
                  PlantUML mind map
                </div>
                <pre className="overflow-x-auto bg-[var(--surface_container)] p-3 text-sm text-[var(--on_surface)]">
                  {plantUmlMindMap}
                </pre>
              </div>

              <div className="bg-[var(--surface_container_low)] p-4">
                <div className="mb-2 font-label text-[10px] uppercase tracking-[0.12em] text-[var(--secondary)]">
                  {isPortuguese ? 'Outline para plugin' : 'Plugin outline'}
                </div>
                <pre className="overflow-x-auto bg-[var(--surface_container)] p-3 text-sm text-[var(--on_surface)]">
                  {markmapMarkdown}
                </pre>
              </div>

              {originalOutline && (
                <div className="bg-[var(--surface_container_low)] p-4">
                  <div className="mb-2 font-label text-[10px] uppercase tracking-[0.12em] text-[var(--secondary)]">
                    {isPortuguese ? 'Outline original' : 'Original outline'}
                  </div>
                  <pre className="overflow-x-auto bg-[var(--surface_container)] p-3 text-sm text-[var(--on_surface)]">
                    {originalOutline}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
  )
}
