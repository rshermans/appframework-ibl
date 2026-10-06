'use client'

import { useI18n } from '@/components/I18nProvider'
import type { UserProfile } from '@/types/wizard'

const EDUCATION_LABELS: Record<string, Record<string, string>> = {
  'pt-PT': { basic: 'Ensino básico/secundário', undergraduate: 'Licenciatura', master: 'Mestrado', doctorate: 'Doutoramento' },
  en: { basic: 'School (K-12)', undergraduate: 'Undergraduate', master: 'Master', doctorate: 'Doctorate' },
}
const EXPERIENCE_LABELS: Record<string, Record<string, string>> = {
  'pt-PT': { beginner: 'Iniciante', intermediate: 'Intermédia', advanced: 'Avançada' },
  en: { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' },
}

interface ProfileCardProps {
  userProfile: UserProfile | null
  onEdit: () => void
}

export default function ProfileCard({ userProfile, onEdit }: ProfileCardProps) {
  const { locale, t } = useI18n()
  const friendlyLabel = (map: Record<string, Record<string, string>>, value: string) =>
    map[locale]?.[value] ?? map['pt-PT']?.[value] ?? value

  return (
    <section className="mt-4 rounded-[var(--radius-md)] bg-[var(--surface_container_low)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.08em] text-[var(--on_surface)]">
          {t('home.profileCard.title')}
        </h2>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-[var(--radius-sm)] bg-[var(--surface_container)] px-3 py-2 text-xs font-semibold text-[var(--on_surface)] hover:bg-[var(--surface_container_high)]"
        >
          {t('home.profileCard.edit')}
        </button>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-[var(--on_surface)] md:grid-cols-2">
        <p><span className="font-semibold">{t('home.profileCard.education')}:</span> {userProfile?.educationLevel ? friendlyLabel(EDUCATION_LABELS, userProfile.educationLevel) : t('home.profileCard.empty')}</p>
        <p><span className="font-semibold">{t('home.profileCard.experience')}:</span> {userProfile?.researchExperience ? friendlyLabel(EXPERIENCE_LABELS, userProfile.researchExperience) : t('home.profileCard.empty')}</p>
        <p><span className="font-semibold">{t('home.profileCard.domain')}:</span> {userProfile?.domain || t('home.profileCard.empty')}</p>
        <p><span className="font-semibold">{t('home.profileCard.role')}:</span> {userProfile?.role || t('home.profileCard.empty')}</p>
      </div>
    </section>
  )
}
