'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import type { ExplanationDraft, EvidenceRecord, SearchArticle } from '@/types/research-workflow'
import { useI18n } from '@/components/I18nProvider'
import StepHeader from '@/components/StepHeader'
import QualityRating from '@/components/QualityRating'
import { parseAiJsonWithOptions } from '@/lib/parseAiJson'
import { retryWithBackoff } from '@/lib/retryHelper'
import { safeFetch } from '@/lib/safeFetch'

interface ReviewedReference {
  key: string
  citation: string
  articleUrl?: string
  doiUrl?: string
  provider?: SearchArticle['provider']
}

function formatArticleCitation(article: SearchArticle): string {
  const authorLabel = article.authors.length > 0 ? article.authors.join(', ') : 'Unknown authors'
  const yearLabel = article.year ? String(article.year) : 'n.d.'
  const doiLabel = article.doi ? ` DOI: ${article.doi}` : ''
  const urlLabel = article.url ? ` ${article.url}` : ''
  return `${authorLabel} (${yearLabel}). ${article.title}.${doiLabel}${urlLabel}`.trim()
}

function normalizeUrl(value?: string): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  return undefined
}

function normalizeDoi(value?: string): string | undefined {
  if (!value) return undefined
  const normalized = value
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
  return normalized || undefined
}

function doiToUrl(doi?: string): string | undefined {
  const normalized = normalizeDoi(doi)
  if (!normalized) return undefined
  return `https://doi.org/${normalized}`
}

function extractFirstUrl(text?: string): string | undefined {
  if (!text) return undefined
  const match = text.match(/https?:\/\/[^\s)]+/i)
  return normalizeUrl(match?.[0])
}

function extractDoi(text?: string): string | undefined {
  if (!text) return undefined
  const match = text.match(/\b10\.\d{4,9}\/[^\s"<>]+/i)
  return normalizeDoi(match?.[0])
}

function isLikelyPdf(url: string): boolean {
  return /\.pdf(\?|$)/i.test(url)
}

function buildReviewedReferences(
  evidenceRecords: EvidenceRecord[],
  searchArticles: SearchArticle[]
): ReviewedReference[] {
  const linkedArticles = new Map(searchArticles.map((article) => [article.id, article] as const))
  const referencesByKey = new Map<string, ReviewedReference>()

  evidenceRecords.forEach((record, index) => {
    const sourceArticle = record.sourceArticleId ? linkedArticles.get(record.sourceArticleId) : undefined
    const fallbackCitation =
      record.citation?.trim() ||
      (sourceArticle ? formatArticleCitation(sourceArticle) : record.sourceArticleTitle?.trim()) ||
      `Source ${index + 1}`
    const articleUrl = normalizeUrl(sourceArticle?.url) || extractFirstUrl(record.citation)
    const doiUrl = doiToUrl(sourceArticle?.doi || extractDoi(record.citation))
    const dedupeKey =
      record.sourceArticleId ||
      `${fallbackCitation}|${sourceArticle?.provider || ''}|${articleUrl || ''}|${doiUrl || ''}`

    referencesByKey.set(dedupeKey, {
      key: dedupeKey,
      citation: fallbackCitation,
      articleUrl,
      doiUrl,
      provider: sourceArticle?.provider || record.sourceProvider,
    })
  })

  return Array.from(referencesByKey.values())
}

function buildCompleteBibliography(
  evidenceRecords: EvidenceRecord[],
  searchArticles: SearchArticle[]
): string[] {
  const references = buildReviewedReferences(evidenceRecords, searchArticles)
  const entries = references.map((reference) => {
    const links = [reference.articleUrl ? `URL: ${reference.articleUrl}` : '', reference.doiUrl ? `DOI: ${reference.doiUrl}` : '']
      .filter(Boolean)
      .join(' | ')
    return links ? `${reference.citation} (${links})` : reference.citation
  })

  return Array.from(new Set(entries))
}

function buildFallbackOutline(isPortuguese: boolean): string[] {
  return isPortuguese
    ? [
        'Enquadramento da pergunta de investigacao',
        'Sintese da evidencia principal',
        'Analise critica dos achados',
        'Implicacoes e proximos passos',
        'Conclusao',
      ]
    : [
        'Research question framing',
        'Synthesis of the main evidence',
        'Critical analysis of findings',
        'Implications and next steps',
        'Conclusion',
      ]
}

function buildFallbackArgumentCore(
  evidenceRecords: EvidenceRecord[],
  topic: string,
  isPortuguese: boolean
): string {
  const evidenceCount = evidenceRecords.length
  return isPortuguese
    ? `Com base em ${evidenceCount} registos de evidencia analisados sobre ${topic || 'o tema em estudo'}, observa-se um padrao consistente que sustenta uma explicacao cientifica inicial, ainda sujeita a refinamento critico.`
    : `Based on ${evidenceCount} analyzed evidence records about ${topic || 'the current topic'}, the available findings support an initial scientific explanation that can be refined further.`
}

export default function Step5Explanation() {
  const { locale, t } = useI18n()
  const {
    addInteraction,
    evidenceRecords,
    explanationDraft,
    finalResearchQuestion,
    knowledgeStructure,
    projectId,
    searchArticles,
    setExplanationDraft,
    topic,
  } = useWizardStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [audience, setAudience] = useState<'expert' | 'general'>('expert')
  const [qualityRating, setQualityRating] = useState<number | null>(null)
  const isPortuguese = locale === 'pt-PT'
  const reviewedReferences = buildReviewedReferences(evidenceRecords, searchArticles)

  const canRun = Boolean(
    finalResearchQuestion?.approvedByUser &&
    knowledgeStructure &&
    evidenceRecords.length > 0
  )

  const buildExplanationDraft = async () => {
    if (!finalResearchQuestion?.question) {
      setError(t('steps.step5.locked'))
      return
    }
    if (!knowledgeStructure || evidenceRecords.length === 0) {
      setError(t('steps.step5.locked'))
      return
    }

    setLoading(true)
    setError('')

    try {
      const evidenceJson = JSON.stringify(evidenceRecords, null, 2)
      const bibliographySeed = buildCompleteBibliography(evidenceRecords, searchArticles)
      const requestBody = {
        projectId,
        stage: 2,
        promptId: 'step9',
        stepId: 'step9_explanation',
        stepLabel: t('workflow.step9_explanation.label'),
        topic,
        rq: finalResearchQuestion.question,
        finalResearchQuestion,
        evidenceRecords,
        knowledgeStructure,
        evidence: evidenceJson,
        bibliographySeed,
        audience,
        locale,
      }

      const { response, json: payload } = await retryWithBackoff(
        () =>
          safeFetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          }),
        { maxAttempts: 2, initialDelayMs: 1200, maxDelayMs: 3000 }
      )

      const data = payload?.data ?? payload

      if (!response.ok || !payload?.ok) {
        throw new Error((payload?.details || payload?.error || t('api.genericFailure')) as string)
      }

      const parsed = parseAiJsonWithOptions<{
        outline?: string[]
        argument_core?: string
        argumentCore?: string
        evidence_references?: string[]
        evidenceReferences?: string[]
        bibliography?: string[]
        open_issues?: string[]
        openIssues?: string[]
      }>(data.output, {
        validate: (value) => {
          const outline = Array.isArray(value?.outline) ? value.outline.filter(Boolean) : []
          const argumentCore = value?.argument_core || value?.argumentCore || ''
          const bibliography = Array.isArray(value?.bibliography) ? value.bibliography.filter(Boolean) : []
          return outline.length > 0 && typeof argumentCore === 'string' && argumentCore.trim().length > 0 && bibliography.length > 0
        },
        errorMessage: isPortuguese
          ? 'A IA devolveu uma explicação incompleta. O resultado precisa de incluir estrutura, tese central e bibliografia.'
          : 'AI returned an incomplete explanation. The result must include an outline, a central argument, and bibliography.',
      })

      const normalizedOutline = Array.isArray(parsed?.outline) ? parsed.outline.filter(Boolean) : []
      const normalizedArgumentCore = parsed?.argument_core || parsed?.argumentCore || ''
      const normalizedEvidenceReferences = Array.isArray(parsed?.evidence_references)
        ? parsed.evidence_references.filter(Boolean)
        : Array.isArray(parsed?.evidenceReferences)
          ? parsed.evidenceReferences.filter(Boolean)
          : []
      const normalizedOpenIssues = Array.isArray(parsed?.open_issues)
        ? parsed.open_issues.filter(Boolean)
        : Array.isArray(parsed?.openIssues)
          ? parsed.openIssues.filter(Boolean)
          : []

      const nextDraft: ExplanationDraft = {
        outline:
          normalizedOutline.length > 0 ? normalizedOutline : buildFallbackOutline(isPortuguese),
        argumentCore:
          normalizedArgumentCore || buildFallbackArgumentCore(evidenceRecords, topic, isPortuguese),
        evidenceReferences: normalizedEvidenceReferences,
        bibliography:
          Array.isArray(parsed?.bibliography) && parsed.bibliography.length > 0
            ? parsed.bibliography
            : bibliographySeed,
        openIssues: normalizedOpenIssues,
      }

      if (nextDraft.bibliography.length === 0) {
        throw new Error(
          isPortuguese
            ? 'A IA devolveu uma explicacao sem bibliografia aproveitavel.'
            : 'AI returned an explanation without usable bibliography.'
        )
      }

      setExplanationDraft(nextDraft)
      addInteraction({
        id: `interaction-${Date.now()}`,
        stage: 2,
        stepId: 'step9_explanation',
        stepLabel: t('workflow.step9_explanation.label'),
        promptId: 'step9',
        eventType: explanationDraft ? 'redo' : 'generate',
        userInput: `${finalResearchQuestion.question} | audience:${audience}`,
        aiOutput: JSON.stringify(nextDraft),
        mode: 'standard',
        success: true,
        metadata: {
          outlineItems: nextDraft.outline.length,
          bibliographyItems: nextDraft.bibliography.length,
          audience,
        },
        createdAt: new Date().toISOString(),
      })
    } catch (err) {
      addInteraction({
        id: `interaction-${Date.now()}`,
        stage: 2,
        stepId: 'step9_explanation',
        stepLabel: t('workflow.step9_explanation.label'),
        promptId: 'step9',
        eventType: explanationDraft ? 'redo' : 'generate',
        userInput: `${finalResearchQuestion.question} | audience:${audience}`,
        aiOutput: err instanceof Error ? err.message : t('api.genericFailure'),
        mode: 'standard',
        success: false,
        metadata: {
          audience,
        },
        createdAt: new Date().toISOString(),
      })
      setError(err instanceof Error ? err.message : t('api.genericFailure'))
    } finally {
      setLoading(false)
    }
  }

  const handleQualityRating = (rating: number) => {
    setQualityRating(rating)
    if (!explanationDraft || !finalResearchQuestion?.question) return

    addInteraction({
      id: `interaction-${Date.now()}`,
      stage: 2,
      stepId: 'step9_explanation',
      stepLabel: t('workflow.step9_explanation.label'),
      promptId: 'step9',
      eventType: 'rate',
      userInput: finalResearchQuestion.question,
      aiOutput: explanationDraft.argumentCore,
      mode: 'standard',
      success: true,
      metadata: {
        rating,
        audience,
        bibliographyItems: explanationDraft.bibliography.length,
      },
      createdAt: new Date().toISOString(),
    })

    if (projectId) {
      void fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          stage: 2,
          stepId: 'step9_explanation',
          stepLabel: t('workflow.step9_explanation.label'),
          userInput: finalResearchQuestion.question,
          aiOutput: JSON.stringify({
            eventType: 'rate',
            rating,
            audience,
            bibliographyItems: explanationDraft.bibliography.length,
          }),
          topic,
          mode: 'standard',
          locale,
        }),
      }).catch(() => null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <StepHeader
          stepId="step9_explanation"
          title={t('steps.step5.title')}
          subtitle={t('steps.step5.intro')}
        />
      </div>

      {!canRun && (
        <div className="ai-needs-validation rounded-[var(--radius-md)] p-3 text-sm">
          {t('steps.step5.locked')}
        </div>
      )}

      {error && (
        <div className="ai-needs-validation rounded-[var(--radius-md)] p-3 text-sm">
          {error}
        </div>
      )}

      <div className="bg-[var(--surface_container_low)] p-4">
        <div className="mb-2 text-sm font-semibold text-[var(--on_surface)] opacity-70">{t('common.audience')}</div>
        <select
          value={audience}
          onChange={(event) => setAudience(event.target.value as 'expert' | 'general')}
          className="ghost-input inline-block w-auto"
        >
          <option value="expert">{t('steps.step5.expert')}</option>
          <option value="general">{t('steps.step5.general')}</option>
        </select>
      </div>

      <button
        onClick={buildExplanationDraft}
        disabled={!canRun || loading}
        className="primary-gradient rounded-[var(--radius-md)] px-4 py-3 text-[var(--on_primary)] transition hover:brightness-110 disabled:opacity-50"
      >
        {loading ? t('steps.step5.generating') : (explanationDraft ? t('steps.step5.redoButton') : t('steps.step5.generateButton'))}
      </button>

      {explanationDraft && (
        <div className="space-y-5 ai-user-decided rq-active-accent p-5">
          <QualityRating
            label={isPortuguese ? 'Como avalias esta explicação?' : 'How do you rate this explanation?'}
            helperText={isPortuguese ? 'Usa esta nota para registar se o scaffold está utilizável ou precisa de refazer.' : 'Use this to record whether the scaffold is usable or needs another pass.'}
            value={qualityRating}
            onChange={handleQualityRating}
          />

          <div>
            <div className="mb-2 font-label text-[10px] uppercase tracking-[0.12em] text-[var(--secondary)]">
              {t('steps.step5.outline')}
            </div>
            <ol className="space-y-2">
              {explanationDraft.outline.map((item, index) => (
                <li key={`${item}-${index}`} className="tonal-card ghost-border px-3 py-2 text-sm">
                  {index + 1}. {item}
                </li>
              ))}
            </ol>
          </div>

          <div>
            <div className="mb-2 font-label text-[10px] uppercase tracking-[0.12em] text-[var(--secondary)]">
              {t('steps.step5.argumentCore')}
            </div>
            <div className="tonal-card ghost-border p-4 text-sm text-[var(--on_surface)] text-justified">
              {explanationDraft.argumentCore}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 font-label text-[10px] uppercase tracking-[0.12em] text-[var(--secondary)]">
                {t('steps.step5.evidenceReferences')}
              </div>
              <ul className="space-y-2">
                {explanationDraft.evidenceReferences.map((reference) => (
                  <li key={reference} className="tonal-card ghost-border px-3 py-2 text-sm text-[var(--on_surface)]">
                    {reference}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="mb-2 font-label text-[10px] uppercase tracking-[0.12em] text-[var(--secondary)]">
                {t('steps.step5.openIssues')}
              </div>
              <ul className="space-y-2">
                {explanationDraft.openIssues.map((issue) => (
                  <li key={issue} className="tonal-card ghost-border px-3 py-2 text-sm text-[var(--on_surface)]">
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <div className="mb-2 font-label text-[10px] uppercase tracking-[0.12em] text-[var(--secondary)]">
              {isPortuguese ? 'Bibliografia completa' : 'Complete bibliography'}
            </div>
            <ul className="space-y-2">
              {explanationDraft.bibliography.map((entry) => (
                <li key={entry} className="tonal-card ghost-border px-3 py-2 text-sm text-[var(--on_surface)]">
                  {entry}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-2 font-label text-[10px] uppercase tracking-[0.12em] text-[var(--secondary)]">
              {isPortuguese ? 'Referências verificáveis (com links)' : 'Verifiable references (with links)'}
            </div>
            <ul className="space-y-2">
              {reviewedReferences.map((reference) => (
                <li key={reference.key} className="tonal-card ghost-border px-3 py-3 text-sm text-[var(--on_surface)]">
                  <div>{reference.citation}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    {reference.provider && (
                      <span className="bg-[var(--surface_container)] px-2 py-1 font-semibold text-[var(--on_surface)] opacity-70">
                        {reference.provider}
                      </span>
                    )}
                    {reference.articleUrl && (
                      <a
                        href={reference.articleUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-[var(--surface_container)] px-2 py-1 font-semibold text-[var(--on_surface)] hover:brightness-110"
                      >
                        {isPortuguese ? 'Abrir artigo' : 'Open article'}
                      </a>
                    )}
                    {reference.articleUrl && isLikelyPdf(reference.articleUrl) && (
                      <a
                        href={reference.articleUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-[var(--surface_container)] px-2 py-1 font-semibold text-[var(--on_surface)] hover:brightness-110"
                      >
                        {isPortuguese ? 'Baixar PDF' : 'Download PDF'}
                      </a>
                    )}
                    {reference.doiUrl && (
                      <a
                        href={reference.doiUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-[var(--surface_container)] px-2 py-1 font-semibold text-[var(--on_surface)] hover:brightness-110"
                      >
                        DOI
                      </a>
                    )}
                    {!reference.articleUrl && !reference.doiUrl && (
                      <span className="ai-needs-validation px-2 py-1 font-semibold text-sm">
                        {isPortuguese ? 'Sem link disponível nesta referência' : 'No link available for this reference'}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
