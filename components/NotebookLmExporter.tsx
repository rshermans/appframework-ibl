'use client'

import { useState } from 'react'
import { useI18n } from '@/components/I18nProvider'
import type { NotebookLmArtifactType } from '@/lib/notebookLmPrompts'
import type { EvidenceRecord } from '@/types/research-workflow'

interface NotebookLmExporterProps {
  projectId: string
  topic: string
  researchQuestion: string
  evidenceRecords: EvidenceRecord[]
  artifactType: NotebookLmArtifactType
  onClose: () => void
}

export default function NotebookLmExporter({
  projectId,
  topic,
  researchQuestion,
  evidenceRecords,
  artifactType,
  onClose,
}: NotebookLmExporterProps) {
  const { t, locale } = useI18n()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exportData, setExportData] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const pt = locale === 'pt-PT'

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/export-notebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          artifactType,
          locale,
          researchQuestion,
          topic,
          evidenceRecords,
        }),
      })

      if (!res.ok) {
        throw new Error(await res.text())
      }

      const data = await res.json()
      setExportData(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const handleCopyPrompt = () => {
    if (!exportData?.promptText) return
    navigator.clipboard.writeText(exportData.promptText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleOpenNotebookLM = () => {
    // Open NotebookLM and show instructions
    window.open('https://notebooklm.google.com', '_blank', 'noopener,noreferrer')
  }

  if (!exportData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-2xl rounded-lg border border-slate-300 bg-white p-6 text-slate-900 shadow-2xl md:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold text-slate-900">
              {pt ? 'Exportar para NotebookLM' : 'Export to NotebookLM'}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-900"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4 text-sm text-slate-800">
            <p>
              {pt
                ? 'Vamos preparar uma instrução estruturada e evidência comprimida para criar um '
                : 'We will prepare structured instructions and compressed evidence to create a '}
              <strong>{artifactType}</strong>
              {pt ? ' no NotebookLM.' : ' in NotebookLM.'}
            </p>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              {pt ? (
                <>
                  <p className="font-semibold mb-2">Como funciona:</p>
                  <ol className="list-inside list-decimal space-y-1">
                    <li>Clique "Gerar Export" para criar a instrução otimizada</li>
                    <li>Copie o texto do prompt</li>
                    <li>Abra NotebookLM em nova aba</li>
                    <li>Cole o prompt e crie o seu artefato</li>
                    <li>Partilhe o link do NotebookLM quando terminar</li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="font-semibold mb-2">How it works:</p>
                  <ol className="list-inside list-decimal space-y-1">
                    <li>Click "Generate Export" to create optimized instructions</li>
                    <li>Copy the prompt text</li>
                    <li>Open NotebookLM in new tab</li>
                    <li>Paste the prompt and create your artifact</li>
                    <li>Share the NotebookLM link when done</li>
                  </ol>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-4">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {loading ? '...' : pt ? 'Gerar Export' : 'Generate Export'}
              </button>
              <button
                onClick={onClose}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
              >
                {pt ? 'Cancelar' : 'Cancel'}
              </button>
            </div>

            {error && (
              <div className="rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-800">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-lg border border-slate-300 bg-white p-6 text-slate-900 shadow-2xl md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-slate-900">
            {pt ? 'Instrução de Export Pronta' : 'Export Instructions Ready'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-sm text-slate-800">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
            <div>
              <div className="text-xs text-slate-600">
                {pt ? 'Tipo' : 'Type'}
              </div>
              <div className="font-semibold text-slate-900">{artifactType}</div>
            </div>
            <div>
              <div className="text-xs text-slate-600">
                {pt ? 'Tokens' : 'Tokens'}
              </div>
              <div className="font-semibold text-slate-900">
                ~{exportData.tokenEstimate || 0}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-600">
                {pt ? 'Pontos-Chave' : 'Key Points'}
              </div>
              <div className="font-semibold text-slate-900">
                {exportData.evidenceKeyPoints?.length || 0}
              </div>
            </div>
          </div>

          {/* Evidence Key Points */}
          {exportData.evidenceKeyPoints?.length > 0 && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-semibold text-slate-700">
                {pt ? 'Pontos-Chave de Evidência' : 'Evidence Key Points'}
              </p>
              <ul className="space-y-1 text-xs text-slate-800">
                {exportData.evidenceKeyPoints.slice(0, 5).map((ep: any, i: number) => (
                  <li key={i} className="flex gap-2">
                    <span className="min-w-fit flex-shrink-0 text-slate-500">
                      •
                    </span>
                    <span>
                      {ep.claim.substring(0, 60)}... <em className="text-slate-600">({ep.source})</em>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Prompt Preview */}
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-700">
              {pt ? 'Pré-visualização do Prompt' : 'Prompt Preview'}
            </p>
            <pre className="max-h-40 overflow-y-auto rounded border border-slate-200 bg-white p-2 text-xs text-slate-900 whitespace-pre-wrap">
              {exportData.promptText?.substring(0, 400)}...
            </pre>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCopyPrompt}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-blue-700 text-white hover:bg-blue-800'
              }`}
            >
              {copied ? (pt ? '✓ Copiado' : '✓ Copied') : (pt ? 'Copiar Prompt' : 'Copy Prompt')}
            </button>

            <button
              onClick={handleOpenNotebookLM}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
            >
              {pt ? 'Abrir NotebookLM' : 'Open NotebookLM'} →
            </button>

            <button
              onClick={onClose}
              className="ml-auto rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
            >
              {pt ? 'Fechar' : 'Close'}
            </button>
          </div>

          {/* Instructions */}
          <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-900">
            {pt ? (
              <>
                <p className="font-semibold mb-1">Próximos passos:</p>
                <ol className="list-inside list-decimal space-y-1">
                  <li>Clique "Copiar Prompt" (já está na clipboard)</li>
                  <li>Clique "Abrir NotebookLM"</li>
                  <li>Cole o prompt no NotebookLM (Ctrl+V)</li>
                  <li>Crie o seu {artifactType}</li>
                  <li>Quando terminar, guarde o link do documento</li>
                </ol>
              </>
            ) : (
              <>
                <p className="font-semibold mb-1">Next steps:</p>
                <ol className="list-inside list-decimal space-y-1">
                  <li>Click "Copy Prompt" (already in clipboard)</li>
                  <li>Click "Open NotebookLM"</li>
                  <li>Paste the prompt in NotebookLM (Ctrl+V)</li>
                  <li>Create your {artifactType}</li>
                  <li>When done, save the document link</li>
                </ol>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
