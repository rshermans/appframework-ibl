'use client'

import { useWizardStore } from '@/store/wizardStore'

export default function StepSelect() {
  const {
    rqCandidates,
    selectedRQs,
    toggleRQ,
    setStep
  } = useWizardStore()

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        Step 1 — Select up to 3 Questions
      </h2>

      <div className="space-y-3">
        {rqCandidates.map((rq, i) => (
          <div
            key={i}
            className={`p-3 border rounded cursor-pointer ${
              selectedRQs.includes(rq)
                ? 'bg-black text-white'
                : ''
            }`}
            onClick={() => toggleRQ(rq)}
          >
            {rq}
          </div>
        ))}
      </div>

      <button
        disabled={selectedRQs.length < 2}
        onClick={() => setStep(2)}
        className="mt-6 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-40"
      >
        Continue
      </button>
    </div>
  )
}
