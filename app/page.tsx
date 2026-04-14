'use client'

import { useWizardStore } from '@/store/wizardStore'
import Stage1Research from '@/components/Stage1Research'
import Stage2Multimodal from '@/components/Stage2Multimodal'
import LocaleSwitcher from '@/components/LocaleSwitcher'
import ArqusBrand from '@/components/ArqusBrand'
import { useI18n } from '@/components/I18nProvider'
import { useState, useEffect } from 'react'

export default function Home() {
  const { projectId, stage, setProject } = useWizardStore()
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
      <main className="flex min-h-screen items-center justify-center p-4 md:p-8">
        <div className="glass-panel w-full max-w-3xl p-1">
          <div className="bg-[var(--surface_container_lowest)] p-6 md:p-10">
            <div className="mb-6 flex items-start justify-between gap-4">
              <ArqusBrand compact />
              <LocaleSwitcher compact />
            </div>

            <div className="mb-8 grid gap-6 md:grid-cols-[1.15fr_0.85fr]">
              <div>
                <h1 className="font-display text-4xl font-semibold text-[var(--on_surface)] md:text-5xl">
                  {t('home.title')}
                </h1>
                <p className="mt-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {t('home.subtitle')}
                </p>
                <p className="mt-5 max-w-xl text-sm leading-7 text-slate-700">{t('home.intro')}</p>
              </div>
              <div className="bg-[var(--surface_container_low)] p-5">
                <p className="font-label text-xs uppercase tracking-[0.12em] text-slate-500">IBL Context</p>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  Stage 1 is now standardized with ethical guidance and transparent research decision points.
                </p>
              </div>
            </div>

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
                  className="w-full bg-[var(--surface_container)] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--secondary)]"
                  onKeyPress={(e) => e.key === 'Enter' && handleStart()}
                />
              </div>

              <button
                onClick={handleStart}
                disabled={!topic.trim()}
                className="primary-gradient w-full rounded-md px-4 py-3 font-semibold text-white transition disabled:opacity-50"
              >
                {t('home.startButton')}
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-7xl p-6 md:p-8">
        {stage === 2 ? <Stage2Multimodal /> : <Stage1Research />}
      </div>
    </main>
  )
}
