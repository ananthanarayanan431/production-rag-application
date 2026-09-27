import clsx from 'clsx'
import { formatPercent } from '../lib/format'

interface ScoreMeterProps {
  label: string
  score: number
  threshold?: number
  hint: string
}

export function ScoreMeter({ label, score, threshold = 0.7, hint }: ScoreMeterProps) {
  const ok = score >= threshold
  return (
    <div className="flex min-w-32 flex-1 items-center gap-2" title={hint}>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={score}
        aria-valuetext={formatPercent(score)}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
      >
        <div
          className={clsx('h-full rounded-full transition-[width] duration-500', ok ? 'bg-emerald-500' : 'bg-amber-500')}
          style={{ width: formatPercent(score) }}
        />
      </div>
      <span className="w-9 text-right text-xs font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
        {formatPercent(score)}
      </span>
    </div>
  )
}
