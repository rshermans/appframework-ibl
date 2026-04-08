'use client'

import { useWizardStore } from '@/store/wizardStore'

export default function Step1B() {
  const { rqAnalysis } = useWizardStore()

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        Step 1B — Analysis Result
      </h2>

      <div className="p-4 border rounded bg-gray-50 whitespace-pre-wrap">
        {rqAnalysis}
      </div>
    </div>
  )
}