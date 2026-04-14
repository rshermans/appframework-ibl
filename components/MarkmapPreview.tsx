'use client'

import { useEffect, useRef, useState } from 'react'
import { Maximize2, X, RefreshCw } from 'lucide-react'

interface MarkmapPreviewProps {
  markdown: string
  className?: string
}

const DEFAULT_HEIGHT = 420
const DEFAULT_WIDTH = 800

export default function MarkmapPreview({ markdown, className }: MarkmapPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const modalSvgRef = useRef<SVGSVGElement | null>(null)
  const [error, setError] = useState('')
  const [containerWidth, setContainerWidth] = useState(DEFAULT_WIDTH)
  const [isMaximized, setIsMaximized] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver((entries) => {
      const nextWidth = Math.max(Math.round(entries[0]?.contentRect.width || DEFAULT_WIDTH), 320)
      setContainerWidth((currentWidth) => (currentWidth === nextWidth ? currentWidth : nextWidth))
    })

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let disposed = false

    async function renderMarkmap() {
      const targetSvg = isMaximized ? modalSvgRef.current : svgRef.current
      if (!targetSvg) return

      try {
        setError('')
        const width = isMaximized 
          ? window.innerWidth * 0.9 
          : Math.max(containerWidth || containerRef.current?.clientWidth || DEFAULT_WIDTH, 320)
        
        const height = isMaximized ? window.innerHeight * 0.8 : DEFAULT_HEIGHT

        targetSvg.innerHTML = ''
        targetSvg.setAttribute('width', String(width))
        targetSvg.setAttribute('height', String(height))
        targetSvg.style.width = '100%'
        targetSvg.style.height = `${height}px`
        targetSvg.style.display = 'block'

        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

        // Dynamically import markmap libraries
        const [{ Transformer }, { Markmap }] = await Promise.all([
          import('markmap-lib'),
          import('markmap-view'),
        ])

        if (disposed) return

        const transformer = new Transformer()
        const { root } = transformer.transform(markdown?.trim() || '- Mind map\n  - Empty')

        Markmap.create(
          targetSvg,
          {
            autoFit: true,
            duration: 500,
            maxWidth: 300,
            pan: true,
            zoom: true,
          },
          root
        )
      } catch (err) {
        if (!disposed) {
          console.error('Markmap error:', err)
          setError('Falha ao carregar o visualizador do mapa mental. Por favor, tente atualizar a página ou clique no botão de recarregar.')
        }
      }
    }

    renderMarkmap()

    return () => {
      disposed = true
    }
  }, [markdown, containerWidth, isMaximized, retryKey])

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation()
    setRetryKey(v => v + 1)
  }

  if (error) {
    return (
      <div className={`rounded-[var(--radius-xl)] bg-[var(--surface_container_lowest)] p-6 text-sm text-[var(--on_surface)] ghost-border flex flex-col items-center gap-4 ${className || ''}`}>
        <p className="text-center opacity-70">{error}</p>
        <button 
          onClick={handleRetry}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--surface_container_high)] hover:bg-[var(--surface_container_highest)] transition-colors font-medium border border-[var(--outline_variant)]"
        >
          <RefreshCw size={16} />
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <>
      <div ref={containerRef} className={`group relative overflow-hidden rounded-[var(--radius-xl)] bg-[var(--surface_container_lowest)] p-2 ghost-border transition-all hover:ambient-shadow ${className || ''}`}>
        <button
          onClick={() => setIsMaximized(true)}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-[var(--surface_container_highest)] text-[var(--on_surface)] opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 active:scale-95"
          title="Maximizar"
        >
          <Maximize2 size={18} />
        </button>
        <svg ref={svgRef} className="cursor-grab active:cursor-grabbing" />
      </div>

      {isMaximized && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-md" 
            onClick={() => setIsMaximized(false)} 
          />
          <div className="relative w-full max-w-6xl h-[90vh] glass-panel-heavy rounded-[var(--radius-2xl)] ambient-shadow overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--outline_variant)]">
              <h3 className="font-display font-semibold text-[var(--on_surface)]">Mapa Mental Interativo</h3>
              <button
                onClick={() => setIsMaximized(false)}
                className="p-2 rounded-full hover:bg-[var(--surface_container_highest)] text-[var(--on_surface)] transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 bg-[var(--surface_container_lowest)] relative overflow-hidden">
               <svg ref={modalSvgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
