'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'

export default function StepRQ() {
  const [topic, setTopic] = useState('')
  const { setCandidates, setStep } = useWizardStore()

  const generateMock = () => {
    const mock = [
      `How does ${topic} influence biological systems?`,
      `What mechanisms explain ${topic}?`,
      `What are the effects of ${topic} in real-world contexts?`,
      `How can ${topic} be optimized or improved?`
    ]

    setCandidates(mock)
    setStep(1)
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        Step 0 — Generate Research Questions
      </h2>

      <input
        className="border p-2 w-full mb-4"
        placeholder="Enter your topic..."
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
      />

      <button
        onClick={generateMock}
        className="bg-black text-white px-4 py-2 rounded"
      >
        Generate Questions
      </button>
    </div>
  )
}