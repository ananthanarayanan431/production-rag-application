import { useCallback, useRef, useState } from 'react'
import { Composer, type ComposerHandle } from './components/Composer'
import { EmptyState } from './components/EmptyState'
import { Header } from './components/Header'
import { MessageList } from './components/MessageList'
import { Sidebar } from './components/Sidebar'
import { TokenDialog } from './components/TokenDialog'
import { useConversations } from './hooks/useConversations'
import { useHealth } from './hooks/useHealth'
import { useTheme } from './hooks/useTheme'
import { useToken } from './hooks/useToken'

export default function App() {
  const { token, info, setToken } = useToken()
  const [tokenOpen, setTokenOpen] = useState(() => !token)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, toggle } = useTheme()
  const health = useHealth()
  const composer = useRef<ComposerHandle>(null)

  const openToken = useCallback(() => setTokenOpen(true), [])
  const chat = useConversations({ token, onUnauthorized: openToken })
  const active = chat.active
  const hasMessages = (active?.messages.length ?? 0) > 0
  const busy = active?.messages.some((m) => m.role === 'assistant' && m.status === 'pending') ?? false

  const closeSidebarThen = (fn: () => void) => () => {
    fn()
    setSidebarOpen(false)
    composer.current?.focus()
  }

  return (
    <div className="flex h-full">
      <Sidebar
        conversations={chat.conversations}
        activeId={active?.id ?? null}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNew={closeSidebarThen(chat.newChat)}
        onSelect={(id) => closeSidebarThen(() => chat.select(id))()}
        onDelete={chat.remove}
        onRename={chat.rename}
        onClearAll={chat.clearAll}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <Header
          title={hasMessages ? active!.title : 'New chat'}
          health={health}
          theme={theme}
          tokenInfo={info}
          onToggleTheme={toggle}
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenToken={openToken}
        />

        <div className="flex flex-1 flex-col overflow-y-auto">
          {hasMessages && active ? (
            <MessageList
              conversation={active}
              onRetry={(id) => chat.retry(active.id, id)}
              onCancel={chat.cancel}
              onUpdateToken={openToken}
            />
          ) : (
            <EmptyState onPick={(prompt) => composer.current?.setValue(prompt)} />
          )}
        </div>

        <div className="shrink-0 bg-gradient-to-t from-white via-white to-transparent px-4 pt-2 pb-4 dark:from-zinc-950 dark:via-zinc-950">
          <Composer
            ref={composer}
            onSend={chat.ask}
            disabled={!token || busy}
            disabledReason={!token ? 'Add an access token to start chatting' : 'Waiting for the answer…'}
          />
          <p className="mx-auto mt-1 max-w-3xl px-1 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
            AI answers can be wrong. Check important details with an agent.
          </p>
        </div>
      </main>

      {tokenOpen && (
        <TokenDialog
          initialToken={token}
          dismissible={Boolean(token)}
          onSave={(value) => {
            setToken(value)
            setTokenOpen(false)
          }}
          onClose={() => setTokenOpen(false)}
        />
      )}
    </div>
  )
}
