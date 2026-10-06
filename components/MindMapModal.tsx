'use client'

import Drawer from '@/components/ui/Drawer'
import MarkmapPreview from '@/components/MarkmapPreview'

interface MindMapModalProps {
  isPortuguese: boolean
  markmapMarkdown: string
  plantUmlMindMap: string
  /** The outline exactly as returned by the model (shown for comparison). */
  originalOutline?: string
  onClose: () => void
}

/** Mind map shown over the step (drawer) so the learner never loses their place. */
export default function MindMapModal({
  isPortuguese,
  markmapMarkdown,
  plantUmlMindMap,
  originalOutline,
  onClose,
}: MindMapModalProps) {
  return (
    <Drawer
      open
      onClose={onClose}
      size="xl"
      title={isPortuguese ? 'Preview do mind map' : 'Mind map preview'}
      closeLabel={isPortuguese ? 'Fechar' : 'Close'}
    >
      <p className="mb-4 text-sm text-[var(--on_surface)] opacity-70">
        {isPortuguese
          ? 'Representacao visual do texto futuro e codigo PlantUML pronto para editor externo.'
          : 'Visual representation of the future text and PlantUML code ready for external editors.'}
      </p>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
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
    </Drawer>
  )
}
