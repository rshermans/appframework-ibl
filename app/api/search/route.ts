import { NextResponse } from 'next/server'
import { searchScientificArticles, type SearchProvider } from '@/lib/search'
import { getMessage, normalizeLocale, type Locale } from '@/lib/i18n'

export async function POST(req: Request) {
  let locale: Locale = 'pt-PT'

  try {
    const body = await req.json()
    const query = String(body?.query || '').trim()
    const provider = (body?.provider || 'semantic_scholar') as SearchProvider
    const limit = Number(body?.limit || body?.pageSize || 5)
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

    const result = await searchScientificArticles({ query, limit, page, provider })

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
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      {
        ok: false,
        error: getMessage(locale, 'api.searchFailure'),
        details: message,
      },
      { status: 500 }
    )
  }
}
