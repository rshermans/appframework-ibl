'use client'

import type { Dispatch, SetStateAction } from 'react'
import { useI18n } from '@/components/I18nProvider'

export interface OnboardingFormData {
  educationLevel: string
  researchExperience: string
  domain: string
  role: string
}

interface OnboardingModalProps {
  data: OnboardingFormData
  onChange: Dispatch<SetStateAction<OnboardingFormData>>
  isEditing: boolean
  onSkip: () => void
  onContinue: () => void
}

export default function OnboardingModal({ data, onChange, isEditing, onSkip, onContinue }: OnboardingModalProps) {
  const { t } = useI18n()
  const title = isEditing ? t('home.onboarding.titleEdit') : t('home.onboarding.title')
  const description = isEditing ? t('home.onboarding.descriptionEdit') : t('home.onboarding.description')

  return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div className="w-full max-w-xl rounded-[var(--radius-md)] border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl md:p-6">
      <h2 className="font-display text-xl font-semibold text-slate-900">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        {description}
      </p>

      <ul className="mt-4 space-y-2 rounded-[var(--radius-sm)] bg-slate-50 p-3 text-xs leading-6 text-slate-700">
        <li>{t('home.onboarding.benefit1')}</li>
        <li>{t('home.onboarding.benefit2')}</li>
        <li>{t('home.onboarding.benefit3')}</li>
      </ul>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-800">
          {t('home.onboarding.educationLabel')}
          <select
            value={data.educationLevel}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, educationLevel: e.target.value }))
            }
            className="mt-1 w-full rounded-[var(--radius-sm)] border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">{t('home.onboarding.educationPlaceholder')}</option>
            <option value="basic">{t('home.onboarding.educationBasic')}</option>
            <option value="undergraduate">{t('home.onboarding.educationUndergraduate')}</option>
            <option value="master">{t('home.onboarding.educationMaster')}</option>
            <option value="doctorate">{t('home.onboarding.educationDoctorate')}</option>
          </select>
        </label>

        <label className="text-sm font-medium text-slate-800">
          {t('home.onboarding.experienceLabel')}
          <select
            value={data.researchExperience}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, researchExperience: e.target.value }))
            }
            className="mt-1 w-full rounded-[var(--radius-sm)] border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">{t('home.onboarding.experiencePlaceholder')}</option>
            <option value="beginner">{t('home.onboarding.experienceBeginner')}</option>
            <option value="intermediate">{t('home.onboarding.experienceIntermediate')}</option>
            <option value="advanced">{t('home.onboarding.experienceAdvanced')}</option>
          </select>
        </label>

        <label className="text-sm font-medium text-slate-800">
          {t('home.onboarding.domainLabel')}
          <input
            type="text"
            value={data.domain}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, domain: e.target.value }))
            }
            placeholder={t('home.onboarding.domainPlaceholder')}
            className="mt-1 w-full rounded-[var(--radius-sm)] border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="text-sm font-medium text-slate-800">
          {t('home.onboarding.roleLabel')}
          <input
            type="text"
            value={data.role}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, role: e.target.value }))
            }
            placeholder={t('home.onboarding.rolePlaceholder')}
            className="mt-1 w-full rounded-[var(--radius-sm)] border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <p className="mt-4 text-xs leading-6 text-slate-600">
        {t('home.onboarding.optionalNote')}
      </p>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onSkip}
          className="rounded-[var(--radius-sm)] border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          {isEditing ? t('home.deleteModal.cancel') : t('home.onboarding.skip')}
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="rounded-[var(--radius-sm)] bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-[var(--on_primary)]"
        >
          {t('home.onboarding.continue')}
        </button>
      </div>
    </div>
  </div>

  )
}
