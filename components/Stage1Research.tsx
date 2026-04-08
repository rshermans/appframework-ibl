'use client'

import { useWizardStore } from '@/store/wizardStore'
import { STAGES } from '@/types/wizard'
import Step0 from './steps/Step0'

export default function Stage1Research() {
  const { stage, step, setStep } = useWizardStore()

  if (stage !== 1) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Stage 1: Ask & Research</h2>
        <p className="text-gray-600">
          Develop rigorous research questions and find scientific evidence
        </p>
      </div>

      {/* Step Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {STAGES[1].steps.map((s) => (
          <button
            key={s.id}
            onClick={() => setStep(s.id)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${
              step === s.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {s.stageName || s.label}
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {step === 'step0' && <Step0 />}
        {/* Other steps will be added here */}
      </div>
    </div>
  )
}
