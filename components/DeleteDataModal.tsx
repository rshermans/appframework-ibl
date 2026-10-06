'use client'

import { useI18n } from '@/components/I18nProvider'

interface DeleteDataModalProps {
  inputValue: string
  onInputChange: (value: string) => void
  deleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

export default function DeleteDataModal({ inputValue, onInputChange, deleting, onCancel, onConfirm }: DeleteDataModalProps) {
  const { t } = useI18n()

  return (
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
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={t('home.deleteModal.keyword')}
          className="mt-2 w-full rounded-[var(--radius-sm)] border border-slate-300 px-3 py-2 text-sm"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[var(--radius-sm)] border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            {t('home.deleteModal.cancel')}
          </button>
          <button
            type="button"
            disabled={deleting || inputValue.trim() !== t('home.deleteModal.keyword')}
            onClick={onConfirm}
            className="rounded-[var(--radius-sm)] bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {deleting ? t('home.deleteModal.deleting') : t('home.deleteModal.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
