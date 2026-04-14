"use client"

import type { IBLStepKey } from '@/lib/iblFramework'
import { getIblEthicalTip, getIblStepMeta } from '@/lib/iblFramework'
import EthicalTip from '@/components/EthicalTip'
import InfoTooltip from '@/components/InfoTooltip'
import { useI18n } from '@/components/I18nProvider'

interface StepHeaderProps {
  stepId: IBLStepKey
  title: string
  subtitle?: string
}

export default function StepHeader({ stepId, title, subtitle }: StepHeaderProps) {
  const { t } = useI18n()
  const meta = getIblStepMeta(stepId)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="primary-gradient rounded-[var(--radius-md)] px-3 py-1 text-xs font-semibold tracking-wide text-[var(--on_primary)]">
          {meta.badge}
        </span>
        <InfoTooltip label={title} description={meta.title} />
      </div>
      {subtitle && <p className="max-w-3xl text-sm leading-7 text-[var(--on_surface)] opacity-70">{subtitle}</p>}
      <EthicalTip title={t('common.ethicalTip')} tip={getIblEthicalTip(stepId)} />
    </div>
  )
}
