'use client'

import { useEffect, useRef, useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import type { SearchArticle } from '@/types/research-workflow'
import { useI18n } from '@/components/I18nProvider'
import { safeFetch } from '@/lib/safeFetch'
import {
  PROVIDER_SEQUENCE,
  describeProviderFailure,
  mergeUniqueArticles,
  providerLabel,
  type Provider,
} from '@/lib/searchProviders'

/** Multi-provider article retrieval with paging, "load all" and selection helpers. */
export function useSearchRetrieval(setError: (message: string) => void) {
  const { locale, t } = useI18n()
  const {
    searchDesign,
    searchArticles,
    selectedSearchArticleIds,
    setSearchArticles,
    setSelectedSearchArticleIds,
  } = useWizardStore()
  const isPortuguese = locale === 'pt-PT'
  const [searchLoading, setSearchLoading] = useState(false)
  const [provider, setProvider] = useState<Provider>('crossref')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalResults, setTotalResults] = useState<number | undefined>(undefined)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [retrievalNotice, setRetrievalNotice] = useState('')
  const articlesRef = useRef<SearchArticle[]>(searchArticles)

  useEffect(() => {
    articlesRef.current = searchArticles
  }, [searchArticles])

  const runRetrieval = async (
    query: string,
    requestedPage: number = 1,
    forcedProvider?: Provider,
    options: { replaceExisting?: boolean } = {}
  ): Promise<{ page: number; hasNextPage: boolean } | null> => {
    setSearchLoading(true)
    setError('')

    try {
      const effectiveProvider = forcedProvider ?? provider
      const { response, json: payload } = await safeFetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          limit: pageSize,
          page: requestedPage,
          provider: effectiveProvider,
          locale,
        }),
      })
      const data = payload?.data ?? payload

      if (!response.ok || !payload?.ok) {
        throw new Error((payload?.details || payload?.error || t('api.searchFailure')) as string)
      }

      const incomingArticles = Array.isArray(data.articles) ? data.articles : []
      const nextArticles = options.replaceExisting
        ? incomingArticles
        : mergeUniqueArticles(articlesRef.current, incomingArticles)

      setSearchArticles(nextArticles)
      articlesRef.current = nextArticles
      setPage(typeof data.page === 'number' ? data.page : requestedPage)
      setHasNextPage(Boolean(data.hasNextPage))
      setTotalResults(typeof data.totalResults === 'number' ? data.totalResults : undefined)
      return {
        page: typeof data.page === 'number' ? data.page : requestedPage,
        hasNextPage: Boolean(data.hasNextPage),
      }
    } catch (err) {
      setTotalResults(undefined)
      setHasNextPage(false)
      setError(err instanceof Error ? err.message : t('api.searchFailure'))
      return null
    } finally {
      setSearchLoading(false)
    }
  }

  const runRetrievalAcrossProviders = async (
    query: string,
    requestedPage: number = 1,
    options: { replaceExisting?: boolean } = {}
  ): Promise<void> => {
    setSearchLoading(true)
    setError('')
    setRetrievalNotice('')

    try {
      // All providers in parallel: a slow or rate-limited one no longer delays the others.
      const outcomes = await Promise.all(
        PROVIDER_SEQUENCE.map(async (providerCandidate) => {
          try {
            const { response, json: payload } = await safeFetch('/api/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query,
                limit: pageSize,
                page: requestedPage,
                provider: providerCandidate,
                locale,
              }),
            })
            const data = payload?.data ?? payload
            if (!response.ok || !payload?.ok) {
              return {
                provider: providerCandidate,
                articles: [] as SearchArticle[],
                failure: describeProviderFailure(String(payload?.details || payload?.error || ''), response.status, isPortuguese),
              }
            }
            return {
              provider: providerCandidate,
              articles: (Array.isArray(data.articles) ? data.articles : []) as SearchArticle[],
              failure: null as string | null,
            }
          } catch (error) {
            return {
              provider: providerCandidate,
              articles: [] as SearchArticle[],
              failure: describeProviderFailure(error instanceof Error ? error.message : '', undefined, isPortuguese),
            }
          }
        })
      )

      let mergedArticles = options.replaceExisting ? [] : articlesRef.current
      for (const outcome of outcomes) {
        mergedArticles = mergeUniqueArticles(mergedArticles, outcome.articles)
      }
      const failures = outcomes.filter((outcome) => outcome.failure)

      setSearchArticles(mergedArticles)
      articlesRef.current = mergedArticles
      setPage(requestedPage)
      setHasNextPage(false)
      setTotalResults(mergedArticles.length)

      if (failures.length === PROVIDER_SEQUENCE.length) {
        throw new Error(
          isPortuguese
            ? 'Todos os fornecedores falharam nesta tentativa.'
            : 'All providers failed in this attempt.'
        )
      }

      if (failures.length > 0) {
        const detail = failures.map((outcome) => `${providerLabel(outcome.provider)} (${outcome.failure})`).join('; ')
        setRetrievalNotice(
          isPortuguese
            ? `Resultados de ${PROVIDER_SEQUENCE.length - failures.length} de ${PROVIDER_SEQUENCE.length} fornecedores. Sem resposta: ${detail}.`
            : `Results from ${PROVIDER_SEQUENCE.length - failures.length} of ${PROVIDER_SEQUENCE.length} providers. No response: ${detail}.`
        )
      }
    } catch (err) {
      setTotalResults(undefined)
      setHasNextPage(false)
      setError(err instanceof Error ? err.message : t('api.searchFailure'))
    } finally {
      setSearchLoading(false)
    }
  }

  const changeProvider = async (nextProvider: Provider) => {
    setProvider(nextProvider)
    if (!searchDesign?.booleanQuery) return
    await runRetrieval(searchDesign.booleanQuery, 1, nextProvider)
  }

  const selectAllLoadedArticles = () => {
    const allIds = Array.from(new Set([...selectedSearchArticleIds, ...searchArticles.map((article) => article.id)]))
    setSelectedSearchArticleIds(allIds)
  }

  const loadMoreResults = async () => {
    if (!searchDesign?.booleanQuery || searchLoading || !hasNextPage) return
    await runRetrieval(searchDesign.booleanQuery, page + 1)
  }

  const loadAllRemainingResults = async () => {
    if (!searchDesign?.booleanQuery || searchLoading || bulkLoading || !hasNextPage) return

    setBulkLoading(true)
    let nextPage = page + 1
    let shouldContinue: boolean = hasNextPage
    let safetyCounter = 0

    while (shouldContinue && safetyCounter < 100) {
      const result = await runRetrieval(searchDesign.booleanQuery, nextPage)
      if (!result) break
      shouldContinue = result.hasNextPage
      nextPage = result.page + 1
      safetyCounter += 1
    }

    setBulkLoading(false)
  }

  return {
    searchLoading,
    provider,
    page,
    pageSize,
    setPageSize,
    totalResults,
    hasNextPage,
    bulkLoading,
    retrievalNotice,
    runRetrieval,
    runRetrievalAcrossProviders,
    changeProvider,
    selectAllLoadedArticles,
    loadMoreResults,
    loadAllRemainingResults,
  }
}
