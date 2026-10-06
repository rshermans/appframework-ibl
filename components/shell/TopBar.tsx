'use client'

import AppBrand from '@/components/AppBrand'
import AuthControls from '@/components/AuthControls'
import LocaleSwitcher from '@/components/LocaleSwitcher'
import { ProgressPill } from '@/components/ProgressDashboard'
import { useI18n } from '@/components/I18nProvider'
import { useWizardStore } from '@/store/wizardStore'
import MenuButton, { type MenuEntry } from './MenuButton'

export interface TopBarActions {
  onOpenProgress: () => void
  onOpenProfile: () => void
  onOpenManual: () => void
  onDownloadJson: () => void
  onDownloadPdf: () => void
  onShareEmail: () => void
  onShareGoogleDoc: () => void
  onReset: () => void
  onDelete: () => void
}

const STAGES = [1, 2, 3] as const

/**
 * Compact, always-visible bar: where am I (stage), how far along, account and the
 * secondary actions that used to be a row of nine buttons above the workspace.
 */
export default function TopBar({ actions }: { actions: TopBarActions }) {
  const { locale, t } = useI18n()
  const pt = locale === 'pt-PT'
  const { stage, setStage } = useWizardStore()

  const entries: MenuEntry[] = [
    { type: 'item', key: 'profile', label: t('home.profileCard.title'), onSelect: actions.onOpenProfile },
    { type: 'item', key: 'privacy', label: t('home.privacyPolicy'), href: '/privacy' },
    { type: 'item', key: 'manual', label: t('home.manualButton'), href: '/manual', onSelect: actions.onOpenManual },
    { type: 'separator', key: 's1' },
    { type: 'heading', key: 'h-export', label: pt ? 'Exportar e partilhar' : 'Export & share' },
    { type: 'item', key: 'json', label: t('home.downloadJson'), onSelect: actions.onDownloadJson },
    { type: 'item', key: 'pdf', label: t('home.downloadPdf'), onSelect: actions.onDownloadPdf },
    { type: 'item', key: 'email', label: t('home.shareEmail'), onSelect: actions.onShareEmail },
    { type: 'item', key: 'gdoc', label: t('home.shareGoogleDocs'), onSelect: actions.onShareGoogleDoc },
    { type: 'separator', key: 's2' },
    { type: 'custom', key: 'locale', node: <div className="md:hidden"><LocaleSwitcher compact /></div> },
    { type: 'separator', key: 's3' },
    { type: 'item', key: 'reset', label: t('home.clearAndRestart'), onSelect: actions.onReset, danger: true },
    { type: 'item', key: 'delete', label: t('home.deleteProjectData'), onSelect: actions.onDelete, danger: true },
  ]

  return (
    <header className="z-40 shrink-0 border-b border-[var(--outline_variant)] bg-[var(--surface)]/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-2 px-3 md:gap-3 md:px-5">
        <span className="hidden shrink-0 sm:inline-flex">
          <AppBrand bar />
        </span>
        <nav aria-label={pt ? 'Etapas' : 'Stages'} className="flex items-center gap-1 rounded-full bg-[var(--surface_container)] p-1">
          {STAGES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStage(value)}
              aria-current={stage === value ? 'page' : undefined}
              aria-label={pt ? `Etapa ${value}` : `Stage ${value}`}
              className={`min-h-[36px] min-w-[36px] whitespace-nowrap rounded-full px-2.5 text-xs font-semibold transition sm:px-3 ${
                stage === value
                  ? 'primary-gradient text-[var(--on_primary)]'
                  : 'text-[var(--on_surface)] hover:bg-[var(--surface_container_high)]'
              }`}
            >
              <span className="sm:hidden">{value}</span>
              <span className="hidden sm:inline">{pt ? `Etapa ${value}` : `Stage ${value}`}</span>
            </button>
          ))}
        </nav>
        <div className="ml-auto flex min-w-0 items-center gap-1.5 md:gap-2">
          <ProgressPill onClick={actions.onOpenProgress} />
          <AuthControls />
          <div className="hidden md:block">
            <LocaleSwitcher compact />
          </div>
          <MenuButton label={pt ? 'Mais' : 'More'} entries={entries} />
        </div>
      </div>
    </header>
  )
}
