'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import {
  DEFAULT_LOCALE,
  getMessage,
  normalizeLocale,
  type Locale,
} from '@/lib/i18n'

const LOCALE_STORAGE_KEY = 'ibl-ai.locale'
const LEGACY_LOCALE_STORAGE_KEY = 'relia.locale'

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, variables?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  useEffect(() => {
    const savedLocale = normalizeLocale(
      window.localStorage.getItem(LOCALE_STORAGE_KEY)
      ?? window.localStorage.getItem(LEGACY_LOCALE_STORAGE_KEY)
    )
    setLocaleState(savedLocale)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    document.documentElement.lang = locale
  }, [locale])

  const value: I18nContextValue = {
    locale,
    setLocale: setLocaleState,
    t: (key, variables) => getMessage(locale, key, variables),
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }

  return context
}

