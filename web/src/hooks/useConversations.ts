import { useCallback, useEffect, useLayoutEffect, useReducer, useRef } from 'react'
import { ApiError, isAbortError, sendQuery } from '../lib/api'
import { newId } from '../lib/id'
import { readJson, writeJson } from '../lib/storage'
import type { AssistantMessage, Conversation, UserMessage } from '../lib/types'
import { conversationsReducer, hydrate, type ConversationsState } from './conversations'

const STORAGE_KEY = 'conversations'

function load(): ConversationsState {
  const saved = readJson<ConversationsState | null>(STORAGE_KEY, null)
  if (!saved || !Array.isArray(saved.conversations)) return { conversations: [], activeId: null }
  return hydrate(saved)
}

interface Options {
  token: string | null
  onUnauthorized: () => void
}

export function useConversations({ token, onUnauthorized }: Options) {
  const [state, dispatch] = useReducer(conversationsReducer, undefined, load)
  // One controller per pending assistant message, so each request can be cancelled.
  const controllers = useRef(new Map<string, AbortController>())
  // Read the latest state inside async callbacks without re-creating them.
  const stateRef = useRef(state)
  useLayoutEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => writeJson(STORAGE_KEY, state), [state])

  useEffect(() => {
    const pending = controllers.current
    return () => pending.forEach((c) => c.abort())
  }, [])

  const active: Conversation | null =
    state.conversations.find((c) => c.id === state.activeId) ?? null

  const run = useCallback(
    async (conversationId: string, assistantId: string, query: string) => {
      if (!token) {
        onUnauthorized()
        return
      }
      const controller = new AbortController()
      controllers.current.set(assistantId, controller)
      const started = performance.now()
      const sessionId =
        stateRef.current.conversations.find((c) => c.id === conversationId)?.sessionId ?? null

      try {
        const res = await sendQuery({ query, session_id: sessionId }, token, controller.signal)
        const { response, session_id, ...meta } = res
        dispatch({
          type: 'resolve',
          conversationId,
          assistantId,
          sessionId: session_id,
          patch: {
            status: 'done',
            content: response,
            meta,
            latencyMs: Math.round(performance.now() - started),
          },
        })
      } catch (err) {
        const message = isAbortError(err)
          ? 'Request cancelled.'
          : err instanceof Error
            ? err.message
            : 'Something went wrong.'
        const status = err instanceof ApiError ? err.status : undefined
        dispatch({
          type: 'resolve',
          conversationId,
          assistantId,
          patch: { status: 'error', error: message, errorStatus: status },
        })
        if (status === 401) onUnauthorized()
      } finally {
        controllers.current.delete(assistantId)
      }
    },
    [token, onUnauthorized],
  )

  const ask = useCallback(
    (text: string) => {
      const query = text.trim()
      if (!query) return

      const { conversations, activeId } = stateRef.current
      const conversationId =
        conversations.find((c) => c.id === activeId)?.id ??
        conversations.find((c) => c.messages.length === 0)?.id ??
        newId()

      const now = Date.now()
      const user: UserMessage = { id: newId(), role: 'user', content: query, createdAt: now }
      const assistant: AssistantMessage = {
        id: newId(),
        role: 'assistant',
        status: 'pending',
        content: '',
        createdAt: now,
        replyTo: user.id,
      }
      dispatch({ type: 'ask', conversationId, user, assistant })
      void run(conversationId, assistant.id, query)
    },
    [run],
  )

  const retry = useCallback(
    (conversationId: string, assistantId: string) => {
      const conversation = stateRef.current.conversations.find((c) => c.id === conversationId)
      const assistant = conversation?.messages.find((m) => m.id === assistantId)
      if (!assistant || assistant.role !== 'assistant') return
      const user = conversation?.messages.find((m) => m.id === assistant.replyTo)
      if (!user) return
      dispatch({ type: 'retry', conversationId, assistantId })
      void run(conversationId, assistantId, user.content)
    },
    [run],
  )

  const cancel = useCallback((assistantId: string) => {
    controllers.current.get(assistantId)?.abort()
  }, [])

  return {
    conversations: state.conversations,
    active,
    ask,
    retry,
    cancel,
    newChat: useCallback(() => dispatch({ type: 'new' }), []),
    select: useCallback((id: string) => dispatch({ type: 'select', id }), []),
    remove: useCallback(
      (id: string) => {
        stateRef.current.conversations
          .find((c) => c.id === id)
          ?.messages.forEach((m) => controllers.current.get(m.id)?.abort())
        dispatch({ type: 'delete', id })
      },
      [],
    ),
    rename: useCallback((id: string, title: string) => dispatch({ type: 'rename', id, title }), []),
    clearAll: useCallback(() => {
      controllers.current.forEach((c) => c.abort())
      dispatch({ type: 'clearAll' })
    }, []),
  }
}
