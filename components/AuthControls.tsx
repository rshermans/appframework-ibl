'use client'

import { signIn, signOut, useSession } from 'next-auth/react'
import { useI18n } from '@/components/I18nProvider'
import { useEffect, useState } from 'react'

export default function AuthControls() {
  const { data: session, status } = useSession()
  const { locale } = useI18n()
  const pt = locale === 'pt-PT'
  const [googleAvailable, setGoogleAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    let mounted = true

    const loadProviders = async () => {
      try {
        const response = await fetch('/api/auth/providers', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('Failed to load auth providers')
        }

        const providers = (await response.json()) as Record<string, unknown>
        if (mounted) {
          setGoogleAvailable(Boolean(providers?.google))
        }
      } catch {
        if (mounted) {
          setGoogleAvailable(false)
        }
      }
    }

    void loadProviders()

    return () => {
      mounted = false
    }
  }, [])

  if (status === 'loading') {
    return (
      <span className="rounded-[var(--radius-sm)] bg-[var(--surface_container)] px-3 py-2 text-xs font-medium text-[var(--on_surface)]">
        {pt ? 'A validar sessao...' : 'Validating session...'}
      </span>
    )
  }

  if (!session?.user) {
    if (googleAvailable === false) {
      return (
        <span className="rounded-[var(--radius-sm)] bg-[var(--surface_container)] px-3 py-2 text-xs font-medium text-[var(--on_surface)] opacity-80">
          {pt ? 'Login Google indisponivel (configurar AUTH_GOOGLE_ID/SECRET).' : 'Google login unavailable (set AUTH_GOOGLE_ID/SECRET).'}
        </span>
      )
    }

    return (
      <button
        type="button"
        onClick={() => void signIn('google')}
        disabled={googleAvailable !== true}
        className="rounded-[var(--radius-sm)] bg-[var(--surface_container)] px-3 py-2 text-xs font-semibold text-[var(--on_surface)] hover:bg-[var(--surface_container_high)]"
      >
        {googleAvailable === null
          ? (pt ? 'A carregar login...' : 'Loading sign-in...')
          : (pt ? 'Entrar com Google' : 'Sign in with Google')}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="max-w-[180px] truncate text-xs text-[var(--on_surface)] opacity-80">
        {session.user.email ?? session.user.name ?? (pt ? 'Utilizador' : 'User')}
      </span>
      <button
        type="button"
        onClick={() => signOut()}
        className="rounded-[var(--radius-sm)] bg-[var(--surface_container)] px-3 py-2 text-xs font-semibold text-[var(--on_surface)] hover:bg-[var(--surface_container_high)]"
      >
        {pt ? 'Sair' : 'Sign out'}
      </button>
    </div>
  )
}
