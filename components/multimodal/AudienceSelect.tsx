'use client'

import { useWizardStore } from '@/store/wizardStore'
import { useI18n } from '@/components/I18nProvider'
import { AUDIENCES, AUDIENCE_LABELS, normalizeAudience } from '@/lib/audience'

/** One audience for the whole project: shared by every Stage 2 output and export. */
export default function AudienceSelect({ className = '' }: { className?: string }) {
  const { locale } = useI18n()
  const { audience, setAudience } = useWizardStore()
  const pt = locale === 'pt-PT'

  return (
    <label className={`inline-flex items-center gap-2 text-sm font-medium text-[var(--on_surface)] ${className}`}>
      {pt ? 'Audiência:' : 'Audience:'}
      <select
        value={audience}
        onChange={(event) => setAudience(normalizeAudience(event.target.value))}
        className="rounded-[var(--radius-sm)] border border-[var(--outline)] bg-[var(--surface)] px-3 py-1.5 text-sm font-normal text-[var(--on_surface)]"
      >
        {AUDIENCES.map((value) => (
          <option key={value} value={value}>
            {AUDIENCE_LABELS[value][pt ? 'pt' : 'en']}
          </option>
        ))}
      </select>
    </label>
  )
}
