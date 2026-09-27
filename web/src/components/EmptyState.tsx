import { ArrowUpRight, LifeBuoy } from 'lucide-react'
import { SUGGESTED_PROMPTS } from '../lib/config'

export function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-500/25">
        <LifeBuoy className="size-7" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">How can we help today?</h1>
      <p className="mt-2 max-w-md text-zinc-500 dark:text-zinc-400">
        Ask about a device, an account or a repair. Every answer is checked against our support
        documentation.
      </p>
      <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPick(prompt)}
            className="group flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-left text-sm text-zinc-700 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-brand-700"
          >
            {prompt}
            <ArrowUpRight className="size-4 shrink-0 text-zinc-400 transition group-hover:text-brand-600" />
          </button>
        ))}
      </div>
    </div>
  )
}
