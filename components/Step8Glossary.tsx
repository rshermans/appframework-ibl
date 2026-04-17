'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import type { KnowledgeStructure } from '@/types/research-workflow'
import { useI18n } from '@/components/I18nProvider'
import StepHeader from '@/components/StepHeader'
import EthicalTip from '@/components/EthicalTip'
import { getIblEthicalTip } from '@/lib/iblFramework'

interface GlossaryEntry {
  term: string
  definition: string
}

export default function Step8Glossary() {
  const { t, locale } = useI18n()
  const { knowledgeStructure, setKnowledgeStructure, setWorkflowStep } = useWizardStore()

  const initialEntries: GlossaryEntry[] = knowledgeStructure?.glossary ?? []

  const [entries, setEntries] = useState<GlossaryEntry[]>(initialEntries)
  const [newTerm, setNewTerm] = useState('')
  const [newDef, setNewDef] = useState('')
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [editTerm, setEditTerm] = useState('')
  const [editDef, setEditDef] = useState('')

  function handleAddEntry() {
    const term = newTerm.trim()
    const definition = newDef.trim()
    if (!term || !definition) return
    setEntries((prev) => [...prev, { term, definition }])
    setNewTerm('')
    setNewDef('')
  }

  function handleRemoveEntry(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index))
  }

  function startEdit(index: number) {
    setEditIndex(index)
    setEditTerm(entries[index].term)
    setEditDef(entries[index].definition)
  }

  function commitEdit() {
    if (editIndex === null) return
    const term = editTerm.trim()
    const definition = editDef.trim()
    if (!term || !definition) return
    setEntries((prev) =>
      prev.map((entry, i) => (i === editIndex ? { term, definition } : entry))
    )
    setEditIndex(null)
    setEditTerm('')
    setEditDef('')
  }

  function cancelEdit() {
    setEditIndex(null)
    setEditTerm('')
    setEditDef('')
  }

  function handleSave() {
    if (!knowledgeStructure) return
    const updated: KnowledgeStructure = { ...knowledgeStructure, glossary: entries }
    setKnowledgeStructure(updated)
    setWorkflowStep('step9_explanation')
  }

  return (
    <div className="space-y-6">
      <StepHeader
        stepId="step8_glossary"
        title={t('steps.step8.title')}
        subtitle={t('steps.step8.intro')}
        showEthicalTip={false}
      />

      <EthicalTip
        title={t('steps.step8.ethicalTip')}
        tip={getIblEthicalTip('step8_glossary', locale)}
        className="mb-2"
      />

      {!knowledgeStructure && (
        <div className="rounded-[var(--radius-xl)] border border-[var(--outline_variant)] bg-[var(--surface_container_low)] p-6 text-center text-sm text-[var(--on_surface_variant)]">
          {t('steps.step8.noStructure')}
        </div>
      )}

      {knowledgeStructure && (
        <>
          <div className="space-y-3">
            {entries.length === 0 && (
              <p className="text-sm text-[var(--on_surface_variant)]">
                {t('steps.step8.noTerms')}
              </p>
            )}

            {entries.map((entry, index) =>
              editIndex === index ? (
                <div
                  key={index}
                  className="rounded-[var(--radius-xl)] border border-[var(--primary)] bg-[var(--primary_container)] p-4 space-y-3"
                >
                  <input
                    type="text"
                    value={editTerm}
                    onChange={(e) => setEditTerm(e.target.value)}
                    placeholder="Term"
                    className="w-full rounded-[var(--radius-md)] border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--on_surface)] placeholder:text-[var(--on_surface_variant)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                  <textarea
                    value={editDef}
                    onChange={(e) => setEditDef(e.target.value)}
                    placeholder="Definition"
                    rows={2}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--on_surface)] placeholder:text-[var(--on_surface_variant)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={commitEdit}
                      className="rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-1.5 text-xs font-semibold text-[var(--on_primary)] hover:brightness-90 transition"
                    >
                      {t('common.save')}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-[var(--radius-md)] bg-[var(--surface_container_high)] px-4 py-1.5 text-xs font-semibold text-[var(--on_surface)] hover:brightness-95 transition"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-[var(--radius-xl)] border border-[var(--outline_variant)] bg-[var(--surface_container_low)] p-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--on_surface)]">{entry.term}</p>
                    <p className="mt-0.5 text-sm text-[var(--on_surface_variant)] leading-snug">
                      {entry.definition}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(index)}
                      title="Edit"
                      className="rounded-[var(--radius-sm)] px-2 py-1 text-xs text-[var(--on_surface_variant)] hover:bg-[var(--surface_container_high)] transition"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveEntry(index)}
                      title="Remove"
                      className="rounded-[var(--radius-sm)] px-2 py-1 text-xs text-[var(--error)] hover:bg-[var(--error_container)] transition"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            )}
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[var(--outline_variant)] bg-[var(--surface_container)] p-4 space-y-3">
            <p className="text-xs font-semibold text-[var(--on_surface_variant)] uppercase tracking-wide">
              {t('steps.step8.addTermTitle')}
            </p>
            <input
              type="text"
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              placeholder={t('steps.step8.termPlaceholder')}
              className="w-full rounded-[var(--radius-md)] border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--on_surface)] placeholder:text-[var(--on_surface_variant)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
            <textarea
              value={newDef}
              onChange={(e) => setNewDef(e.target.value)}
              placeholder={t('steps.step8.defPlaceholder')}
              rows={2}
              className="w-full rounded-[var(--radius-md)] border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--on_surface)] placeholder:text-[var(--on_surface_variant)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
            />
            <button
              type="button"
              onClick={handleAddEntry}
              disabled={!newTerm.trim() || !newDef.trim()}
              className="rounded-[var(--radius-md)] bg-[var(--secondary_container)] px-4 py-2 text-sm font-semibold text-[var(--on_secondary_container)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('steps.step8.addButton')}
            </button>
          </div>

          <div className="flex flex-col gap-3 rounded-[var(--radius-xl)] border border-[var(--outline_variant)] bg-[var(--surface_container)] p-4">
            <div className="text-sm text-[var(--on_surface_variant)]">
              {t('steps.step8.summary', { count: entries.length })}
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={entries.length === 0}
              className="self-start rounded-[var(--radius-md)] bg-[var(--primary)] px-8 py-3 text-sm font-semibold text-[var(--on_primary)] transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('steps.step8.continueButton')} →
            </button>
          </div>
        </>
      )}
    </div>
  )
}
