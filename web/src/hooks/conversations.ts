import { newId } from '../lib/id'
import type { AssistantMessage, Conversation, UserMessage } from '../lib/types'

export interface ConversationsState {
  conversations: Conversation[]
  activeId: string | null
}

export type ConversationsAction =
  | { type: 'new' }
  | { type: 'select'; id: string }
  | { type: 'delete'; id: string }
  | { type: 'clearAll' }
  | { type: 'rename'; id: string; title: string }
  | { type: 'ask'; conversationId: string; user: UserMessage; assistant: AssistantMessage }
  | { type: 'retry'; conversationId: string; assistantId: string }
  | {
      type: 'resolve'
      conversationId: string
      assistantId: string
      patch: Partial<AssistantMessage>
      sessionId?: string
    }

export const TITLE_MAX = 60

export function titleFrom(text: string): string {
  const oneLine = text.replace(/\s+/g, ' ').trim()
  return oneLine.length > TITLE_MAX ? `${oneLine.slice(0, TITLE_MAX - 1)}…` : oneLine
}

function emptyConversation(id = newId()): Conversation {
  const now = Date.now()
  return { id, title: 'New chat', sessionId: null, messages: [], createdAt: now, updatedAt: now }
}

function update(
  state: ConversationsState,
  id: string,
  fn: (c: Conversation) => Conversation,
): ConversationsState {
  return { ...state, conversations: state.conversations.map((c) => (c.id === id ? fn(c) : c)) }
}

export function conversationsReducer(
  state: ConversationsState,
  action: ConversationsAction,
): ConversationsState {
  switch (action.type) {
    case 'new': {
      // Reuse an untouched chat instead of stacking empty ones.
      const empty = state.conversations.find((c) => c.messages.length === 0)
      if (empty) return { ...state, activeId: empty.id }
      const conversation = emptyConversation()
      return { conversations: [conversation, ...state.conversations], activeId: conversation.id }
    }

    case 'select':
      return { ...state, activeId: action.id }

    case 'delete': {
      const conversations = state.conversations.filter((c) => c.id !== action.id)
      const activeId =
        state.activeId === action.id ? (conversations[0]?.id ?? null) : state.activeId
      return { conversations, activeId }
    }

    case 'clearAll':
      return { conversations: [], activeId: null }

    case 'rename':
      return update(state, action.id, (c) => ({ ...c, title: titleFrom(action.title) || c.title }))

    case 'ask': {
      // Asking with no chat open starts one under the id the caller chose.
      const base = state.conversations.some((c) => c.id === action.conversationId)
        ? state
        : { ...state, conversations: [emptyConversation(action.conversationId), ...state.conversations] }
      const next = update(base, action.conversationId, (c) => ({
        ...c,
        title: c.messages.length === 0 ? titleFrom(action.user.content) : c.title,
        messages: [...c.messages, action.user, action.assistant],
        updatedAt: action.user.createdAt,
      }))
      // Most recently used chat goes to the top of the sidebar.
      const touched = next.conversations.find((c) => c.id === action.conversationId)!
      return {
        activeId: action.conversationId,
        conversations: [touched, ...next.conversations.filter((c) => c.id !== action.conversationId)],
      }
    }

    case 'retry':
      return update(state, action.conversationId, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === action.assistantId && m.role === 'assistant'
            ? { ...m, status: 'pending', error: undefined, errorStatus: undefined, createdAt: Date.now() }
            : m,
        ),
      }))

    case 'resolve':
      return update(state, action.conversationId, (c) => ({
        ...c,
        sessionId: action.sessionId ?? c.sessionId,
        updatedAt: Date.now(),
        messages: c.messages.map((m) =>
          m.id === action.assistantId && m.role === 'assistant' ? { ...m, ...action.patch } : m,
        ),
      }))
  }
}

/**
 * Requests in flight when the page closed can never resolve, so on load they
 * become failed messages the user can retry.
 */
export function hydrate(state: ConversationsState): ConversationsState {
  return {
    ...state,
    conversations: state.conversations.map((c) => ({
      ...c,
      messages: c.messages.map((m) =>
        m.role === 'assistant' && m.status === 'pending'
          ? { ...m, status: 'error', error: 'This request was interrupted.' }
          : m,
      ),
    })),
  }
}
