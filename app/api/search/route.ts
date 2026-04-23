import { NextResponse } from 'next/server'
import { searchScientificArticles, isSearchProvider, type SearchProvider } from '@/lib/search'
import { getMessage, normalizeLocale, type Locale } from '@/lib/i18n'
import { withTimeout, TimeoutError, isAbortedError } from '@/lib/timeoutHelper'

export async function POST(req: Request) {
  const startTime = Date.now()
  let locale: Locale = 'pt-PT'

  try {
    const body = await req.json()
    const query = String(body?.query || '').trim()
    const requestedProvider = String(body?.provider || 'crossref').trim().toLowerCase()
    if (!isSearchProvider(requestedProvider)) {
      return NextResponse.json(
        {
          ok: false,
          error: getMessage(locale, 'api.searchFailure'),
          details: `Unsupported provider: ${requestedProvider}`,
          supportedProviders: ['crossref', 'openaire', 'semantic_scholar', 'arxiv', 'pubmed'],
        },
        { status: 400 }
      )
    }

    const provider: SearchProvider = requestedProvider
    const limit = Number(body?.limit || body?.pageSize || 20)
    const page = Number(body?.page || 1)
    locale = normalizeLocale(body?.locale)

    if (!query) {
      return NextResponse.json(
        {
          ok: false,
          error: getMessage(locale, 'api.missingQuery'),
          details: getMessage(locale, 'api.missingQuery'),
        },
        { status: 400 }
      )
    }

    // Timeout for search operations (28s to leave buffer)
    const result = await withTimeout(
      searchScientificArticles({ query, limit, page, provider }),
      { timeoutMs: 28000 }
    )

    const responseTime = Date.now() - startTime
    console.log(`[Search API] Query completed in ${responseTime}ms`)

    return NextResponse.json({
      ok: true,
      data: {
        query,
        provider: result.provider,
        page: result.pagination.page,
        pageSize: result.pagination.pageSize,
        totalResults: result.pagination.totalResults,
        hasNextPage: result.pagination.hasNextPage,
        pagination: result.pagination,
        articles: result.articles,
      },
      page: result.pagination.page,
      pageSize: result.pagination.pageSize,
      totalResults: result.pagination.totalResults,
      hasNextPage: result.pagination.hasNextPage,
      articles: result.articles,
    })
  } catch (error) {
    const isTimeout = error instanceof TimeoutError || isAbortedError(error)
    const statusCode = isTimeout ? 504 : 500
    const message = error instanceof Error ? error.message : String(error)
    const responseTime = Date.now() - startTime

    console.error(`[Search API] ${isTimeout ? 'TIMEOUT' : 'ERROR'} (${responseTime}ms): ${message}`)

    return NextResponse.json(
      {
        ok: false,
        error: isTimeout ? 'Search timeout' : getMessage(locale, 'api.searchFailure'),
        details: message,
        responseTime,
      },
      { status: statusCode }
    )
  }
}
