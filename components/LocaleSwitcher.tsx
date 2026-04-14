'use client'

import { SUPPORTED_LOCALES, getLocaleLabel, type Locale } from '@/lib/i18n'
import { useI18n } from '@/components/I18nProvider'

export default function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n()

  return (
    <div className={compact ? 'flex items-center gap-2' : 'flex flex-wrap items-center gap-3'}>
      <span className="text-sm font-semibold text-slate-700">{t('language.label')}</span>
      <div className="inline-flex rounded-full bg-[var(--surface_container)] p-1 ghost-border">
        {SUPPORTED_LOCALES.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setLocale(option)}
            className={`rounded-full px-3 py-1 text-sm transition ${
              locale === option
                ? 'primary-gradient text-[var(--on_primary)]'
                : 'text-[var(--on_surface)] opacity-70 hover:bg-[var(--surface_container_low)]'
            }`}
          >
            {getLocaleLabel(option as Locale)}
          </button>
        ))}
      </div>
    </div>
  )
}

