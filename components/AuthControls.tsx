'use client'

import { signIn, signOut, useSession } from 'next-auth/react'
import { useI18n } from '@/components/I18nProvider'
import { useEffect, useState } from 'react'

const AUTH_ERRORS: Record<string, { pt: string; en: string }> = {
  Configuration: {
    pt: 'Login indisponivel: configuracao do servidor incompleta (AUTH_SECRET / credenciais Google).',
    en: 'Sign-in unavailable: incomplete server configuration (AUTH_SECRET / Google credentials).',
  },
  AccessDenied: {
    pt: 'Acesso negado pela Google. Se a app esta em modo "Teste", adicione a sua conta como utilizador de teste na Google Cloud Console.',
    en: 'Access denied by Google. If the app is in "Testing" mode, add your account as a test user in Google Cloud Console.',
  },
  OAuthAccountNotLinked: {
    pt: 'Este email ja esta associado a outro metodo de login.',
    en: 'This email is already linked to a different sign-in method.',
  },
  OAuthCallback: {
    pt: 'A Google devolveu um erro no login. Verifique o redirect URI autorizado (/api/auth/callback/google).',
    en: 'Google returned an error during sign-in. Check the authorized redirect URI (/api/auth/callback/google).',
  },
  OAuthSignin: {
    pt: 'Nao foi possivel iniciar o login com a Google.',
    en: 'Could not start the Google sign-in.',
  },
  Callback: {
    pt: 'Falha ao concluir o login (possivel indisponibilidade da base de dados). Tente novamente.',
    en: 'Failed to complete sign-in (possible database unavailability). Please try again.',
  },
}

export default function AuthControls() {
  const { data: session, status } = useSession()
  const { locale } = useI18n()
  const pt = locale === 'pt-PT'
  const [googleAvailable, setGoogleAvailable] = useState<boolean | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    // NextAuth redirects to `/?error=<code>` on failure (pages.error = '/').
    const code = new URLSearchParams(window.location.search).get('error')
    if (!code) return
    setAuthError(code)
    const url = new URL(window.location.href)
    url.searchParams.delete('error')
    window.history.replaceState(null, '', url.toString())
  }, [])

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

    const errorMessage = authError
      ? (AUTH_ERRORS[authError]?.[pt ? 'pt' : 'en'] ??
          (pt ? `Erro de login (${authError}).` : `Sign-in error (${authError}).`))
      : null

    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => {
            setAuthError(null)
            void signIn('google')
          }}
          disabled={googleAvailable !== true}
          className="rounded-[var(--radius-sm)] bg-[var(--surface_container)] px-3 py-2 text-xs font-semibold text-[var(--on_surface)] hover:bg-[var(--surface_container_high)]"
        >
          {googleAvailable === null
            ? (pt ? 'A carregar login...' : 'Loading sign-in...')
            : (pt ? 'Entrar com Google' : 'Sign in with Google')}
        </button>
        {errorMessage && (
          <span role="alert" className="max-w-[320px] text-right text-xs text-red-600">
            {errorMessage}
          </span>
        )}
      </div>
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
