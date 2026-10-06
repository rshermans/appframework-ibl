'use client'

import { useEffect, useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import type { SearchArticle } from '@/types/research-workflow'
import { useI18n } from '@/components/I18nProvider'
import { safeFetch } from '@/lib/safeFetch'
import { persistInteractionEvent } from '@/lib/interactionClient'
import { buildRelatedQueryCandidates, uniqueProviders, type Provider } from '@/lib/evidenceHelpers'

/** "Fetch new related article": tries several providers/queries and merges new results. */
export function useRelatedArticles(onError: (message: string) => void) {
  const { locale, t } = useI18n()
  const {
    addInteraction,
    finalResearchQuestion,
    projectId,
    selectedSearchArticleIds,
    searchArticles,
    searchDesign,
    setSelectedSearchArticleIds,
    setSearchArticles,
    topic,
  } = useWizardStore()
  const isPortuguese = locale === 'pt-PT'
  const setError = onError
  const [relatedLoading, setRelatedLoading] = useState(false)
  const [relatedProvider, setRelatedProvider] = useState<Provider>('crossref')
  const [relatedQueryInput, setRelatedQueryInput] = useState('')
  const [relatedPageByProvider, setRelatedPageByProvider] = useState<Record<Provider, number>>({
    semantic_scholar: 1,
    crossref: 1,
    openaire: 1,
    arxiv: 1,
    pubmed: 1,
  })
  const [relatedFeedback, setRelatedFeedback] = useState('')

  useEffect(() => {
    const firstProvider = searchArticles.find(
      (article) =>
        article.provider === 'semantic_scholar' ||
        article.provider === 'crossref' ||
        article.provider === 'openaire' ||
        article.provider === 'arxiv' ||
        article.provider === 'pubmed'
    )?.provider

    if (
      firstProvider === 'semantic_scholar' ||
      firstProvider === 'crossref' ||
      firstProvider === 'openaire' ||
      firstProvider === 'arxiv' ||
      firstProvider === 'pubmed'
    ) {
      setRelatedProvider(firstProvider)
    }
  }, [searchArticles])

  useEffect(() => {
    setRelatedPageByProvider({
      semantic_scholar: searchArticles.some((article) => article.provider === 'semantic_scholar') ? 2 : 1,
      crossref: searchArticles.some((article) => article.provider === 'crossref') ? 2 : 1,
      openaire: searchArticles.some((article) => article.provider === 'openaire') ? 2 : 1,
      arxiv: searchArticles.some((article) => article.provider === 'arxiv') ? 2 : 1,
      pubmed: searchArticles.some((article) => article.provider === 'pubmed') ? 2 : 1,
    })
    setRelatedFeedback('')
  }, [searchArticles, searchDesign?.booleanQuery])

  const requestRelatedCandidates = async (
    provider: Provider,
    query: string,
    page: number
  ): Promise<{ page: number; hasNextPage: boolean; articles: SearchArticle[] }> => {
    const { response, json: payload } = await safeFetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        provider,
        page,
        limit: 20,
        locale,
      }),
    })
    const data = payload?.data ?? payload

    if (!response.ok || !payload?.ok) {
      throw new Error((payload?.details || payload?.error || t('api.searchFailure')) as string)
    }

    return {
      page: typeof data.page === 'number' ? data.page : page,
      hasNextPage: Boolean(data.hasNextPage),
      articles: Array.isArray(data.articles) ? (data.articles as SearchArticle[]) : [],
    }
  }

  const fetchRelatedArticles = async () => {
    if (!searchDesign?.booleanQuery) {
      setError(t('steps.step3.noRetrievedArticles'))
      return
    }

    setRelatedLoading(true)
    setRelatedFeedback('')
    setError('')

    try {
      const providerCandidates = uniqueProviders(relatedProvider)
      const queryCandidates = buildRelatedQueryCandidates(
        searchDesign.booleanQuery,
        finalResearchQuestion?.question,
        searchArticles,
        relatedQueryInput
      )
      const existingIds = new Set(searchArticles.map((article) => article.id))
      const providerStatus: string[] = []
      let addedArticles: SearchArticle[] = []

      for (const providerCandidate of providerCandidates) {
        let providerAddedCount = 0
        let providerSucceeded = false

        for (let queryIndex = 0; queryIndex < queryCandidates.length; queryIndex += 1) {
          let pageToTry = relatedPageByProvider[providerCandidate] ?? 1

          for (let attempt = 0; attempt < 2; attempt += 1) {
            let result: { page: number; hasNextPage: boolean; articles: SearchArticle[] }
            try {
              result = await requestRelatedCandidates(
                providerCandidate,
                queryCandidates[queryIndex],
                pageToTry
              )
              providerSucceeded = true
            } catch {
              providerStatus.push(
                isPortuguese
                  ? `${providerCandidate}: falha de chamada`
                  : `${providerCandidate}: request failed`
              )
              break
            }

            setRelatedPageByProvider((current) => ({
              ...current,
              [providerCandidate]: result.page + 1,
            }))

            const deduped = result.articles.filter((article) => !existingIds.has(article.id))
            if (deduped.length > 0) {
              providerAddedCount += deduped.length
              deduped.forEach((article) => existingIds.add(article.id))
              addedArticles = [...addedArticles, ...deduped]
            }

            if (!result.hasNextPage) {
              break
            }

            pageToTry = result.page + 1
          }

          if (providerAddedCount > 0) break
        }

        if (providerAddedCount > 0) {
          providerStatus.push(
            isPortuguese
              ? `${providerCandidate}: +${providerAddedCount}`
              : `${providerCandidate}: +${providerAddedCount}`
          )
        } else if (providerSucceeded) {
          providerStatus.push(
            isPortuguese
              ? `${providerCandidate}: sem novos resultados`
              : `${providerCandidate}: no new results`
          )
        }
      }

      if (addedArticles.length > 0) {
        setSearchArticles([...searchArticles, ...addedArticles])
        setSelectedSearchArticleIds(
          Array.from(new Set([...selectedSearchArticleIds, ...addedArticles.map((article) => article.id)]))
        )
        addInteraction({
          id: `interaction-${Date.now()}`,
          stage: 1,
          stepId: 'step3_evidence_extraction',
          stepLabel: t('workflow.step3_evidence_extraction.label'),
          eventType: 'retrieve',
          userInput: queryCandidates.join(' || '),
          aiOutput: providerStatus.join(' | '),
          success: true,
          metadata: {
            addedArticles: addedArticles.length,
            preferredProvider: relatedProvider,
          },
          createdAt: new Date().toISOString(),
        })
        if (projectId) {
          void persistInteractionEvent({
            projectId,
            stage: 1,
            stepId: 'step3_evidence_extraction',
            stepLabel: t('workflow.step3_evidence_extraction.label'),
            userInput: queryCandidates.join(' || '),
            aiOutput: JSON.stringify({
              eventType: 'retrieve',
              providerStatus,
              addedArticles: addedArticles.length,
              preferredProvider: relatedProvider,
              customQuery: relatedQueryInput.trim() || null,
            }),
            topic,
            mode: 'standard',
            locale,
          }).catch(() => null)
        }
        setRelatedFeedback(
          isPortuguese
            ? `${addedArticles.length} novo(s) artigo(s) relacionado(s) adicionado(s). ${providerStatus.join(' | ')}`
            : `${addedArticles.length} new related article(s) added. ${providerStatus.join(' | ')}`
        )
      } else {
        setRelatedFeedback(
          isPortuguese
            ? `Nao encontrei novos artigos reutilizaveis. ${providerStatus.join(' | ')}`
            : `No reusable new articles were found. ${providerStatus.join(' | ')}`
        )
      }
    } catch (err) {
      addInteraction({
        id: `interaction-${Date.now()}`,
        stage: 1,
        stepId: 'step3_evidence_extraction',
        stepLabel: t('workflow.step3_evidence_extraction.label'),
        eventType: 'retrieve',
        userInput: searchDesign.booleanQuery,
        aiOutput: err instanceof Error ? err.message : t('api.searchFailure'),
        success: false,
        metadata: {
          preferredProvider: relatedProvider,
        },
        createdAt: new Date().toISOString(),
      })
      if (projectId) {
        void persistInteractionEvent({
          projectId,
          stage: 1,
          stepId: 'step3_evidence_extraction',
          stepLabel: t('workflow.step3_evidence_extraction.label'),
          userInput: searchDesign.booleanQuery,
          aiOutput: JSON.stringify({
            eventType: 'retrieve',
            error: err instanceof Error ? err.message : t('api.searchFailure'),
            preferredProvider: relatedProvider,
            customQuery: relatedQueryInput.trim() || null,
          }),
          topic,
          mode: 'standard',
          locale,
        }).catch(() => null)
      }
      setError(err instanceof Error ? err.message : t('api.searchFailure'))
    } finally {
      setRelatedLoading(false)
    }
  }

  return {
    relatedLoading,
    relatedProvider,
    setRelatedProvider,
    relatedQueryInput,
    setRelatedQueryInput,
    relatedFeedback,
    fetchRelatedArticles,
  }
}
