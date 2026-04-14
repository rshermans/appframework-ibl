'use client'

import { useWizardStore } from '@/store/wizardStore'
import Stage1Research from './Stage1Research'
import Stage2Multimodal from './Stage2Multimodal'
import Stage3Reflection from './reflection/Stage3Reflection'

export default function Wizard() {
  const { stage } = useWizardStore()

  return (
    <div className="mt-6">
      {stage === 1 && <Stage1Research />}
      {stage === 2 && <Stage2Multimodal />}
      {stage === 3 && <Stage3Reflection />}
    </div>
  )
}
