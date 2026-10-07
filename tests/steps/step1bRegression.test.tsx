import { describe, expect, it } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import Stage1Research from '@/components/Stage1Research'
import { getNextRecommendedStep } from '@/lib/flowProgress'
import { useWizardStore } from '@/store/wizardStore'
import { msg, renderStep, resetStore } from '../helpers'

describe('regression: Step 1B was reachable without a comparison and its button stayed disabled silently', () => {
  const flow = {
    candidateResearchQuestions: [{}], rqCandidates: [], step0OptionalCompleted: true, selectedRQs: ['A?', 'B?'], comparisonResult: null,
    finalResearchQuestion: null, searchDesign: null, searchArticles: [], evidenceRecords: [], knowledgeStructure: null, explanationDraft: null,
  }

  it('the stepper now recommends the comparison (1A) before the synthesis (1B)', () => {
    expect(getNextRecommendedStep(flow)).toBe('step1a_compare')
  })

  it('the 1B card is locked, with the reason, until the comparison exists', () => {
    resetStore({ stage: 1, workflowStep: 'step1_select', step0OptionalCompleted: true, selectedRQs: ['A?', 'B?'], comparisonResult: null })
    renderStep(<Stage1Research />)
    const card = screen.getByRole('button', { name: new RegExp(msg('common.lockedStep1B').slice(0, 25)) })
    expect(card).toBeDisabled()
    fireEvent.click(card)
    expect(useWizardStore.getState().workflowStep).toBe('step1_select')
  })

  it('the 1B card opens once a comparison is stored', () => {
    resetStore({
      stage: 1, workflowStep: 'step1_select', step0OptionalCompleted: true, selectedRQs: ['A?', 'B?'],
      comparisonResult: { mode: 'quick', comparisons: [], recommendedQuestion: 'A?', recommendationReason: 'r' },
    })
    renderStep(<Stage1Research />)
    expect(screen.queryByText(msg('common.lockedStep1B'))).not.toBeInTheDocument()
  })
})
