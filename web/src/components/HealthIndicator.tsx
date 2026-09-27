import clsx from 'clsx'
import type { HealthStatus } from '../hooks/useHealth'

const LABELS: Record<HealthStatus, string> = {
  checking: 'Connecting…',
  online: 'Online',
  starting: 'Starting up',
  offline: 'API offline',
}

export function HealthIndicator({ status }: { status: HealthStatus }) {
  return (
    <span
      role="status"
      title={status === 'offline' ? 'Start the API with `make api`' : undefined}
      className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-300"
    >
      <span className="relative flex size-2">
        {status === 'online' && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        )}
        <span
          className={clsx('relative inline-flex size-2 rounded-full', {
            'bg-emerald-500': status === 'online',
            'bg-amber-500': status === 'starting' || status === 'checking',
            'bg-red-500': status === 'offline',
          })}
        />
      </span>
      {LABELS[status]}
    </span>
  )
}
