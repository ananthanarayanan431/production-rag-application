import { useEffect, useRef } from 'react'
import type { Conversation } from '../lib/types'
import { AssistantBubble, UserBubble } from './Message'

interface MessageListProps {
  conversation: Conversation
  onRetry: (assistantId: string) => void
  onCancel: (assistantId: string) => void
  onUpdateToken: () => void
}

export function MessageList({ conversation, onRetry, onCancel, onUpdateToken }: MessageListProps) {
  const bottom = useRef<HTMLDivElement>(null)
  const last = conversation.messages.at(-1)
  const lastKey = last ? `${last.id}:${last.role === 'assistant' ? last.status : ''}` : ''

  // Follow new messages and answers as they arrive.
  useEffect(() => {
    bottom.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
  }, [conversation.id, lastKey])

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6" aria-live="polite">
      {conversation.messages.map((m) =>
        m.role === 'user' ? (
          <UserBubble key={m.id} message={m} />
        ) : (
          <AssistantBubble
            key={m.id}
            message={m}
            onRetry={() => onRetry(m.id)}
            onCancel={() => onCancel(m.id)}
            onUpdateToken={onUpdateToken}
          />
        ),
      )}
      <div ref={bottom} />
    </div>
  )
}
