import { afterEach, describe, expect, it } from 'vitest'
import { act, screen } from '@testing-library/react'
import AiActivityBanner from '@/components/AiActivityBanner'
import { aiActivity } from '@/lib/aiActivity'
import { renderStep } from '../helpers'

afterEach(() => act(() => { while (aiActivity.get().active) aiActivity.end() }))

describe('AiActivityBanner', () => {
  it('is hidden when idle, shows a spinner while the AI works and the retry count on retries', () => {
    renderStep(<AiActivityBanner />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    act(() => aiActivity.begin(3))
    expect(screen.getByRole('status')).toHaveTextContent(/A IA está a trabalhar|AI is working/)
    act(() => aiActivity.attempt(2))
    expect(screen.getByRole('status')).toHaveTextContent(/2\/3/)
    act(() => aiActivity.end())
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
