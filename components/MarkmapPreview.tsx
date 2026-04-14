'use client'

import { useEffect, useRef, useState } from 'react'

interface MarkmapPreviewProps {
  markdown: string
  className?: string
}

const DEFAULT_HEIGHT = 420
const DEFAULT_WIDTH = 800

export default function MarkmapPreview({ markdown, className }: MarkmapPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [error, setError] = useState('')
  const [containerWidth, setContainerWidth] = useState(DEFAULT_WIDTH)

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
      if (!svgRef.current) return

      try {
        setError('')

        const svg = svgRef.current
        const width = Math.max(containerWidth || containerRef.current?.clientWidth || DEFAULT_WIDTH, 320)

        svg.innerHTML = ''
        svg.setAttribute('width', String(width))
        svg.setAttribute('height', String(DEFAULT_HEIGHT))
        svg.setAttribute('viewBox', `0 0 ${width} ${DEFAULT_HEIGHT}`)
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
        svg.style.width = `${width}px`
        svg.style.maxWidth = '100%'
        svg.style.height = `${DEFAULT_HEIGHT}px`
        svg.style.display = 'block'

        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

        const [{ Transformer }, { Markmap }] = await Promise.all([
          import('markmap-lib'),
          import('markmap-view'),
        ])

        if (disposed || !svgRef.current) return

        const transformer = new Transformer()
        const { root } = transformer.transform(markdown?.trim() || '- Mind map\n  - Empty')

        Markmap.create(
          svg,
          {
            autoFit: true,
            duration: 0,
            maxWidth: 240,
            pan: true,
            zoom: true,
          },
          root
        )
      } catch (err) {
        if (!disposed) {
          setError(err instanceof Error ? err.message : 'Failed to render mind map preview.')
        }
      }
    }

    renderMarkmap()

    return () => {
      disposed = true
      if (svgRef.current) {
        svgRef.current.innerHTML = ''
      }
    }
  }, [markdown, containerWidth])

  if (error) {
    return (
      <div className={`rounded-[var(--radius-xl)] bg-[var(--surface_container_lowest)] p-4 text-sm text-[var(--on_surface)] ghost-border ${className || ''}`}>
        {error}
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`overflow-x-auto overflow-y-hidden rounded-[var(--radius-xl)] bg-[var(--surface_container_lowest)] p-2 ghost-border ${className || ''}`}>
      <svg ref={svgRef} />
    </div>
  )
}
