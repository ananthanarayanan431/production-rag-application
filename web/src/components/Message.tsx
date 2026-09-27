import clsx from 'clsx'
import {
  AlertCircle,
  Bot,
  Clock,
  Cpu,
  Database,
  KeyRound,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Square,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { SCORE_THRESHOLD } from '../lib/config'
import { formatLatency, shortModel } from '../lib/format'
import type { AssistantMessage, UserMessage } from '../lib/types'
import { CopyButton } from './CopyButton'
import { Markdown } from './Markdown'
import { ScoreMeter } from './ScoreMeter'

export function UserBubble({ message }: { message: UserMessage }) {
  return (
    <div className="animate-fade-up flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap text-white shadow-sm">
        {message.content}
      </div>
    </div>
  )
}

interface AssistantBubbleProps {
  message: AssistantMessage
  onRetry: () => void
  onCancel: () => void
  onUpdateToken: () => void
}

export function AssistantBubble({ message, onRetry, onCancel, onUpdateToken }: AssistantBubbleProps) {
  return (
    <div className="animate-fade-up flex gap-3">
      <div
        className={clsx(
          'mt-0.5 grid size-8 shrink-0 place-items-center rounded-full',
          message.status === 'error'
            ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400'
            : 'bg-brand-100 text-brand-700 dark:bg-brand-700/20 dark:text-brand-400',
        )}
        aria-hidden="true"
      >
        <Bot className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        {message.status === 'pending' && <Pending since={message.createdAt} onCancel={onCancel} />}
        {message.status === 'error' && (
          <ErrorCard message={message} onRetry={onRetry} onUpdateToken={onUpdateToken} />
        )}
        {message.status === 'done' && (
          <>
            <Markdown>{message.content}</Markdown>
            <Details message={message} />
          </>
        )}
      </div>
    </div>
  )
}

function Pending({ since, onCancel }: { since: number; onCancel: () => void }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const seconds = Math.max(0, Math.floor((now - since) / 1000))

  return (
    <div className="flex items-center gap-3 py-1.5" role="status" aria-label="Assistant is responding">
      <span className="flex gap-1" aria-hidden="true">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="animate-dot size-2 rounded-full bg-brand-500"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
      <span className="text-sm text-zinc-500 dark:text-zinc-400">
        {seconds < 4 ? 'Thinking…' : `Researching your answer · ${seconds}s`}
      </span>
      <button
        type="button"
        onClick={onCancel}
        className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <Square className="size-3" /> Stop
      </button>
    </div>
  )
}

function ErrorCard({
  message,
  onRetry,
  onUpdateToken,
}: {
  message: AssistantMessage
  onRetry: () => void
  onUpdateToken: () => void
}) {
  const unauthorized = message.errorStatus === 401
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
    >
      <p className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        {message.error ?? 'Something went wrong.'}
      </p>
      <div className="mt-2 flex gap-2 pl-6">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-red-700 shadow-sm ring-1 ring-red-200 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:ring-red-900 dark:hover:bg-red-900/60"
        >
          <RotateCcw className="size-3" /> Retry
        </button>
        {unauthorized && (
          <button
            type="button"
            onClick={onUpdateToken}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-900/60"
          >
            <KeyRound className="size-3" /> Update token
          </button>
        )}
      </div>
    </div>
  )
}

function Details({ message }: { message: AssistantMessage }) {
  const meta = message.meta
  if (!meta) return null
  const cached = meta.model_used === 'cache'

  return (
    <div className="mt-3 space-y-2.5 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="flex flex-wrap items-center gap-2">
        {meta.validation_passed ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            <ShieldCheck className="size-3.5" /> Verified answer
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-400"
            title="The answer scored below the grounding or completeness threshold. Double-check important details."
          >
            <ShieldAlert className="size-3.5" /> Unverified — double-check details
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          {cached ? <Database className="size-3.5" /> : <Cpu className="size-3.5" />}
          {cached ? 'Cached answer' : shortModel(meta.model_used)}
        </span>
        {message.latencyMs !== undefined && (
          <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            <Clock className="size-3.5" /> {formatLatency(message.latencyMs)}
          </span>
        )}
        <span className="ml-auto flex">
          <CopyButton text={message.content} label="Copy answer" />
          <CopyButton text={meta.request_id} label="Copy request ID for support">
            <span className="hidden font-mono sm:inline">{meta.request_id.slice(0, 8)}</span>
          </CopyButton>
        </span>
      </div>
      {!cached && (
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <ScoreMeter
            label="Grounding"
            score={meta.faithfulness_score}
            threshold={SCORE_THRESHOLD}
            hint="How well every claim is supported by the retrieved support documents."
          />
          <ScoreMeter
            label="Completeness"
            score={meta.completeness_score}
            threshold={SCORE_THRESHOLD}
            hint="Whether the answer covers every part of your question."
          />
        </div>
      )}
    </div>
  )
}
