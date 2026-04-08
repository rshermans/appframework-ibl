'use client'

import { useWizardStore } from '@/store/wizardStore'
import StepRQ from './StepRQ'
import StepSelect from './StepSelect'
import Step1A from './Step1A'

export default function Wizard() {
  const { step } = useWizardStore()

  return (
    <div className="mt-6">
      {step === 0 && <StepRQ />}
      {step === 1 && <StepSelect />}
      {step === 2 && <Step1A />}
    </div>
  )
}