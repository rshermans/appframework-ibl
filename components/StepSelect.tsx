'use client'

import { useWizardStore } from '@/store/wizardStore'
import { useI18n } from '@/components/I18nProvider'

export default function StepSelect() {
  const { t } = useI18n()
  const { rqCandidates, selectedRQs, toggleRQ, setWorkflowStep } = useWizardStore()

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">{t('steps.step1Select.title')}</h2>

      <div className="space-y-3">
        {rqCandidates.map((rq, i) => (
          <div
            key={i}
            className={`cursor-pointer rounded border p-3 transition ${
              selectedRQs.includes(rq)
                ? 'border-emerald-500 bg-emerald-600 text-white shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-400'
            }`}
            onClick={() => toggleRQ(rq)}
          >
            <div className="flex items-start justify-between gap-3">
              <span>{rq}</span>
              {selectedRQs.includes(rq) && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
                  OK
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        disabled={selectedRQs.length < 2}
        onClick={() => setWorkflowStep('step1a_compare')}
        className="mt-6 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
      >
        {t('steps.step1Select.continueButton')}
      </button>
    </div>
  )
}
