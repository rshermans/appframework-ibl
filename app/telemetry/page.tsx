import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { getMessage, type Locale } from '@/lib/i18n'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

type PeriodFilter = 'all' | '7d' | '30d' | '90d'

type PageProps = {
  searchParams?: {
    period?: string | string[]
    stage?: string | string[]
    eventType?: string | string[]
  }
}

function detectServerLocale(): Locale {
  const acceptLanguage = headers().get('accept-language') || ''
  return acceptLanguage.toLowerCase().startsWith('en') ? 'en' : 'pt-PT'
}

function getSingleValue(value?: string | string[]): string {
  if (Array.isArray(value)) return value[0] || ''
  return value || ''
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((acc, value) => acc + value, 0) / values.length
}

function parseBloomLevel(value: unknown): number | null {
  if (typeof value === 'number' && value >= 1 && value <= 6) {
    return value
  }

  const normalized = String(value || '').toLowerCase()
  const map: Record<string, number> = {
    remembering: 1,
    understanding: 2,
    applying: 3,
    analyzing: 4,
    evaluating: 5,
    creating: 6,
  }

  if (map[normalized]) return map[normalized]

  const digit = normalized.match(/([1-6])/)
  return digit ? Number(digit[1]) : null
}

function isWithinPeriod(date: Date, period: PeriodFilter): boolean {
  if (period === 'all') return true
  const now = Date.now()
  const diffMs = now - date.getTime()
  const maxDays = period === '7d' ? 7 : period === '30d' ? 30 : 90
  return diffMs <= maxDays * 24 * 60 * 60 * 1000
}

function buildPeriodStart(period: PeriodFilter): Date | null {
  if (period === 'all') return null
  const now = Date.now()
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  return new Date(now - days * 24 * 60 * 60 * 1000)
}

export default async function TelemetryDashboardPage({ searchParams }: PageProps) {
  const locale = detectServerLocale()
  const t = (key: string, variables?: Record<string, string | number>) =>
    getMessage(locale, key, variables)

  const selectedPeriodRaw = getSingleValue(searchParams?.period)
  const selectedStage = getSingleValue(searchParams?.stage) || 'all'
  const selectedEventType = getSingleValue(searchParams?.eventType) || 'all'
  const selectedPeriod: PeriodFilter =
    selectedPeriodRaw === '7d' || selectedPeriodRaw === '30d' || selectedPeriodRaw === '90d'
      ? selectedPeriodRaw
      : 'all'
  const selectedStageNumber = Number(selectedStage)

  const session = await auth()
  if (!session?.user) {
    // Only logged in users or special access? We omit redirection for local dev debug
  }

  const baseWhere: Prisma.ProjectInteractionWhereInput = {
    ...(buildPeriodStart(selectedPeriod)
      ? { createdAt: { gte: buildPeriodStart(selectedPeriod) as Date } }
      : {}),
    ...(selectedStage !== 'all' && Number.isFinite(selectedStageNumber)
      ? { stage: selectedStageNumber }
      : {}),
  }

  const matchedByDbFilters = await prisma.projectInteraction.count({ where: baseWhere })

  const interactions = await prisma.projectInteraction.findMany({
    where: baseWhere,
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: {
      id: true,
      stepId: true,
      stage: true,
      cognitiveFeatures: true,
      affectiveFeatures: true,
      learningMetrics: true,
      metadata: true,
      createdAt: true,
      sessionId: true,
      processedAt: true,
    },
  })

  const eventTypeOptions = Array.from(
    new Set(
      interactions
        .map((interaction) => {
          const metadata = interaction.metadata as Record<string, unknown> | null
          return String(metadata?.eventType || '').trim()
        })
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b))

  const stageOptions = Array.from(new Set(interactions.map((interaction) => String(interaction.stage)))).sort()

  const filteredInteractions = interactions.filter((interaction) => {
    if (selectedEventType !== 'all') {
      const metadata = interaction.metadata as Record<string, unknown> | null
      const eventType = String(metadata?.eventType || '')
      if (eventType !== selectedEventType) return false
    }

    return true
  })

  const totalEvents = filteredInteractions.length
  const enrichedEvents = filteredInteractions.filter(
    (interaction) => Boolean(interaction.cognitiveFeatures) || Boolean(interaction.affectiveFeatures)
  ).length
  const processingQueue = filteredInteractions.filter((interaction) => !interaction.processedAt).length

  const allCognitive = filteredInteractions
    .map((interaction) => interaction.cognitiveFeatures as Record<string, unknown> | null)
    .filter((item): item is Record<string, unknown> => Boolean(item))
  const allAffective = filteredInteractions
    .map((interaction) => interaction.affectiveFeatures as Record<string, unknown> | null)
    .filter((item): item is Record<string, unknown> => Boolean(item))

  const bloomLevels = allCognitive
    .map((item) => parseBloomLevel(item?.bloom_level))
    .filter((item): item is number => item !== null)
  const avgBloomLevel = average(bloomLevels)

  const confidenceValues = allAffective
    .map((item) => Number(item?.confidence))
    .filter((item) => Number.isFinite(item))
  const frustrationValues = allAffective
    .map((item) => Number(item?.frustration_index))
    .filter((item) => Number.isFinite(item))

  const avgConfidence = average(confidenceValues)
  const avgFrustration = average(frustrationValues)

  const sentimentCounts = allAffective.reduce<Record<string, number>>((acc, item) => {
    const sentiment = String(item?.sentiment || 'neutral').toLowerCase()
    const current = acc[sentiment] ?? 0
    acc[sentiment] = current + 1
    return acc
  }, {})

  const stepCounts = filteredInteractions.reduce<Record<string, number>>((acc, interaction) => {
    const current = acc[interaction.stepId] ?? 0
    acc[interaction.stepId] = current + 1
    return acc
  }, {})

  const topSteps = Object.entries(stepCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  const onboarding = filteredInteractions.reduce(
    (acc, interaction) => {
      const metadata = interaction.metadata as Record<string, unknown> | null
      const eventType = String(metadata?.eventType || '')
      if (eventType === 'onboarding_viewed') acc.viewed += 1
      if (eventType === 'onboarding_completed') acc.completed += 1
      if (eventType === 'onboarding_skipped') acc.skipped += 1
      if (eventType === 'profile_edited') acc.edited += 1
      return acc
    },
    { viewed: 0, completed: 0, skipped: 0, edited: 0 }
  )

  const completionRate = onboarding.viewed > 0
    ? Math.round((onboarding.completed / onboarding.viewed) * 100)
    : 0

  const enrichedCoverage = totalEvents > 0 ? Math.round((enrichedEvents / totalEvents) * 100) : 0

  const enrichedRows = filteredInteractions.filter(
    (interaction) => Boolean(interaction.cognitiveFeatures) || Boolean(interaction.affectiveFeatures)
  )

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-body">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">{t('telemetry.title')}</h1>
              <p className="mt-1 text-slate-500">{t('telemetry.subtitle')}</p>
            </div>
            <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-700">
              {t('telemetry.windowLabel', { count: totalEvents })}
            </span>
          </div>

          <form method="get" className="mt-5 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-4">
            <div>
              <label htmlFor="period" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                {t('telemetry.filters.period')}
              </label>
              <select id="period" name="period" defaultValue={selectedPeriod} className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm">
                <option value="all">{t('telemetry.filters.allPeriods')}</option>
                <option value="7d">{t('telemetry.filters.last7d')}</option>
                <option value="30d">{t('telemetry.filters.last30d')}</option>
                <option value="90d">{t('telemetry.filters.last90d')}</option>
              </select>
            </div>

            <div>
              <label htmlFor="stage" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                {t('telemetry.filters.stage')}
              </label>
              <select id="stage" name="stage" defaultValue={selectedStage} className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm">
                <option value="all">{t('telemetry.filters.allStages')}</option>
                {stageOptions.map((stage) => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="eventType" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                {t('telemetry.filters.eventType')}
              </label>
              <select id="eventType" name="eventType" defaultValue={selectedEventType} className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm">
                <option value="all">{t('telemetry.filters.allEventTypes')}</option>
                {eventTypeOptions.map((eventType) => (
                  <option key={eventType} value={eventType}>{eventType}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button type="submit" className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                {t('telemetry.filters.apply')}
              </button>
              <a href="/telemetry" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                {t('telemetry.filters.reset')}
              </a>
            </div>
          </form>

          <p className="mt-3 text-xs text-slate-500">
            {t('telemetry.filters.showing', { shown: totalEvents, total: interactions.length })}
            {' '}
            {t('telemetry.filters.sampledFrom', { total: matchedByDbFilters })}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <a href="/telemetry?period=7d" className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100">
              {t('telemetry.presets.last7d')}
            </a>
            <a href="/telemetry?period=30d&eventType=onboarding_completed" className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100">
              {t('telemetry.presets.onboardingCompletion')}
            </a>
            <a href="/telemetry?period=30d&eventType=profile_edited" className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100">
              {t('telemetry.presets.profileEdits')}
            </a>
            <a href="/telemetry?period=30d&stage=2" className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100">
              {t('telemetry.presets.stage2')}
            </a>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-xl bg-blue-50 px-4 py-3 text-center">
              <div className="text-2xl font-bold text-blue-700">{totalEvents}</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-900/70">{t('telemetry.kpi.totalEvents')}</div>
            </div>

            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center">
              <div className="text-2xl font-bold text-emerald-700">{enrichedCoverage}%</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-900/70">{t('telemetry.kpi.enrichedCoverage')}</div>
            </div>

            <div className="rounded-xl bg-violet-50 px-4 py-3 text-center">
              <div className="text-2xl font-bold text-violet-700">{avgBloomLevel.toFixed(1)}</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-violet-900/70">{t('telemetry.kpi.avgBloom')}</div>
            </div>

            <div className="rounded-xl bg-cyan-50 px-4 py-3 text-center">
              <div className="text-2xl font-bold text-cyan-700">{avgConfidence.toFixed(2)}</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-cyan-900/70">{t('telemetry.kpi.avgConfidence')}</div>
            </div>

            <div className="rounded-xl bg-rose-50 px-4 py-3 text-center">
              <div className="text-2xl font-bold text-rose-700">{avgFrustration.toFixed(2)}</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-rose-900/70">{t('telemetry.kpi.avgFrustration')}</div>
            </div>

            <div className="rounded-xl bg-amber-50 px-4 py-3 text-center">
              <div className="text-2xl font-bold text-amber-700">{processingQueue}</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-900/70">{t('telemetry.kpi.processingQueue')}</div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">{t('telemetry.onboarding.title')}</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xl font-bold text-slate-800">{onboarding.viewed}</div>
                <div className="text-xs text-slate-600">{t('telemetry.onboarding.viewed')}</div>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3">
                <div className="text-xl font-bold text-emerald-700">{onboarding.completed}</div>
                <div className="text-xs text-emerald-800/80">{t('telemetry.onboarding.completed')}</div>
              </div>
              <div className="rounded-lg bg-amber-50 p-3">
                <div className="text-xl font-bold text-amber-700">{onboarding.skipped}</div>
                <div className="text-xs text-amber-800/80">{t('telemetry.onboarding.skipped')}</div>
              </div>
              <div className="rounded-lg bg-indigo-50 p-3">
                <div className="text-xl font-bold text-indigo-700">{onboarding.edited}</div>
                <div className="text-xs text-indigo-800/80">{t('telemetry.onboarding.edited')}</div>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              {t('telemetry.onboarding.completionRate')}: <strong>{completionRate}%</strong>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">{t('telemetry.sentiment.title')}</h2>
            <div className="space-y-3">
              {Object.entries(sentimentCounts).map(([sentiment, count]) => {
                const pct = Math.round((count / (allAffective.length || 1)) * 100)
                return (
                  <div key={sentiment} className="relative pt-1">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase text-slate-700">{sentiment}</span>
                      <span className="text-xs font-semibold text-slate-600">{pct}%</span>
                    </div>
                    <div className="mb-4 flex h-2 overflow-hidden rounded bg-slate-200 text-xs">
                      <div
                        style={{ width: `${pct}%` }}
                        className="flex flex-col justify-center whitespace-nowrap rounded-full bg-slate-600 text-center text-white shadow-none transition-all duration-500"
                      />
                    </div>
                  </div>
                )
              })}
              {allAffective.length === 0 && <p className="italic text-slate-400">{t('telemetry.sentiment.empty')}</p>}
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">{t('telemetry.topSteps.title')}</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {topSteps.map(([stepId, count]) => (
              <div key={stepId} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">{t('telemetry.topSteps.step')}</div>
                <div className="mt-1 font-semibold text-slate-800">{stepId}</div>
                <div className="mt-2 text-sm text-slate-600">{t('telemetry.topSteps.events')}: <strong>{count}</strong></div>
              </div>
            ))}
            {topSteps.length === 0 && (
              <p className="text-sm italic text-slate-400">{t('telemetry.topSteps.empty')}</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 border-b border-slate-100 pb-4 text-lg font-semibold text-slate-900">{t('telemetry.recent.title')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500">
                  <th className="rounded-tl-xl p-3 font-medium">{t('telemetry.recent.sessionId')}</th>
                  <th className="p-3 font-medium">{t('telemetry.recent.step')}</th>
                  <th className="p-3 font-medium">{t('telemetry.recent.timestamp')}</th>
                  <th className="p-3 font-medium">{t('telemetry.recent.bloom')}</th>
                  <th className="p-3 font-medium">{t('telemetry.recent.sentiment')}</th>
                  <th className="rounded-tr-xl p-3 font-medium">{t('telemetry.recent.eventType')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enrichedRows.map((interaction) => {
                  const cognitive = interaction.cognitiveFeatures as Record<string, unknown> | null
                  const affective = interaction.affectiveFeatures as Record<string, unknown> | null
                  const metadata = interaction.metadata as Record<string, unknown> | null

                  return (
                    <tr key={interaction.id} className="transition-colors hover:bg-slate-50/50">
                      <td className="p-3 font-mono text-xs text-slate-600">{interaction.sessionId?.substring(0, 8) || 'N/A'}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center rounded-md border border-blue-100/50 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                          {interaction.stepId}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">
                        {new Date(interaction.createdAt).toLocaleString(locale, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-3 text-xs text-slate-600">{String(cognitive?.bloom_level || 'N/A')}</td>
                      <td className="p-3 text-xs text-slate-600">{String(affective?.sentiment || 'N/A')}</td>
                      <td className="p-3 text-xs text-slate-600">{String(metadata?.eventType || '-')}</td>
                    </tr>
                  )
                })}

                {enrichedRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-sm italic text-slate-400">{t('telemetry.recent.empty')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">{t('telemetry.kpiGuide.title')}</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            <li>{t('telemetry.kpiGuide.item1')}</li>
            <li>{t('telemetry.kpiGuide.item2')}</li>
            <li>{t('telemetry.kpiGuide.item3')}</li>
            <li>{t('telemetry.kpiGuide.item4')}</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
