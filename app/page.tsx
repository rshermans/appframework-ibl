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

export default function Home() {
  const {
    projectId,
    stage,
    topic: storeTopic,
    aiConsentAccepted,
    interactions,
    resetSession,
    setAiConsent,
    setProject,
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
      setIsStarted(true)
    }
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
          <LocaleSwitcher compact />
          <Link
            href="/privacy"
            className="rounded-[var(--radius-sm)] bg-[var(--surface_container)] px-3 py-2 text-xs font-semibold text-[var(--on_surface)] hover:bg-[var(--surface_container_high)]"
          >
            {t('home.privacyPolicy')}
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
      </div>
    </main>
  )
}
