import clsx from 'clsx'
import { Check, LifeBuoy, MessageSquare, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { formatRelative } from '../lib/format'
import type { Conversation } from '../lib/types'

interface SidebarProps {
  conversations: Conversation[]
  activeId: string | null
  open: boolean
  onClose: () => void
  onNew: () => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
  onClearAll: () => void
}

export function Sidebar({
  conversations,
  activeId,
  open,
  onClose,
  onNew,
  onSelect,
  onDelete,
  onRename,
  onClearAll,
}: SidebarProps) {
  const [confirmClear, setConfirmClear] = useState(false)
  const history = conversations.filter((c) => c.messages.length > 0)

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={clsx(
          'fixed inset-0 z-30 bg-zinc-950/40 backdrop-blur-sm transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        aria-label="Conversations"
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-zinc-200 bg-zinc-50 transition-transform duration-200 lg:static lg:translate-x-0 dark:border-zinc-800 dark:bg-zinc-900',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
              <LifeBuoy className="size-4" />
            </div>
            <span className="font-semibold tracking-tight">Support Bot</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-200 lg:hidden dark:hover:bg-zinc-800"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-3">
          <button
            type="button"
            onClick={onNew}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            <Plus className="size-4" /> New chat
          </button>
        </div>

        <nav className="mt-4 flex-1 overflow-y-auto px-3 pb-3">
          <h2 className="px-2 pb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Recent
          </h2>
          {history.length === 0 ? (
            <p className="px-2 text-sm text-zinc-400 dark:text-zinc-500">Your conversations will appear here.</p>
          ) : (
            <ul className="space-y-0.5">
              {history.map((c) => (
                <ConversationItem
                  key={c.id}
                  conversation={c}
                  active={c.id === activeId}
                  onSelect={() => onSelect(c.id)}
                  onDelete={() => onDelete(c.id)}
                  onRename={(title) => onRename(c.id, title)}
                />
              ))}
            </ul>
          )}
        </nav>

        {history.length > 0 && (
          <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
            {confirmClear ? (
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">Delete all chats?</span>
                <span className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="rounded-lg px-2 py-1 text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClearAll()
                      setConfirmClear(false)
                    }}
                    className="rounded-lg bg-red-600 px-2 py-1 font-medium text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <Trash2 className="size-4" /> Clear history
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  )
}

interface ConversationItemProps {
  conversation: Conversation
  active: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (title: string) => void
}

function ConversationItem({ conversation, active, onSelect, onDelete, onRename }: ConversationItemProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(conversation.title)

  const save = (e: FormEvent) => {
    e.preventDefault()
    onRename(draft)
    setEditing(false)
  }

  if (editing) {
    return (
      <li>
        <form onSubmit={save} className="flex items-center gap-1 rounded-lg bg-white p-1 ring-1 ring-brand-400 dark:bg-zinc-800">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
            aria-label="Chat title"
            className="min-w-0 flex-1 bg-transparent px-1.5 text-sm focus:outline-none"
          />
          <button type="submit" aria-label="Save title" className="rounded p-1 text-brand-600 hover:bg-zinc-100 dark:hover:bg-zinc-700">
            <Check className="size-4" />
          </button>
        </form>
      </li>
    )
  }

  return (
    <li className="group relative">
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? 'page' : undefined}
        className={clsx(
          'flex w-full items-start gap-2.5 rounded-lg px-2 py-2 pr-16 text-left text-sm transition-colors',
          active
            ? 'bg-white font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700'
            : 'text-zinc-600 hover:bg-zinc-200/70 dark:text-zinc-300 dark:hover:bg-zinc-800/70',
        )}
      >
        <MessageSquare className="mt-0.5 size-4 shrink-0 text-zinc-400" />
        <span className="min-w-0 flex-1">
          <span className="block truncate">{conversation.title}</span>
          <span className="block text-xs font-normal text-zinc-400 dark:text-zinc-500">
            {formatRelative(conversation.updatedAt)}
          </span>
        </span>
      </button>
      <span className="absolute top-1.5 right-1.5 flex opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <button
          type="button"
          onClick={() => {
            setDraft(conversation.title)
            setEditing(true)
          }}
          aria-label={`Rename ${conversation.title}`}
          className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${conversation.title}`}
          className="rounded-md p-1.5 text-zinc-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
        >
          <Trash2 className="size-3.5" />
        </button>
      </span>
    </li>
  )
}
