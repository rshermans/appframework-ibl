import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { useWizardStore } from '@/store/wizardStore'
import Step3Evidence from '@/components/Step3Evidence'
import Step2Search from '@/components/Step2Search'
import { aiOk, approvedQuestion, article, evidenceRecord, mockFetch, msg, renderStep, resetStore, searchDesign } from '../helpers'

const state = () => useWizardStore.getState()
afterEach(() => vi.restoreAllMocks())

const longAbstract = 'Full abstract sentence about coral bleaching and warming. '.repeat(8)
const records = [
  evidenceRecord({ id: 'e1', title: 'Evidence one', claim: 'Claim ONE', methodology: 'Method ONE', findings: ['Finding ONE'], limitations: ['Limit ONE'], citation: 'Silva, 2020' }),
  evidenceRecord({ id: 'e2', title: 'Evidence two', claim: 'Claim TWO', methodology: 'Method TWO', findings: ['Finding TWO'], limitations: ['Limit TWO'], citation: 'Costa, 2021' }),
  evidenceRecord({ id: 'e3', title: 'Evidence three', claim: 'Claim THREE', methodology: 'Method THREE', findings: ['Finding THREE'], limitations: ['Limit THREE'], citation: 'Pereira, 2022' }),
]

describe('Step 3 - evidence records open in a drawer', () => {
  beforeEach(() => resetStore({ finalResearchQuestion: approvedQuestion, searchDesign, evidenceRecords: records }))

  it('lists compact rows (claim, type, relevance) without the full record inline', () => {
    renderStep(<Step3Evidence />)
    expect(screen.getByText('Evidence one')).toBeInTheDocument()
    expect(screen.getByText('Claim ONE')).toBeInTheDocument()
    expect(screen.getAllByText(/4\/5/).length).toBeGreaterThanOrEqual(3)
    expect(screen.queryByText('Method ONE')).not.toBeInTheDocument()
    expect(screen.queryByText('Limit ONE')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the whole record in an overlay and keeps the learner on the same page', () => {
    renderStep(<Step3Evidence />)
    const stepBefore = state().workflowStep
    fireEvent.click(screen.getByRole('button', { name: /Ver detalhes: Evidence two/ }))
    const dialog = screen.getByRole('dialog', { name: /2 \/ 3/ })
    for (const text of ['Claim TWO', 'Method TWO', 'Finding TWO', 'Limit TWO', 'Costa, 2021']) {
      expect(within(dialog).getByText(text)).toBeInTheDocument()
    }
    expect(state().workflowStep).toBe(stepBefore) // opening a record never navigates away
  })

  it('moves between records with Previous/Next and disables them at the ends', () => {
    renderStep(<Step3Evidence />)
    fireEvent.click(screen.getByRole('button', { name: /Ver detalhes: Evidence one/ }))
    const dialog = () => screen.getByRole('dialog')
    expect(within(dialog()).getByRole('button', { name: /Anterior|Previous/ })).toBeDisabled()
    fireEvent.click(within(dialog()).getByRole('button', { name: /Seguinte|Next/ }))
    expect(within(dialog()).getByText('Method TWO')).toBeInTheDocument()
    fireEvent.click(within(dialog()).getByRole('button', { name: /Seguinte|Next/ }))
    expect(within(dialog()).getByText('Method THREE')).toBeInTheDocument()
    expect(within(dialog()).getByRole('button', { name: /Seguinte|Next/ })).toBeDisabled()
    fireEvent.click(within(dialog()).getByRole('button', { name: /Anterior|Previous/ }))
    expect(within(dialog()).getByText('Method TWO')).toBeInTheDocument()
  })

  it('closes with Escape and the list is untouched', () => {
    renderStep(<Step3Evidence />)
    fireEvent.click(screen.getByRole('button', { name: /Ver detalhes: Evidence one/ }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(state().evidenceRecords).toHaveLength(3)
  })

  it('navigates only within the filtered records', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      evidenceRecord({ id: `m${i}`, title: `Reef study ${i}`, claim: i === 3 || i === 7 ? `Special claim ${i}` : `Plain claim ${i}`, methodology: `Method M${i}` })
    )
    resetStore({ finalResearchQuestion: approvedQuestion, searchDesign, evidenceRecords: many })
    renderStep(<Step3Evidence />)
    fireEvent.change(screen.getByPlaceholderText(/Filtrar evidências|Filter evidence/), { target: { value: 'special' } })
    fireEvent.click(screen.getByRole('button', { name: /Ver detalhes: Reef study 3/ }))
    const dialog = screen.getByRole('dialog', { name: /1 \/ 2/ })
    fireEvent.click(within(dialog).getByRole('button', { name: /Seguinte|Next/ }))
    expect(within(screen.getByRole('dialog')).getByText('Method M7')).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: /Seguinte|Next/ })).toBeDisabled()
  })
})

describe('Step 3 - article details drawer', () => {
  const rich = article('a1', { title: 'Coral bleaching', abstract: longAbstract, doi: '10.1234/abc', url: 'https://example.org/paper', authors: ['Silva', 'Costa', 'Lopes', 'Pinto', 'Reis'] })
  const ready = () =>
    resetStore({ finalResearchQuestion: approvedQuestion, searchDesign, searchArticles: [rich], selectedSearchArticleIds: ['a1'] })

  it('shows the full abstract, every author and safe external links', () => {
    ready()
    renderStep(<Step3Evidence />)
    fireEvent.click(screen.getByRole('button', { name: /Ver detalhes: Coral bleaching/ }))
    const dialog = screen.getByRole('dialog', { name: /Detalhes do artigo|Article details/ })
    expect(within(dialog).getByText(/Silva, Costa, Lopes, Pinto, Reis/)).toBeInTheDocument()
    expect(within(dialog).getByText(longAbstract.trim(), { exact: false })).toBeInTheDocument()
    const doi = within(dialog).getByRole('link', { name: '10.1234/abc' })
    expect(doi).toHaveAttribute('href', 'https://doi.org/10.1234/abc')
    const url = within(dialog).getByRole('link', { name: 'https://example.org/paper' })
    expect(url).toHaveAttribute('target', '_blank')
    expect(url).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('analyses the article straight from the drawer', async () => {
    ready()
    const api = mockFetch({ ai: () => aiOk({ title: 'Extracted', source_type: 'paper', claim: 'A claim', methodology: 'm', findings: ['x'], limitations: ['y'], relevance_score: 5, citation: 'Doe, 2021' }) })
    renderStep(<Step3Evidence />)
    fireEvent.click(screen.getByRole('button', { name: /Ver detalhes: Coral bleaching/ }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: msg('steps.step3.analyzeButton') }))
    await waitFor(() => expect(state().evidenceRecords).toHaveLength(1))
    expect(api.ai()[0].body.source).toContain('Title: Coral bleaching')
    expect(state().evidenceRecords[0].sourceArticleId).toBe('a1')
    expect(screen.queryByRole('dialog', { name: /Detalhes do artigo|Article details/ })).not.toBeInTheDocument()
  })

  it('handles an article without abstract, DOI or URL', () => {
    resetStore({ finalResearchQuestion: approvedQuestion, searchDesign, searchArticles: [article('a2', { title: 'Bare', abstract: '', doi: undefined, url: undefined, authors: [] })], selectedSearchArticleIds: ['a2'] })
    renderStep(<Step3Evidence />)
    fireEvent.click(screen.getByRole('button', { name: /Ver detalhes: Bare/ }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).queryByRole('link')).not.toBeInTheDocument()
    expect(within(dialog).getByText(msg('common.noAbstract'))).toBeInTheDocument()
  })
})

describe('Step 2 - article details drawer', () => {
  it('lets the learner select an article from its detail view', () => {
    resetStore({
      finalResearchQuestion: approvedQuestion, searchDesign,
      searchArticles: [article('a1', { title: 'Reef paper', abstract: longAbstract })], selectedSearchArticleIds: [],
    })
    renderStep(<Step2Search />)
    fireEvent.click(screen.getByRole('button', { name: /Ver detalhes: Reef paper/ }))
    const dialog = screen.getByRole('dialog', { name: /Detalhes do artigo|Article details/ })
    expect(within(dialog).getByText(longAbstract.trim(), { exact: false })).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: /Selecionar para análise|Select for analysis/ }))
    expect(state().selectedSearchArticleIds).toEqual(['a1'])
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: /Remover da seleção|Remove from selection/ })).toBeInTheDocument()
  })
})
