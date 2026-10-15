'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { aiActivity } from '@/lib/aiActivity'
import { useI18n } from '@/components/I18nProvider'

/** Spinner shown while any AI request runs: long answers are normal, and it says so. */
export default function AiActivityBanner() {
  const { locale } = useI18n()
  const pt = locale === 'pt-PT'
  const activity = useSyncExternalStore(aiActivity.subscribe, aiActivity.get, aiActivity.getServerSnapshot)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!activity.active) return
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [activity.active])

  if (!activity.active || activity.startedAt === null) return null
  const seconds = Math.max(0, Math.floor((now - activity.startedAt) / 1000))
  const retrying = activity.attempt > 1
  const slow = seconds >= 15

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-[var(--radius-md)] border border-[var(--outline_variant)] bg-[var(--surface_container_lowest)] p-3 shadow-lg"
    >
      <div className="flex items-center gap-3">
        <span aria-hidden className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[var(--outline_variant)] border-t-[var(--primary)]" />
        <div className="min-w-0 text-sm text-[var(--on_surface)]">
          <p className="font-medium">
            {retrying
              ? (pt ? `A tentar novamente (${activity.attempt}/${activity.maxAttempts})…` : `Trying again (${activity.attempt}/${activity.maxAttempts})…`)
              : (pt ? 'A IA está a trabalhar…' : 'The AI is working…')}{' '}
            <span className="tabular-nums text-[var(--on_surface_variant)]">{seconds}s</span>
          </p>
          {slow && (
            <p className="mt-0.5 text-xs text-[var(--on_surface_variant)]">
              {pt
                ? 'Está a demorar mais do que o habitual. Pode aguardar — o seu trabalho está guardado e voltamos a tentar sozinhos.'
                : 'This is taking longer than usual. Feel free to wait — your work is saved and we retry automatically.'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
