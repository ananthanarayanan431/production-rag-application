import type { HealthResponse, QueryRequest, QueryResponse } from './types'

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** Messages for the statuses the API returns on purpose; anything else gets a generic one. */
const STATUS_MESSAGES: Record<number, string> = {
  401: 'Your access token is missing, invalid or expired.',
  403: 'This request was flagged by the safety filter and rejected.',
  429: 'Too many requests. Please wait a moment and try again.',
  503: 'The assistant is temporarily unavailable. Please try again shortly.',
}

async function errorFromResponse(res: Response): Promise<ApiError> {
  let detail: string | undefined
  try {
    const body = await res.json()
    if (typeof body?.detail === 'string') detail = body.detail
  } catch {
    // Non-JSON error body (e.g. a proxy error page); fall back to the status message.
  }
  // 400s carry a useful validation message; the rest are better explained by status.
  const message =
    (res.status === 400 && detail) ||
    STATUS_MESSAGES[res.status] ||
    detail ||
    `Request failed with status ${res.status}.`
  return new ApiError(res.status, message)
}

/** Checked by name: DOMException's class differs between browsers, Node and jsdom. */
export function isAbortError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { name?: unknown }).name === 'AbortError'
}

export async function sendQuery(
  request: QueryRequest,
  token: string,
  signal?: AbortSignal,
): Promise<QueryResponse> {
  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
      signal,
    })
  } catch (err) {
    if (isAbortError(err)) throw err
    throw new ApiError(0, 'Could not reach the server. Check that the API is running.')
  }

  if (!res.ok) throw await errorFromResponse(res)
  return (await res.json()) as QueryResponse
}

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE_URL}/health`, { signal })
  if (!res.ok) throw await errorFromResponse(res)
  return (await res.json()) as HealthResponse
}
