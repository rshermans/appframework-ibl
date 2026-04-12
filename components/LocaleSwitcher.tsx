'use client'

import { SUPPORTED_LOCALES, getLocaleLabel, type Locale } from '@/lib/i18n'
import { useI18n } from '@/components/I18nProvider'

export default function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n()

  return (
    <div className={compact ? 'flex items-center gap-2' : 'flex flex-wrap items-center gap-3'}>
      <span className="text-sm font-semibold text-slate-700">{t('language.label')}</span>
      <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
        {SUPPORTED_LOCALES.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setLocale(option)}
            className={`rounded-full px-3 py-1 text-sm transition ${
              locale === option
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {getLocaleLabel(option as Locale)}
          </button>
        ))}
      </div>
    </div>
  )
}

