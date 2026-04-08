'use client'

import { useWizardStore } from '@/store/wizardStore'

export default function StepSelect() {
  const { rqCandidates, selectedRQs, toggleRQ, setWorkflowStep } = useWizardStore()

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Step 1 - Select up to 3 Questions</h2>

      <div className="space-y-3">
        {rqCandidates.map((rq, i) => (
          <div
            key={i}
            className={`cursor-pointer rounded border p-3 ${
              selectedRQs.includes(rq) ? 'bg-black text-white' : ''
            }`}
            onClick={() => toggleRQ(rq)}
          >
            {rq}
          </div>
        ))}
      </div>

      <button
        disabled={selectedRQs.length < 2}
        onClick={() => setWorkflowStep('step1a_compare')}
        className="mt-6 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
      >
        Continue
      </button>
    </div>
  )
}
