'use client'

import { useI18n } from '@/components/I18nProvider'
import Drawer from '@/components/ui/Drawer'

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
    <Drawer open variant="dialog" size="md" title={t('home.deleteModal.title')} onClose={onCancel} closeLabel={t('home.deleteModal.cancel')}>
      <div className="text-[var(--on_surface)]">
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
  </Drawer>
  )
}
