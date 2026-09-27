import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, sendQuery } from './api'

function mockFetch(response: Response | { reject: unknown }) {
  const fn = vi.fn(() =>
    response instanceof Response ? Promise.resolve(response) : Promise.reject(response.reject),
  )
  vi.stubGlobal('fetch', fn)
  return fn
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

afterEach(() => vi.unstubAllGlobals())

describe('sendQuery', () => {
  it('posts the query with a bearer token', async () => {
    const fetchMock = mockFetch(
      json(200, {
        response: 'hi',
        session_id: 's1',
        request_id: 'r1',
        faithfulness_score: 1,
        completeness_score: 1,
        validation_passed: true,
        model_used: 'm',
      }),
    )

    const result = await sendQuery({ query: 'hello', session_id: 's1' }, 'tok')

    expect(result.session_id).toBe('s1')
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/query')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
    expect(JSON.parse(init.body as string)).toEqual({ query: 'hello', session_id: 's1' })
  })

  it('surfaces the API detail for validation errors', async () => {
    mockFetch(json(400, { detail: 'query must not be empty' }))
    await expect(sendQuery({ query: ' ' }, 'tok')).rejects.toMatchObject({
      status: 400,
      message: 'query must not be empty',
    })
  })

  it.each([
    [401, /token/],
    [403, /safety filter/],
    [429, /Too many requests/],
    [503, /temporarily unavailable/],
  ])('maps status %i to a friendly message', async (status, message) => {
    mockFetch(json(status, { detail: 'raw' }))
    const err = await sendQuery({ query: 'q' }, 'tok').catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(status)
    expect(err.message).toMatch(message)
  })

  it('handles non-JSON error bodies', async () => {
    mockFetch(new Response('<html>Bad Gateway</html>', { status: 502 }))
    await expect(sendQuery({ query: 'q' }, 'tok')).rejects.toMatchObject({
      status: 502,
      message: 'Request failed with status 502.',
    })
  })

  it('reports network failures as status 0', async () => {
    mockFetch({ reject: new TypeError('Failed to fetch') })
    await expect(sendQuery({ query: 'q' }, 'tok')).rejects.toMatchObject({ status: 0 })
  })

  it('rethrows aborts untouched', async () => {
    mockFetch({ reject: new DOMException('aborted', 'AbortError') })
    await expect(sendQuery({ query: 'q' }, 'tok')).rejects.toHaveProperty('name', 'AbortError')
  })
})
