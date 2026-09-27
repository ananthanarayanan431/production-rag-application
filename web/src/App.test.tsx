import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '')
const TOKEN = `${b64({ alg: 'HS256' })}.${b64({ sub: 'tester', exp: 4_000_000_000 })}.sig`

function answer(overrides: object = {}) {
  return {
    response: 'Try a **force restart**.',
    session_id: 'server-session',
    request_id: 'req-12345678',
    faithfulness_score: 0.9,
    completeness_score: 0.8,
    validation_passed: true,
    model_used: 'google/gemini-2.5-pro',
    ...overrides,
  }
}

function respond(status: number, body: object) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }))
}

let queryResponses: Array<() => Promise<Response>>
let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  queryResponses = []
  fetchMock = vi.fn((url: string) =>
    url.endsWith('/health')
      ? respond(200, { status: 'ok', graph_ready: true })
      : (queryResponses.shift() ?? (() => respond(500, {})))(),
  )
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => vi.unstubAllGlobals())

function queryCalls() {
  return fetchMock.mock.calls
    .filter(([url]) => String(url).endsWith('/query'))
    .map(([, init]) => ({
      body: JSON.parse((init as RequestInit).body as string),
      auth: ((init as RequestInit).headers as Record<string, string>).Authorization,
    }))
}

async function connect() {
  const user = userEvent.setup()
  render(<App />)
  const dialog = await screen.findByRole('dialog')
  await user.type(within(dialog).getByRole('textbox'), TOKEN)
  await user.click(within(dialog).getByRole('button', { name: 'Save token' }))
  return user
}

describe('App', () => {
  it('asks for a token before chatting', async () => {
    render(<App />)
    expect(await screen.findByRole('dialog', { name: /connect/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
    expect(await screen.findByText('Online')).toBeInTheDocument()
  })

  it('sends a question and shows the validated answer', async () => {
    queryResponses.push(() => respond(200, answer()))
    const user = await connect()

    await user.type(screen.getByLabelText('Your question'), 'My phone is dead{Enter}')

    expect(await screen.findByText('force restart')).toBeInTheDocument()
    expect(screen.getByText('Verified answer')).toBeInTheDocument()
    expect(screen.getByText('gemini-2.5-pro')).toBeInTheDocument()
    expect(screen.getByRole('meter', { name: 'Grounding' })).toHaveAttribute('aria-valuetext', '90%')
    expect(within(screen.getByRole('complementary')).getByText('My phone is dead')).toBeInTheDocument()
    expect(queryCalls()).toEqual([{ body: { query: 'My phone is dead', session_id: null }, auth: `Bearer ${TOKEN}` }])
  })

  it('reuses the server session for follow-up questions', async () => {
    queryResponses.push(() => respond(200, answer()), () => respond(200, answer({ response: 'Second' })))
    const user = await connect()
    const input = screen.getByLabelText('Your question')

    await user.type(input, 'first{Enter}')
    await screen.findByText('force restart')
    await user.type(input, 'second{Enter}')
    await screen.findByText('Second')

    expect(queryCalls()[1].body).toEqual({ query: 'second', session_id: 'server-session' })
  })

  it('flags answers that failed validation', async () => {
    queryResponses.push(() => respond(200, answer({ validation_passed: false, faithfulness_score: 0.4 })))
    const user = await connect()

    await user.type(screen.getByLabelText('Your question'), 'q{Enter}')

    expect(await screen.findByText(/Unverified/)).toBeInTheDocument()
  })

  it('shows an error and retries it', async () => {
    queryResponses.push(() => respond(503, { detail: 'down' }), () => respond(200, answer()))
    const user = await connect()

    await user.type(screen.getByLabelText('Your question'), 'q{Enter}')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/temporarily unavailable/)

    await user.click(within(alert).getByRole('button', { name: /Retry/ }))

    expect(await screen.findByText('force restart')).toBeInTheDocument()
    expect(queryCalls().map((c) => c.body.query)).toEqual(['q', 'q'])
  })

  it('reopens the token dialog when the API rejects the token', async () => {
    queryResponses.push(() => respond(401, { detail: 'Unauthorized' }))
    const user = await connect()

    await user.type(screen.getByLabelText('Your question'), 'q{Enter}')

    expect(await screen.findByRole('dialog', { name: /connect/i })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/token/)
  })

  it('fills the composer from a suggested prompt', async () => {
    const user = await connect()
    await user.click(screen.getByRole('button', { name: /won’t turn on/ }))
    expect(screen.getByLabelText('Your question')).toHaveValue(
      'My device won’t turn on after an update. What should I try?',
    )
  })

  it('keeps conversations across reloads', async () => {
    queryResponses.push(() => respond(200, answer()))
    const user = await connect()
    await user.type(screen.getByLabelText('Your question'), 'remember me{Enter}')
    await screen.findByText('force restart')

    cleanup()
    render(<App />)

    await waitFor(() => expect(screen.getByText('force restart')).toBeInTheDocument())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
