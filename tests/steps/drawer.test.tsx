import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import Drawer from '@/components/ui/Drawer'

function Harness({ onClose = () => {} }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>opener</button>
      <Drawer open={open} onClose={() => { setOpen(false); onClose() }} title="Panel title" closeLabel="Fechar" footer={<button>footer-action</button>}>
        <button>first-inside</button>
        <input aria-label="field" />
      </Drawer>
    </>
  )
}

describe('Drawer (overlay used instead of pushing the page)', () => {
  it('is an accessible modal dialog labelled by its title', () => {
    render(<Harness />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('opener'))
    const dialog = screen.getByRole('dialog', { name: 'Panel title' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText('footer-action')).toBeInTheDocument()
  })

  it('locks background scroll and flags the page while open, and undoes both on close', () => {
    render(<Harness />)
    fireEvent.click(screen.getByText('opener'))
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.body.dataset.overlay).toBe('open')
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(document.body.style.overflow).toBe('')
    expect(document.body.dataset.overlay).toBeUndefined()
  })

  it('closes with Escape and with the backdrop, and returns focus to the opener', () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    const opener = screen.getByText('opener')
    opener.focus()
    fireEvent.click(opener)
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(opener)

    fireEvent.click(opener)
    fireEvent.click(document.querySelector('[aria-hidden="true"].absolute') as HTMLElement)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('keeps Tab inside the panel', () => {
    render(<Harness />)
    fireEvent.click(screen.getByText('opener'))
    const buttons = screen.getByRole('dialog').querySelectorAll<HTMLElement>('button,input')
    const last = buttons[buttons.length - 1]
    last.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(buttons[0])
    buttons[0].focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })

  it('renders a centred card for the dialog variant', () => {
    render(<Drawer open onClose={() => {}} title="Confirm" variant="dialog" size="md"><p>body</p></Drawer>)
    expect(screen.getByRole('dialog').className).toMatch(/rounded/)
    expect(screen.getByRole('dialog').className).not.toMatch(/h-dvh/)
  })

  it('stacked overlays: Escape closes only the top one and the page unlocks once all are closed', () => {
    function Nested() {
      const [outer, setOuter] = useState(true)
      const [inner, setInner] = useState(true)
      return (
        <>
          <Drawer open={outer} onClose={() => setOuter(false)} title="Outer"><p>outer body</p></Drawer>
          <Drawer open={inner} onClose={() => setInner(false)} title="Inner"><p>inner body</p></Drawer>
        </>
      )
    }
    render(<Nested />)
    expect(screen.getAllByRole('dialog')).toHaveLength(2)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Inner' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Outer' })).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('hidden') // still locked: one overlay remains
    expect(document.body.dataset.overlay).toBe('open')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
    expect(document.body.dataset.overlay).toBeUndefined()
  })
})
