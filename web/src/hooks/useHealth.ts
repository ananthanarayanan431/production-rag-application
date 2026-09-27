import { useEffect, useState } from 'react'
import { getHealth } from '../lib/api'
import { HEALTH_POLL_MS } from '../lib/config'

export type HealthStatus = 'checking' | 'online' | 'starting' | 'offline'

export function useHealth(): HealthStatus {
  const [status, setStatus] = useState<HealthStatus>('checking')

  useEffect(() => {
    let controller: AbortController | null = null

    const check = async () => {
      controller?.abort()
      controller = new AbortController()
      try {
        const health = await getHealth(controller.signal)
        setStatus(health.graph_ready ? 'online' : 'starting')
      } catch (err) {
        if ((err as { name?: string }).name !== 'AbortError') setStatus('offline')
      }
    }

    void check()
    const timer = window.setInterval(check, HEALTH_POLL_MS)
    // Re-check straight away when the user comes back to the tab.
    const onVisible = () => document.visibilityState === 'visible' && void check()
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      controller?.abort()
    }
  }, [])

  return status
}
