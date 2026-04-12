'use client'

import { useI18n } from '@/components/I18nProvider'

export default function Copilot() {
  const { t } = useI18n()

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">{t('copilot.title')}</h2>

      <p className="text-gray-600">{t('copilot.body')}</p>
    </div>
  )
}

