import { NextResponse } from 'next/server'
import { searchScientificArticles, type SearchProvider } from '@/lib/search'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const query = String(body?.query || '').trim()
    const provider = (body?.provider || 'semantic_scholar') as SearchProvider
    const limit = Number(body?.limit || 5)

    if (!query) {
      return NextResponse.json(
        { ok: false, error: 'Missing query', details: 'Search query is required.' },
        { status: 400 }
      )
    }

    const result = await searchScientificArticles({ query, limit, provider })

    return NextResponse.json({
      ok: true,
      data: {
        query,
        provider: result.provider,
        articles: result.articles,
      },
      articles: result.articles,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to search articles',
        details: message,
      },
      { status: 500 }
    )
  }
}
