'use client'

import { useEffect, useRef, useState } from 'react'
import { Maximize2, RefreshCw, Download } from 'lucide-react'
import Drawer from '@/components/ui/Drawer'
import type { Markmap } from 'markmap-view'

interface MarkmapPreviewProps {
  markdown: string
  className?: string
}

const DEFAULT_HEIGHT = 420

interface MarkmapCanvasProps {
  markdown: string
  height: number | string
  onError: (message: string) => void
  svgRef?: React.MutableRefObject<SVGSVGElement | null>
}

/**
 * Owns one Markmap instance. The map is created once, as soon as the SVG has a
 * real size (a hidden/zero-size container used to yield a blank map), updated
 * in place when the markdown changes and re-fitted when the container resizes.
 */
function MarkmapCanvas({ markdown, height, onError, svgRef: externalSvgRef }: MarkmapCanvasProps) {
  const internalSvgRef = useRef<SVGSVGElement | null>(null)
  const svgRef = externalSvgRef ?? internalSvgRef
  const markmapRef = useRef<Markmap | null>(null)
  const markdownRef = useRef(markdown)
  markdownRef.current = markdown

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    let disposed = false
    let creating = false
    let fitTimer: ReturnType<typeof setTimeout> | undefined

    async function render() {
      const [{ Transformer }, { Markmap }] = await Promise.all([
        import('markmap-lib'),
        import('markmap-view'),
      ])
      if (disposed || !svg) return

      const { root } = new Transformer().transform(markdownRef.current?.trim() || '- Mind map\n  - Empty')

      if (markmapRef.current) {
        void markmapRef.current.setData(root)
        void markmapRef.current.fit()
        return
      }

      markmapRef.current = Markmap.create(
        svg,
        { autoFit: true, duration: 400, maxWidth: 300, pan: true, zoom: true },
        root
      )
    }

    const tryRender = () => {
      if (disposed || creating) return
      const { width, height: h } = svg.getBoundingClientRect()
      if (width < 10 || h < 10) return // wait until the container is laid out
      creating = true
      render()
        .catch((err) => {
          console.error('Markmap error:', err)
          if (!disposed) onError('Falha ao carregar o visualizador do mapa mental.')
        })
        .finally(() => {
          creating = false
        })
    }

    const observer = new ResizeObserver(() => {
      if (!markmapRef.current) {
        tryRender()
        return
      }
      clearTimeout(fitTimer)
      fitTimer = setTimeout(() => void markmapRef.current?.fit(), 120)
    })
    observer.observe(svg)
    tryRender()

    return () => {
      disposed = true
      clearTimeout(fitTimer)
      observer.disconnect()
      markmapRef.current?.destroy()
      markmapRef.current = null
      svg.innerHTML = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Data updates reuse the existing instance instead of rebuilding the SVG.
  useEffect(() => {
    if (!markmapRef.current) return
    import('markmap-lib')
      .then(({ Transformer }) => {
        const { root } = new Transformer().transform(markdown?.trim() || '- Mind map\n  - Empty')
        void markmapRef.current?.setData(root)
        void markmapRef.current?.fit()
      })
      .catch((err) => console.error('Markmap update error:', err))
  }, [markdown])

  return (
    <svg
      ref={svgRef}
      className="block w-full cursor-grab active:cursor-grabbing"
      style={{ height }}
    />
  )
}

function downloadSvg(svg: SVGSVGElement | null) {
  if (!svg) return
  const clone = svg.cloneNode(true) as SVGSVGElement
  const rect = svg.getBoundingClientRect()
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(Math.round(rect.width)))
  clone.setAttribute('height', String(Math.round(rect.height)))
  clone.style.background = '#ffffff'

  // Markmap styles live in a <style> tag in the document head; inline them so
  // the exported file renders correctly outside the page.
  const css = Array.from(document.querySelectorAll('style'))
    .map((style) => style.textContent || '')
    .filter((text) => text.includes('.markmap'))
    .join('\n')
  if (css) {
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
    style.textContent = css
    clone.insertBefore(style, clone.firstChild)
  }

  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'mapa-mental.svg'
  link.click()
  URL.revokeObjectURL(url)
}

export default function MarkmapPreview({ markdown, className }: MarkmapPreviewProps) {
  const [error, setError] = useState('')
  const [isMaximized, setIsMaximized] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const inlineSvgRef = useRef<SVGSVGElement | null>(null)

  if (error) {
    return (
      <div className={`rounded-[var(--radius-xl)] bg-[var(--surface_container_lowest)] p-6 text-sm text-[var(--on_surface)] ghost-border flex flex-col items-center gap-4 ${className || ''}`}>
        <p className="text-center opacity-70">{error}</p>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setError('')
            setRetryKey((v) => v + 1)
          }}
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
      <div className={`group relative overflow-hidden rounded-[var(--radius-xl)] bg-white p-2 ghost-border transition-all hover:ambient-shadow ${className || ''}`}>
        <div className="absolute top-4 right-4 z-10 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            onClick={() => downloadSvg(inlineSvgRef.current)}
            className="p-2 rounded-full bg-[var(--surface_container_highest)] text-[var(--on_surface)] hover:scale-110 active:scale-95"
            title="Descarregar SVG"
            aria-label="Descarregar SVG"
          >
            <Download size={18} />
          </button>
          <button
            onClick={() => setIsMaximized(true)}
            className="p-2 rounded-full bg-[var(--surface_container_highest)] text-[var(--on_surface)] hover:scale-110 active:scale-95"
            title="Maximizar"
            aria-label="Maximizar"
          >
            <Maximize2 size={18} />
          </button>
        </div>
        <MarkmapCanvas
          key={retryKey}
          markdown={markdown}
          height={DEFAULT_HEIGHT}
          onError={setError}
          svgRef={inlineSvgRef}
        />
      </div>

      <Drawer
        open={isMaximized}
        onClose={() => setIsMaximized(false)}
        variant="dialog"
        size="full"
        title="Mapa Mental Interativo"
        closeLabel="Fechar"
      >
        {/* Solid white behind the map so the text is always readable */}
        <div className="h-[70dvh] overflow-hidden rounded-[var(--radius-md)] bg-white ring-1 ring-[var(--outline_variant)]">
          <MarkmapCanvas markdown={markdown} height="100%" onError={setError} />
        </div>
      </Drawer>
    </>
  )
}
