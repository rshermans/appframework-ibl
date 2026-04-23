"use client"

import Link from 'next/link'
import { useEffect } from 'react'
import { useI18n } from '@/components/I18nProvider'
import { useWizardStore } from '@/store/wizardStore'
import { persistInteractionEvent } from '@/lib/interactionClient'

export default function ManualPage() {
  const { t, locale } = useI18n()
  const { projectId, sessionId, topic } = useWizardStore()

  useEffect(() => {
    const eventProjectId = projectId || sessionId
    if (!eventProjectId) return

    void persistInteractionEvent({
      projectId: eventProjectId,
      stage: 0,
      stepId: 'manual',
      stepLabel: 'Manual Page',
      userInput: 'manual_opened',
      aiOutput: 'manual_page_opened',
      mode: 'telemetry',
      locale,
      topic,
      metadata: {
        eventType: 'manual_opened',
      },
    })
  }, [projectId, sessionId, locale, topic])

  return (
    <main className="mx-auto max-w-4xl p-6 md:p-10">
      <article className="space-y-6 rounded-[var(--radius-md)] bg-[var(--surface_container_low)] p-6 md:p-8">
        <div className="flex justify-end">
          <Link
            href="/"
            className="rounded-[var(--radius-sm)] bg-[var(--surface_container)] px-3 py-1.5 text-xs font-semibold text-[var(--on_surface)] hover:bg-[var(--surface_container_high)]"
          >
            {t('manual.backButton')}
          </Link>
        </div>

        <header className="space-y-2">
          <h1 className="font-display text-3xl font-semibold text-[var(--on_surface)]">
            {t('manual.title')}
          </h1>
          <p className="text-sm text-[var(--on_surface)] opacity-80">{t('manual.updatedAt')}</p>
          <p className="text-sm leading-7 text-[var(--on_surface)]">{t('manual.intro')}</p>
        </header>

        <section className="space-y-2 text-sm leading-7 text-[var(--on_surface)]">
          <h2 className="text-base font-semibold">{t('manual.overviewTitle')}</h2>
          <p>{t('manual.overviewBody')}</p>
        </section>

        <section className="space-y-2 text-sm leading-7 text-[var(--on_surface)]">
          <h2 className="text-base font-semibold">{t('manual.stage1Title')}</h2>
          <p>{t('manual.stage1Body')}</p>
        </section>

        <section className="space-y-2 text-sm leading-7 text-[var(--on_surface)]">
          <h2 className="text-base font-semibold">{t('manual.stage2Title')}</h2>
          <p>{t('manual.stage2Body')}</p>
        </section>

        <section className="space-y-2 text-sm leading-7 text-[var(--on_surface)]">
          <h2 className="text-base font-semibold">{t('manual.stage3Title')}</h2>
          <p>{t('manual.stage3Body')}</p>
        </section>

        <section className="space-y-2 text-sm leading-7 text-[var(--on_surface)]">
          <h2 className="text-base font-semibold">{t('manual.artifactsTitle')}</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>{t('manual.artifactsStage1')}</li>
            <li>{t('manual.artifactsStage2')}</li>
            <li>{t('manual.artifactsStage3')}</li>
          </ul>
        </section>

        <section className="space-y-2 text-sm leading-7 text-[var(--on_surface)]">
          <h2 className="text-base font-semibold">{t('manual.mistakesTitle')}</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>{t('manual.mistake1')}</li>
            <li>{t('manual.mistake2')}</li>
            <li>{t('manual.mistake3')}</li>
          </ul>
        </section>

        <section className="space-y-2 text-sm leading-7 text-[var(--on_surface)]">
          <h2 className="text-base font-semibold">{t('manual.privacyTitle')}</h2>
          <p>
            {t('manual.privacyBody')}{' '}
            <Link href="/privacy" className="font-semibold underline">
              {locale === 'pt-PT' ? 'Política de privacidade' : 'Privacy policy'}
            </Link>
            .
          </p>
        </section>
      </article>
    </main>
  )
}
