'use client'

import { useWizardStore } from '@/store/wizardStore'
import Stage1Research from '@/components/Stage1Research'
import LocaleSwitcher from '@/components/LocaleSwitcher'
import { useI18n } from '@/components/I18nProvider'
import { useState, useEffect } from 'react'

export default function Home() {
  const { projectId, setProject } = useWizardStore()
  const { t } = useI18n()
  const [topic, setTopic] = useState('')
  const [isStarted, setIsStarted] = useState(false)

  useEffect(() => {
    // Create project on mount if needed
    if (!projectId) {
      setProject(Math.random().toString(36), topic)
    }
  }, [])

  const handleStart = () => {
    if (topic.trim()) {
      setProject(Math.random().toString(36), topic)
      setIsStarted(true)
    }
  }

  if (!isStarted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-amber-50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200/70">
          <div className="mb-6 flex justify-end">
            <LocaleSwitcher compact />
          </div>
          <h1 className="mb-2 text-center text-3xl font-bold text-slate-900">{t('home.title')}</h1>
          <p className="mb-6 text-center text-sm text-slate-600">{t('home.subtitle')}</p>
          <p className="mb-6 text-center text-sm leading-6 text-slate-600">{t('home.intro')}</p>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                {t('home.topicLabel')}
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t('home.topicPlaceholder')}
                className="w-full rounded-xl border-2 border-slate-300 px-4 py-3 focus:border-slate-900 focus:outline-none"
                onKeyPress={(e) => e.key === 'Enter' && handleStart()}
              />
            </div>

            <button
              onClick={handleStart}
              disabled={!topic.trim()}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {t('home.startButton')}
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl p-6">
        <Stage1Research />
      </div>
    </main>
  )
}
