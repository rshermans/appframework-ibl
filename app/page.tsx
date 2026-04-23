'use client'

import { useWizardStore } from '@/store/wizardStore'
import Stage1Research from '@/components/Stage1Research'
import Stage2Multimodal from '@/components/Stage2Multimodal'
import Stage3Reflection from '@/components/reflection/Stage3Reflection'
import LocaleSwitcher from '@/components/LocaleSwitcher'
import AppBrand from '@/components/AppBrand'
import AuthControls from '@/components/AuthControls'
import { useI18n } from '@/components/I18nProvider'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  clearSessionProjectCookie,
  generateProjectId,
  getSessionProjectCookie,
  setSessionProjectCookie,
} from '@/lib/sessionClient'
import { persistInteractionEvent } from '@/lib/interactionClient'

export default function Home() {
  const createEmptyOnboardingData = () => ({
    educationLevel: '',
    researchExperience: '',
    domain: '',
    role: '',
  })

  const {
    projectId,
    stage,
    topic: storeTopic,
    sessionId,
    userProfile,
    aiConsentAccepted,
    interactions,
    resetSession,
    setAiConsent,
    setProject,
    setUserProfile,
  } = useWizardStore()
  const { status } = useSession()
  const { t, locale } = useI18n()
  const pt = locale === 'pt-PT'
  const [topic, setTopic] = useState('')
  const [isStarted, setIsStarted] = useState(false)
  const [shareMessage, setShareMessage] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('')
  const [deletingServerData, setDeletingServerData] = useState(false)
  const [showOnboardingModal, setShowOnboardingModal] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [onboardingData, setOnboardingData] = useState(
    userProfile ?? createEmptyOnboardingData()
  )

  useEffect(() => {
    const cookieProjectId = getSessionProjectCookie()
    if (projectId && storeTopic) {
      setIsStarted(true)
      setTopic(storeTopic)
      return
    }

    if (cookieProjectId && storeTopic) {
      setProject(cookieProjectId, storeTopic)
      setIsStarted(true)
      setTopic(storeTopic)
      return
    }
  }, [projectId, setProject, storeTopic])

  useEffect(() => {
    if (status !== 'authenticated' || !projectId) {
      return
    }

    void fetch('/api/projects/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    }).catch(() => null)
  }, [projectId, status])

  const handleStart = () => {
    if (topic.trim()) {
      const nextProjectId = generateProjectId()
      setProject(nextProjectId, topic)
      setSessionProjectCookie(nextProjectId)
      if (!userProfile) {
        const nextOnboardingData = createEmptyOnboardingData()
        setIsEditingProfile(false)
        setOnboardingData(nextOnboardingData)
        trackOnboardingEvent('onboarding_viewed', nextOnboardingData, 'start', nextProjectId)
        setShowOnboardingModal(true)
        return
      }
      setIsStarted(true)
    }
  }

  const handleEditProfile = () => {
    const nextOnboardingData = {
      educationLevel: userProfile?.educationLevel ?? '',
      researchExperience: userProfile?.researchExperience ?? '',
      domain: userProfile?.domain ?? '',
      role: userProfile?.role ?? '',
    }
    setOnboardingData(nextOnboardingData)
    setIsEditingProfile(true)
    trackOnboardingEvent('onboarding_viewed', nextOnboardingData, 'edit')
    setShowOnboardingModal(true)
  }

  const handleOpenManual = () => {
    const eventProjectId = projectId || sessionId
    if (!eventProjectId) return

    void persistInteractionEvent({
      projectId: eventProjectId,
      stage: 0,
      stepId: 'manual',
      stepLabel: 'Manual Link',
      userInput: 'manual_opened',
      aiOutput: 'manual_link_clicked',
      mode: 'telemetry',
      locale,
      topic: topic || storeTopic,
      metadata: {
        eventType: 'manual_opened',
      },
    })
  }

  const buildOnboardingTelemetryMetadata = (
    formData = onboardingData,
    source: 'start' | 'edit' = isEditingProfile ? 'edit' : 'start'
  ) => {
    const domain = formData.domain.trim()
    const role = formData.role.trim()
    const filledFields = [
      formData.educationLevel,
      formData.researchExperience,
      domain,
      role,
    ].filter(Boolean).length

    return {
      source,
      hasTopic: Boolean((topic || storeTopic).trim()),
      hasExistingProfile: Boolean(userProfile),
      educationLevel: formData.educationLevel || null,
      researchExperience: formData.researchExperience || null,
      domainProvided: Boolean(domain),
      roleProvided: Boolean(role),
      domainLength: domain.length,
      roleLength: role.length,
      filledFields,
      completionRate: Number((filledFields / 4).toFixed(2)),
    }
  }

  const trackOnboardingEvent = (
    eventType: 'onboarding_viewed' | 'onboarding_skipped' | 'onboarding_completed' | 'profile_edited',
    formData = onboardingData,
    source: 'start' | 'edit' = isEditingProfile ? 'edit' : 'start',
    eventProjectId = projectId || sessionId
  ) => {
    if (!eventProjectId) return

    const telemetry = buildOnboardingTelemetryMetadata(formData, source)

    void persistInteractionEvent({
      projectId: eventProjectId,
      stage: 0,
      stepId: 'onboarding',
      stepLabel: source === 'edit' ? 'Profile Edit' : 'Onboarding',
      userInput: eventType,
      aiOutput: JSON.stringify({
        eventType,
        source,
        filledFields: telemetry.filledFields,
        completionRate: telemetry.completionRate,
      }),
      mode: 'telemetry',
      locale,
      topic: topic || storeTopic,
      metadata: {
        eventType,
        ...telemetry,
      },
    })
  }

  const EDUCATION_LABELS: Record<string, Record<string, string>> = {
    'pt-PT': { basic: 'Ensino básico/secundário', undergraduate: 'Licenciatura', master: 'Mestrado', doctorate: 'Doutoramento' },
    en: { basic: 'School (K-12)', undergraduate: 'Undergraduate', master: 'Master', doctorate: 'Doctorate' },
  }
  const EXPERIENCE_LABELS: Record<string, Record<string, string>> = {
    'pt-PT': { beginner: 'Iniciante', intermediate: 'Intermédia', advanced: 'Avançada' },
    en: { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' },
  }
  const friendlyLabel = (map: Record<string, Record<string, string>>, value: string) =>
    map[locale]?.[value] ?? map['pt-PT']?.[value] ?? value

  const handleOnboardingSkip = () => {
    const source = isEditingProfile ? 'edit' : 'start'

    setShowOnboardingModal(false)
    setIsEditingProfile(false)
    if (!isEditingProfile) setIsStarted(true)

    trackOnboardingEvent('onboarding_skipped', onboardingData, source)
  }

  const handleOnboardingContinue = () => {
    const source = isEditingProfile ? 'edit' : 'start'
    const eventType = source === 'edit' ? 'profile_edited' : 'onboarding_completed'

    setUserProfile(onboardingData)
    setShowOnboardingModal(false)
    setIsEditingProfile(false)
    setIsStarted(true)

    trackOnboardingEvent(eventType, onboardingData, source)
  }

  const renderOnboardingModal = () => {
    if (!showOnboardingModal) return null

    const title = isEditingProfile
      ? t('home.onboarding.titleEdit')
      : t('home.onboarding.title')
    const description = isEditingProfile
      ? t('home.onboarding.descriptionEdit')
      : t('home.onboarding.description')

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-xl rounded-[var(--radius-md)] border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl md:p-6">
          <h2 className="font-display text-xl font-semibold text-slate-900">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {description}
          </p>

          <ul className="mt-4 space-y-2 rounded-[var(--radius-sm)] bg-slate-50 p-3 text-xs leading-6 text-slate-700">
            <li>{t('home.onboarding.benefit1')}</li>
            <li>{t('home.onboarding.benefit2')}</li>
            <li>{t('home.onboarding.benefit3')}</li>
          </ul>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-800">
              {t('home.onboarding.educationLabel')}
              <select
                value={onboardingData.educationLevel}
                onChange={(e) =>
                  setOnboardingData((prev) => ({ ...prev, educationLevel: e.target.value }))
                }
                className="mt-1 w-full rounded-[var(--radius-sm)] border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">{t('home.onboarding.educationPlaceholder')}</option>
                <option value="basic">{t('home.onboarding.educationBasic')}</option>
                <option value="undergraduate">{t('home.onboarding.educationUndergraduate')}</option>
                <option value="master">{t('home.onboarding.educationMaster')}</option>
                <option value="doctorate">{t('home.onboarding.educationDoctorate')}</option>
              </select>
            </label>

            <label className="text-sm font-medium text-slate-800">
              {t('home.onboarding.experienceLabel')}
              <select
                value={onboardingData.researchExperience}
                onChange={(e) =>
                  setOnboardingData((prev) => ({ ...prev, researchExperience: e.target.value }))
                }
                className="mt-1 w-full rounded-[var(--radius-sm)] border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">{t('home.onboarding.experiencePlaceholder')}</option>
                <option value="beginner">{t('home.onboarding.experienceBeginner')}</option>
                <option value="intermediate">{t('home.onboarding.experienceIntermediate')}</option>
                <option value="advanced">{t('home.onboarding.experienceAdvanced')}</option>
              </select>
            </label>

            <label className="text-sm font-medium text-slate-800">
              {t('home.onboarding.domainLabel')}
              <input
                type="text"
                value={onboardingData.domain}
                onChange={(e) =>
                  setOnboardingData((prev) => ({ ...prev, domain: e.target.value }))
                }
                placeholder={t('home.onboarding.domainPlaceholder')}
                className="mt-1 w-full rounded-[var(--radius-sm)] border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm font-medium text-slate-800">
              {t('home.onboarding.roleLabel')}
              <input
                type="text"
                value={onboardingData.role}
                onChange={(e) =>
                  setOnboardingData((prev) => ({ ...prev, role: e.target.value }))
                }
                placeholder={t('home.onboarding.rolePlaceholder')}
                className="mt-1 w-full rounded-[var(--radius-sm)] border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <p className="mt-4 text-xs leading-6 text-slate-600">
            {t('home.onboarding.optionalNote')}
          </p>

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={handleOnboardingSkip}
              className="rounded-[var(--radius-sm)] border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              {isEditingProfile ? t('home.deleteModal.cancel') : t('home.onboarding.skip')}
            </button>
            <button
              type="button"
              onClick={handleOnboardingContinue}
              className="rounded-[var(--radius-sm)] bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-[var(--on_primary)]"
            >
              {t('home.onboarding.continue')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleResetSession = () => {
    resetSession()
    clearSessionProjectCookie()
    setTopic('')
    setShareMessage('')
    setIsStarted(false)
  }

  const handleDeleteServerData = async () => {
    if (!projectId) return

    setDeleteConfirmationInput('')
    setShowDeleteModal(true)
  }

  const confirmDeleteServerData = async () => {
    if (!projectId) return

    if (deleteConfirmationInput.trim() !== t('home.deleteModal.keyword')) {
      setShareMessage(t('home.deleteModal.invalidConfirmation'))
      return
    }

    try {
      setDeletingServerData(true)
      const res = await fetch('/api/user/data', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, mode: 'project' }),
      })

      if (!res.ok) {
        throw new Error(
          pt
            ? 'Falha ao apagar dados no servidor.'
            : 'Failed to delete server data.'
        )
      }

      setShareMessage(t('home.deleteModal.success'))
      setShowDeleteModal(false)
      setDeleteConfirmationInput('')
    } catch {
      setShareMessage(t('home.deleteModal.error'))
    } finally {
      setDeletingServerData(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!projectId) return

    try {
      setShareMessage('')
      const res = await fetch(`/api/export/${projectId}`)
      if (!res.ok) {
        const details = await res.text()
        throw new Error(details || 'PDF export failed')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `research-${projectId}.pdf`
      anchor.click()
      URL.revokeObjectURL(url)

      setShareMessage(t('home.pdfSuccess'))
    } catch {
      setShareMessage(t('home.pdfError'))
    }
  }

  const buildSessionExport = () => {
    const snapshot = useWizardStore.getState()
    return {
      exportedAt: new Date().toISOString(),
      projectId: snapshot.projectId,
      stage: snapshot.stage,
      workflowStep: snapshot.workflowStep,
      topic: snapshot.topic,
      finalResearchQuestion: snapshot.finalResearchQuestion,
      searchDesign: snapshot.searchDesign,
      selectedArticles: snapshot.selectedSearchArticleIds,
      evidenceRecords: snapshot.evidenceRecords,
      knowledgeStructure: snapshot.knowledgeStructure,
      explanationDraft: snapshot.explanationDraft,
      multimodalOutputs: snapshot.multimodalOutputs,
      reflection: {
        peerReviews: snapshot.peerReviews,
        selfAssessment: snapshot.selfAssessment,
        reflectionJournal: snapshot.reflectionJournal,
        extensionPlan: snapshot.extensionPlan,
      },
      interactions: snapshot.interactions,
    }
  }

  const handleDownloadSessionJson = () => {
    if (!projectId) return
    const payload = buildSessionExport()
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `ibl-session-${projectId}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleShareEmail = () => {
    if (!projectId) return
    const subject = encodeURIComponent(pt ? `Sessao IBL ${projectId}` : `IBL Session ${projectId}`)
    const body = encodeURIComponent(
      pt
        ? `ID do projeto: ${projectId}\nTopico: ${topic || storeTopic || '-'}\nStage: ${stage}\nInteracoes: ${interactions.length}\n\nUse /api/export/${projectId} para descarregar o registo PDF.`
        : `Project ID: ${projectId}\nTopic: ${topic || storeTopic || '-'}\nStage: ${stage}\nInteractions: ${interactions.length}\n\nUse /api/export/${projectId} to download the PDF record.`
    )
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  const handleShareGoogleDoc = async () => {
    if (!projectId) return
    const payload = buildSessionExport()
    const markdown = [
      `# IBL Session ${projectId}`,
      `- Topic: ${payload.topic || '-'}`,
      `- Stage: ${payload.stage}`,
      `- Workflow Step: ${payload.workflowStep}`,
      `- Exported At: ${payload.exportedAt}`,
      '',
      '## Final Question',
      payload.finalResearchQuestion?.question || '-',
      '',
      '## Explanation Core',
      payload.explanationDraft?.argumentCore || '-',
      '',
      '## Notes',
      `Interactions recorded: ${payload.interactions.length}`,
    ].join('\n')

    try {
      await navigator.clipboard.writeText(markdown)
      setShareMessage(t('home.googleDocsCopied'))
    } catch {
      setShareMessage(t('home.googleDocsCopyFailed'))
    }

    window.open('https://docs.new', '_blank', 'noopener,noreferrer')
  }

  if (!isStarted) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4 md:p-8">
        <div className="glass-panel w-full max-w-3xl p-1">
          <div className="bg-[var(--surface_container_lowest)] p-6 md:p-10">
            <div className="mb-6 flex items-start justify-between gap-4">
              <AppBrand />
              <div className="flex flex-wrap items-center justify-end gap-2">
                <AuthControls />
                <LocaleSwitcher compact />
              </div>
            </div>

            <div className="mb-8 grid gap-6 md:grid-cols-[1.15fr_0.85fr]">
              <div>
                <h1 className="font-display text-3xl font-semibold uppercase tracking-[0.14em] text-[var(--on_surface)] md:text-4xl">
                  {t('home.subtitle')}
                </h1>
                <p className="mt-5 max-w-xl text-sm leading-7 text-slate-700">{t('home.intro')}</p>
              </div>
              <div className="bg-[var(--surface_container_low)] p-5">
                <p className="font-label text-xs uppercase tracking-[0.12em] text-slate-500">IBL Context</p>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  {t('home.iblContext')}
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

              {(projectId || storeTopic) && (
                <button
                  type="button"
                  onClick={handleResetSession}
                  className="w-full rounded-md bg-[var(--surface_container)] px-4 py-3 text-sm font-semibold text-[var(--on_surface)] transition hover:bg-[var(--surface_container_low)]"
                >
                  {t('home.restartSession')}
                </button>
              )}

              <div className="pt-2 text-xs text-slate-600">
                {t('home.privacyNoticePrefix')}
                <Link href="/privacy" className="font-semibold underline">
                  {t('home.privacyLink')}
                </Link>
                .
              </div>
            </div>

          </div>
        </div>
        {renderOnboardingModal()}
      </main>
    )
  }

  if (!aiConsentAccepted) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-3xl rounded-[var(--radius-md)] bg-[var(--surface_container_low)] p-6 md:p-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <h1 className="font-display text-2xl font-semibold text-[var(--on_surface)]">
              {t('home.consent.title')}
            </h1>
            <AuthControls />
          </div>

          <div className="space-y-3 text-sm leading-7 text-[var(--on_surface)]">
            <p>{t('home.consent.p1')}</p>
            <p>{t('home.consent.p2')}</p>
            <p>
              {t('home.consent.privacyPrefix')}
              <Link href="/privacy" className="font-semibold underline">
                {t('home.privacyLink')}
              </Link>
              .
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAiConsent(true)}
              className="rounded-[var(--radius-sm)] bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--on_primary)]"
            >
              {t('home.consent.accept')}
            </button>
            <button
              type="button"
              onClick={handleResetSession}
              className="rounded-[var(--radius-sm)] bg-[var(--surface_container)] px-4 py-2 text-sm font-semibold text-[var(--on_surface)]"
            >
              {t('home.consent.reject')}
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-7xl p-6 md:p-8">
        <section className="mb-4 flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] bg-[var(--surface_container_low)] p-3">
          <AuthControls />
          <Link
            href="/privacy"
            className="rounded-[var(--radius-sm)] bg-[var(--surface_container)] px-3 py-2 text-xs font-semibold text-[var(--on_surface)] hover:bg-[var(--surface_container_high)]"
          >
            {t('home.privacyPolicy')}
          </Link>
          <Link
            href="/manual"
            onClick={handleOpenManual}
            className="rounded-[var(--radius-sm)] bg-[var(--surface_container)] px-3 py-2 text-xs font-semibold text-[var(--on_surface)] hover:bg-[var(--surface_container_high)]"
          >
            {t('home.manualButton')}
          </Link>
          <button
            type="button"
            onClick={handleDownloadSessionJson}
            className="rounded-[var(--radius-sm)] bg-[var(--surface_container)] px-3 py-2 text-xs font-semibold text-[var(--on_surface)] hover:bg-[var(--surface_container_high)]"
          >
            {t('home.downloadJson')}
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="rounded-[var(--radius-sm)] bg-[var(--surface_container)] px-3 py-2 text-xs font-semibold text-[var(--on_surface)] hover:bg-[var(--surface_container_high)]"
          >
            {t('home.downloadPdf')}
          </button>
          <button
            type="button"
            onClick={handleShareEmail}
            className="rounded-[var(--radius-sm)] bg-[var(--surface_container)] px-3 py-2 text-xs font-semibold text-[var(--on_surface)] hover:bg-[var(--surface_container_high)]"
          >
            {t('home.shareEmail')}
          </button>
          <button
            type="button"
            onClick={handleShareGoogleDoc}
            className="rounded-[var(--radius-sm)] bg-[var(--surface_container)] px-3 py-2 text-xs font-semibold text-[var(--on_surface)] hover:bg-[var(--surface_container_high)]"
          >
            {t('home.shareGoogleDocs')}
          </button>
          <button
            type="button"
            onClick={handleResetSession}
            className="rounded-[var(--radius-sm)] bg-[var(--surface_container)] px-3 py-2 text-xs font-semibold text-[var(--on_surface)] hover:bg-[var(--surface_container_high)]"
          >
            {t('home.clearAndRestart')}
          </button>
          <button
            type="button"
            onClick={handleDeleteServerData}
            className="rounded-[var(--radius-sm)] bg-[var(--surface_container)] px-3 py-2 text-xs font-semibold text-[var(--on_surface)] hover:bg-[var(--surface_container_high)]"
          >
            {t('home.deleteProjectData')}
          </button>
          {shareMessage && (
            <span className="text-xs text-[var(--on_surface)] opacity-70">{shareMessage}</span>
          )}
        </section>

        {stage === 1 && <Stage1Research />}
        {stage === 2 && <Stage2Multimodal />}
        {stage === 3 && <Stage3Reflection />}

        <section className="mt-4 rounded-[var(--radius-md)] bg-[var(--surface_container_low)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-sm font-semibold uppercase tracking-[0.08em] text-[var(--on_surface)]">
              {t('home.profileCard.title')}
            </h2>
            <button
              type="button"
              onClick={handleEditProfile}
              className="rounded-[var(--radius-sm)] bg-[var(--surface_container)] px-3 py-2 text-xs font-semibold text-[var(--on_surface)] hover:bg-[var(--surface_container_high)]"
            >
              {t('home.profileCard.edit')}
            </button>
          </div>

          <div className="mt-3 grid gap-2 text-xs text-[var(--on_surface)] md:grid-cols-2">
            <p><span className="font-semibold">{t('home.profileCard.education')}:</span> {userProfile?.educationLevel ? friendlyLabel(EDUCATION_LABELS, userProfile.educationLevel) : t('home.profileCard.empty')}</p>
            <p><span className="font-semibold">{t('home.profileCard.experience')}:</span> {userProfile?.researchExperience ? friendlyLabel(EXPERIENCE_LABELS, userProfile.researchExperience) : t('home.profileCard.empty')}</p>
            <p><span className="font-semibold">{t('home.profileCard.domain')}:</span> {userProfile?.domain || t('home.profileCard.empty')}</p>
            <p><span className="font-semibold">{t('home.profileCard.role')}:</span> {userProfile?.role || t('home.profileCard.empty')}</p>
          </div>
        </section>

        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-[var(--radius-md)] border border-rose-200 bg-white p-5 text-slate-900 shadow-2xl">
              <h3 className="text-base font-semibold">
                {t('home.deleteModal.title')}
              </h3>
              <p className="mt-2 text-sm text-slate-700">
                {t('home.deleteModal.description')}
              </p>
              <p className="mt-3 text-xs font-semibold text-slate-700">
                {t('home.deleteModal.instruction')}
              </p>
              <input
                type="text"
                value={deleteConfirmationInput}
                onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                placeholder={t('home.deleteModal.keyword')}
                className="mt-2 w-full rounded-[var(--radius-sm)] border border-slate-300 px-3 py-2 text-sm"
              />

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeleteConfirmationInput('')
                  }}
                  className="rounded-[var(--radius-sm)] border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {t('home.deleteModal.cancel')}
                </button>
                <button
                  type="button"
                  disabled={deletingServerData || deleteConfirmationInput.trim() !== t('home.deleteModal.keyword')}
                  onClick={confirmDeleteServerData}
                  className="rounded-[var(--radius-sm)] bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {deletingServerData ? t('home.deleteModal.deleting') : t('home.deleteModal.confirm')}
                </button>
              </div>
            </div>
          </div>
        )}

        {renderOnboardingModal()}
      </div>
    </main>
  )
}
