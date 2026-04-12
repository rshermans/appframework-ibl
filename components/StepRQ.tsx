'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import { useI18n } from '@/components/I18nProvider'

export default function StepRQ() {
  const { t } = useI18n()
  const [topic, setTopic] = useState('')
  const { setCandidates, setStep } = useWizardStore()

  const generateMock = () => {
    const mock = [
      `How does ${topic} influence biological systems?`,
      `What mechanisms explain ${topic}?`,
      `What are the effects of ${topic} in real-world contexts?`,
      `How can ${topic} be optimized or improved?`,
    ]

    setCandidates(mock)
    setStep(1)
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">{t('steps.step0.title')}</h2>

      <input
        className="mb-4 w-full rounded border p-2"
        placeholder={t('steps.step0.topicPlaceholder')}
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
      />

      <button onClick={generateMock} className="rounded bg-black px-4 py-2 text-white">
        {t('steps.step0.generate')}
      </button>
    </div>
  )
}

