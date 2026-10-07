'use client'

import { useState } from 'react'
import { useI18n } from '@/components/I18nProvider'
import type { GameScenario } from '@/types/research-workflow'

interface GamePlayerProps {
  scenario: GameScenario
}

interface Decision {
  prompt: string
  choice: string
  consequence: string
}

/**
 * Plays the generated scenario in the page: one decision at a time, the consequence after each
 * choice and a recap at the end. The model supplies the scenario; the "game engine" is this loop.
 */
export default function GamePlayer({ scenario }: GamePlayerProps) {
  const { locale } = useI18n()
  const pt = locale === 'pt-PT'
  const playable = scenario.branches.filter((branch) => branch.choices.length > 0)
  const [index, setIndex] = useState(0)
  const [pending, setPending] = useState<Decision | null>(null)
  const [history, setHistory] = useState<Decision[]>([])
  const [started, setStarted] = useState(false)

  if (playable.length === 0) return null

  const finished = started && index >= playable.length
  const branch = playable[Math.min(index, playable.length - 1)]

  const restart = () => {
    setIndex(0)
    setPending(null)
    setHistory([])
    setStarted(true)
  }

  const choose = (choiceId: string) => {
    const choice = branch.choices.find((candidate) => candidate.id === choiceId)
    if (!choice) return
    setPending({ prompt: branch.prompt, choice: choice.text, consequence: choice.consequence })
  }

  const next = () => {
    if (!pending) return
    setHistory((current) => [...current, pending])
    setPending(null)
    setIndex((current) => current + 1)
  }

  if (!started) {
    return (
      <section className="rounded-[var(--radius-md)] bg-[var(--surface_container_low)] p-5">
        <h3 className="font-display text-base font-semibold text-[var(--on_surface)]">{pt ? 'Jogar agora' : 'Play now'}</h3>
        <p className="mt-1 text-sm text-[var(--on_surface_variant)]">{scenario.objective}</p>
        <p className="mt-2 text-xs text-[var(--on_surface_variant)]">
          {pt ? `${playable.length} decisões. Cada escolha tem consequências baseadas na evidência.` : `${playable.length} decisions. Every choice has evidence-based consequences.`}
        </p>
        <button
          type="button"
          onClick={restart}
          className="mt-4 min-h-[44px] rounded-[var(--radius-md)] bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on_primary)] transition hover:opacity-90"
        >
          {pt ? 'Começar o jogo' : 'Start the game'}
        </button>
      </section>
    )
  }

  if (finished) {
    return (
      <section className="space-y-3 rounded-[var(--radius-md)] bg-[var(--surface_container_low)] p-5">
        <h3 className="font-display text-base font-semibold text-[var(--on_surface)]">{pt ? 'Fim do jogo — o seu percurso' : 'Game over — your path'}</h3>
        <ol className="space-y-2">
          {history.map((decision, position) => (
            <li key={position} className="rounded-[var(--radius-sm)] bg-[var(--surface_container_lowest)] p-3 text-sm ring-1 ring-[var(--outline_variant)]">
              <p className="font-semibold text-[var(--on_surface)]">{position + 1}. {decision.prompt}</p>
              <p className="mt-1 text-[var(--on_surface)]">{pt ? 'Escolheu' : 'You chose'}: {decision.choice}</p>
              <p className="mt-1 text-[var(--on_surface_variant)]">{decision.consequence}</p>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={restart}
          className="min-h-[44px] rounded-[var(--radius-md)] bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on_primary)] transition hover:opacity-90"
        >
          {pt ? 'Jogar novamente' : 'Play again'}
        </button>
      </section>
    )
  }

  return (
    <section className="space-y-4 rounded-[var(--radius-md)] bg-[var(--surface_container_low)] p-5" aria-live="polite">
      <p className="font-label text-[10px] uppercase tracking-[0.12em] text-[var(--secondary)]">
        {pt ? `Decisão ${index + 1} de ${playable.length}` : `Decision ${index + 1} of ${playable.length}`}
      </p>
      <p className="text-base leading-7 text-[var(--on_surface)]">{branch.prompt}</p>

      {pending ? (
        <div className="space-y-3">
          <p className="text-sm text-[var(--on_surface)]">
            <span className="font-semibold">{pt ? 'Escolheu' : 'You chose'}:</span> {pending.choice}
          </p>
          <p className="rounded-[var(--radius-sm)] bg-[var(--surface_container_lowest)] p-3 text-sm text-[var(--on_surface)] ring-1 ring-[var(--outline_variant)]">
            {pending.consequence}
          </p>
          <button
            type="button"
            onClick={next}
            className="min-h-[44px] rounded-[var(--radius-md)] bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on_primary)] transition hover:opacity-90"
          >
            {index + 1 >= playable.length ? (pt ? 'Ver o resultado' : 'See the result') : pt ? 'Continuar' : 'Continue'}
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {branch.choices.map((choice) => (
            <li key={choice.id}>
              <button
                type="button"
                onClick={() => choose(choice.id)}
                className="min-h-[44px] w-full rounded-[var(--radius-md)] bg-[var(--surface_container_lowest)] px-4 py-3 text-left text-sm font-medium text-[var(--on_surface)] ring-1 ring-[var(--outline_variant)] transition hover:bg-[var(--surface_container)]"
              >
                {choice.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
