import { describe, expect, it } from 'vitest'
import type { AssistantMessage, UserMessage } from '../lib/types'
import { conversationsReducer as reduce, hydrate, titleFrom, type ConversationsState } from './conversations'

const empty: ConversationsState = { conversations: [], activeId: null }

function turn(text: string) {
  const user: UserMessage = { id: `u-${text}`, role: 'user', content: text, createdAt: 1 }
  const assistant: AssistantMessage = {
    id: `a-${text}`,
    role: 'assistant',
    status: 'pending',
    content: '',
    createdAt: 1,
    replyTo: user.id,
  }
  return { user, assistant }
}

describe('conversationsReducer', () => {
  it('starts a chat when asking with none open', () => {
    const state = reduce(empty, { type: 'ask', conversationId: 'c1', ...turn('Hello there') })

    expect(state.activeId).toBe('c1')
    expect(state.conversations).toHaveLength(1)
    expect(state.conversations[0].title).toBe('Hello there')
    expect(state.conversations[0].messages).toHaveLength(2)
  })

  it('keeps the first question as the title and moves the chat to the top', () => {
    let state = reduce(empty, { type: 'ask', conversationId: 'c1', ...turn('first') })
    state = reduce(state, { type: 'ask', conversationId: 'c2', ...turn('other') })
    state = reduce(state, { type: 'ask', conversationId: 'c1', ...turn('second') })

    expect(state.conversations.map((c) => c.id)).toEqual(['c1', 'c2'])
    expect(state.conversations[0].title).toBe('first')
    expect(state.conversations[0].messages).toHaveLength(4)
  })

  it('reuses an empty chat instead of creating another', () => {
    const once = reduce(empty, { type: 'new' })
    const twice = reduce(once, { type: 'new' })
    expect(twice.conversations).toHaveLength(1)
    expect(twice.activeId).toBe(once.activeId)
  })

  it('stores the server session id on resolve', () => {
    let state = reduce(empty, { type: 'ask', conversationId: 'c1', ...turn('q') })
    state = reduce(state, {
      type: 'resolve',
      conversationId: 'c1',
      assistantId: 'a-q',
      sessionId: 'server-session',
      patch: { status: 'done', content: 'answer' },
    })

    const [conversation] = state.conversations
    expect(conversation.sessionId).toBe('server-session')
    expect(conversation.messages[1]).toMatchObject({ status: 'done', content: 'answer' })
  })

  it('resets a failed message to pending on retry', () => {
    let state = reduce(empty, { type: 'ask', conversationId: 'c1', ...turn('q') })
    state = reduce(state, {
      type: 'resolve',
      conversationId: 'c1',
      assistantId: 'a-q',
      patch: { status: 'error', error: 'boom' },
    })
    state = reduce(state, { type: 'retry', conversationId: 'c1', assistantId: 'a-q' })

    expect(state.conversations[0].messages[1]).toMatchObject({ status: 'pending', error: undefined })
  })

  it('selects the next chat when the active one is deleted', () => {
    let state = reduce(empty, { type: 'ask', conversationId: 'c1', ...turn('a') })
    state = reduce(state, { type: 'ask', conversationId: 'c2', ...turn('b') })
    state = reduce(state, { type: 'delete', id: 'c2' })

    expect(state.activeId).toBe('c1')
    expect(reduce(state, { type: 'delete', id: 'c1' })).toEqual(empty)
  })
})

describe('hydrate', () => {
  it('marks requests interrupted by a reload as failed', () => {
    const state = reduce(empty, { type: 'ask', conversationId: 'c1', ...turn('q') })
    expect(hydrate(state).conversations[0].messages[1]).toMatchObject({ status: 'error' })
  })
})

describe('titleFrom', () => {
  it('collapses whitespace and truncates', () => {
    expect(titleFrom('  a\n\nb  ')).toBe('a b')
    expect(titleFrom('x'.repeat(100))).toHaveLength(60)
  })
})
