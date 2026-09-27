import { AlertTriangle, CheckCircle2, KeyRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { decodeToken, isExpired } from '../lib/jwt'
import { Modal } from './Modal'

/** Mount only while open, so the draft always starts from the saved token. */
interface TokenDialogProps {
  initialToken: string | null
  /** Without a token the app can't do anything, so the dialog can't be dismissed. */
  dismissible: boolean
  onSave: (token: string) => void
  onClose: () => void
}

export function TokenDialog({ initialToken, dismissible, onSave, onClose }: TokenDialogProps) {
  const [value, setValue] = useState(initialToken ?? '')

  const trimmed = value.trim()
  const info = trimmed ? decodeToken(trimmed) : null
  const expired = info ? isExpired(info) : false
  const invalid = trimmed.length > 0 && info === null
  const canSave = info !== null && !expired

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (canSave) onSave(trimmed)
  }

  return (
    <Modal
      open
      onClose={dismissible ? onClose : undefined}
      title="Connect to the support API"
      description={
        <>
          Paste a JWT signed with the API&apos;s <code className="font-mono text-xs">JWT_SECRET</code>.
          Generate one locally with{' '}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
            make token
          </code>
          .
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="sr-only">Access token</span>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
            spellCheck={false}
            autoComplete="off"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
            aria-invalid={invalid || expired}
            className="w-full resize-none rounded-xl border border-zinc-300 bg-zinc-50 p-3 font-mono text-xs break-all text-zinc-800 placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:focus:bg-zinc-950"
          />
        </label>

        <div aria-live="polite" className="min-h-5 text-sm">
          {invalid && (
            <p className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="size-4 shrink-0" /> That doesn&apos;t look like a JWT.
            </p>
          )}
          {info && expired && (
            <p className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="size-4 shrink-0" /> This token has expired. Generate a new one.
            </p>
          )}
          {info && !expired && (
            <p className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>
                Signed in as <strong className="font-medium">{info.subject ?? 'unknown user'}</strong>
                {info.expiresAt && <> · expires {new Date(info.expiresAt).toLocaleString()}</>}
              </span>
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={!canSave}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <KeyRound className="size-4" /> Save token
          </button>
        </div>
      </form>
    </Modal>
  )
}
