'use client'

import { useWizardStore } from '@/store/wizardStore'
import { useI18n } from '@/components/I18nProvider'
import StepHeader from '@/components/StepHeader'

export default function StepSelect() {
  const { t } = useI18n()
  const { rqCandidates, selectedRQs, toggleRQ, setWorkflowStep } = useWizardStore()

  return (
    <div>
      <div className="mb-4">
        <StepHeader stepId="step1_select" title={t('steps.step1Select.title')} />
      </div>

      <div className="space-y-4">
        {rqCandidates.map((rq, i) => (
          <div
            key={i}
            className={`cursor-pointer p-4 transition-all duration-200 ${
              selectedRQs.includes(rq)
                ? 'ai-user-decided rq-active-accent ambient-shadow'
                : 'tonal-card ghost-border hover:bg-[var(--surface_container_low)]'
            }`}
            onClick={() => toggleRQ(rq)}
          >
            <div className="flex items-start justify-between gap-3">
              <span className={selectedRQs.includes(rq) ? 'text-[var(--on_primary)]' : ''}>{rq}</span>
              {selectedRQs.includes(rq) && (
                <span className="rounded-[var(--radius-md)] bg-white/20 px-2 py-0.5 text-xs font-semibold">
                  ✓
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        disabled={selectedRQs.length < 2}
        onClick={() => setWorkflowStep('step1a_compare')}
        title={selectedRQs.length < 2 ? (t('steps.step1A.invalidSelection')) : ''}
        className="primary-gradient mt-6 rounded-[var(--radius-md)] px-4 py-2 text-[var(--on_primary)] font-semibold transition hover:brightness-110 disabled:opacity-40"
      >
        {t('steps.step1Select.continueButton')}
      </button>
    </div>
  )
}
