export function formatPercent(score: number): string {
  return `${Math.round(Math.max(0, Math.min(1, score)) * 100)}%`
}

export function formatLatency(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

export function formatRelative(timestamp: number, now = Date.now()): string {
  const minutes = Math.round((timestamp - now) / 60_000)
  if (Math.abs(minutes) < 1) return 'just now'
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour')
  return relative.format(Math.round(hours / 24), 'day')
}

/** Strips an OpenRouter provider prefix: "google/gemini-2.5-pro" → "gemini-2.5-pro". */
export function shortModel(model: string): string {
  return model.includes('/') ? model.slice(model.indexOf('/') + 1) : model
}
