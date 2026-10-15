import { afterEach, describe, expect, it, vi } from 'vitest'
import { safeFetch } from '@/lib/safeFetch'
import { aiActivity } from '@/lib/aiActivity'
import { aiFail, aiOk, jsonResponse } from '../helpers'

afterEach(() => vi.restoreAllMocks())
const body = JSON.stringify({ promptId: 'x' })

describe('safeFetch patience', () => {
  it('retries /api/ai after a gateway timeout and returns the later success', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(aiFail('Request timeout after 25000ms', 504))
      .mockResolvedValueOnce(aiOk({ ok: 1 }))
    const { response, json } = await safeFetch('/api/ai', { method: 'POST', body })
    expect(spy).toHaveBeenCalledTimes(2)
    expect(response.ok).toBe(true)
    expect(json.ok).toBe(true)
    expect(aiActivity.get().active).toBe(0) // spinner cleared
  })

  it('retries on non-JSON gateway pages and dropped connections', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('<html>Gateway Timeout</html>', { status: 504, headers: { 'content-type': 'text/html' } }))
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(aiOk({ ok: 1 }))
    const { json } = await safeFetch('/api/ai', { method: 'POST', body })
    expect(spy).toHaveBeenCalledTimes(3)
    expect(json.ok).toBe(true)
  })

  it('gives up after 3 attempts and returns the last failure', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => aiFail('Request timeout', 504))
    const { response } = await safeFetch('/api/ai', { method: 'POST', body })
    expect(spy).toHaveBeenCalledTimes(3)
    expect(response.status).toBe(504)
  })

  it('never retries client errors', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ ok: false, error: 'bad' }, 400))
    await safeFetch('/api/ai', { method: 'POST', body })
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('retries /api/search once', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => jsonResponse({ ok: false }, 503))
    await safeFetch('/api/search', { method: 'POST', body: '{}' })
    expect(spy).toHaveBeenCalledTimes(2)
  })
})
