import { KeyRound, Menu, Moon, Sun } from 'lucide-react'
import type { HealthStatus } from '../hooks/useHealth'
import type { Theme } from '../hooks/useTheme'
import type { TokenInfo } from '../lib/jwt'
import { HealthIndicator } from './HealthIndicator'

interface HeaderProps {
  title: string
  health: HealthStatus
  theme: Theme
  tokenInfo: TokenInfo | null
  onToggleTheme: () => void
  onOpenSidebar: () => void
  onOpenToken: () => void
}

export function Header({ title, health, theme, tokenInfo, onToggleTheme, onOpenSidebar, onOpenToken }: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-zinc-200 px-3 sm:px-4 dark:border-zinc-800">
      <button
        type="button"
        onClick={onOpenSidebar}
        aria-label="Open sidebar"
        className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 lg:hidden dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <Menu className="size-5" />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-700 dark:text-zinc-200">{title}</h1>
      <HealthIndicator status={health} />
      <button
        type="button"
        onClick={onOpenToken}
        title={tokenInfo?.subject ? `Signed in as ${tokenInfo.subject}` : 'Set access token'}
        className="inline-flex items-center gap-1.5 rounded-lg p-2 text-sm text-zinc-600 hover:bg-zinc-100 sm:px-2.5 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <KeyRound className="size-4" />
        <span className="hidden max-w-32 truncate sm:inline">{tokenInfo?.subject ?? 'Token'}</span>
      </button>
      <button
        type="button"
        onClick={onToggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>
    </header>
  )
}
