import clsx from 'clsx'
import { ArrowUp } from 'lucide-react'
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { MAX_INPUT_CHARS } from '../lib/config'

export interface ComposerHandle {
  focus: () => void
  setValue: (value: string) => void
}

interface ComposerProps {
  onSend: (text: string) => void
  disabled?: boolean
  disabledReason?: string
}

const MAX_HEIGHT = 200

export const Composer = forwardRef<ComposerHandle, ComposerProps>(function Composer(
  { onSend, disabled = false, disabledReason },
  ref,
) {
  const [value, setValue] = useState('')
  const textarea = useRef<HTMLTextAreaElement>(null)

  useImperativeHandle(ref, () => ({
    focus: () => textarea.current?.focus(),
    setValue: (next) => {
      setValue(next)
      textarea.current?.focus()
    },
  }))

  // Grow with the content up to MAX_HEIGHT, then scroll.
  useLayoutEffect(() => {
    const el = textarea.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`
  }, [value])

  const length = value.length
  const tooLong = length > MAX_INPUT_CHARS
  const canSend = !disabled && value.trim().length > 0 && !tooLong

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    if (!canSend) return
    onSend(value)
    setValue('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Don't send while an IME composition (e.g. Japanese input) is being confirmed.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-3xl">
      <div
        className={clsx(
          'flex items-end gap-2 rounded-2xl border bg-white p-2 pl-4 shadow-sm transition-colors focus-within:shadow-md dark:bg-zinc-900',
          tooLong
            ? 'border-red-400 dark:border-red-700'
            : 'border-zinc-300 focus-within:border-brand-400 dark:border-zinc-700 dark:focus-within:border-brand-500',
        )}
      >
        <label htmlFor="composer" className="sr-only">
          Your question
        </label>
        <textarea
          id="composer"
          ref={textarea}
          value={value}
          rows={1}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={disabled && disabledReason ? disabledReason : 'Describe your issue…'}
          aria-describedby="composer-hint"
          aria-invalid={tooLong}
          className="max-h-[200px] min-h-6 flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-6 placeholder:text-zinc-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600"
        >
          <ArrowUp className="size-4" />
        </button>
      </div>
      <div id="composer-hint" className="mt-2 flex justify-between px-1 text-xs text-zinc-400 dark:text-zinc-500">
        <span>
          <kbd className="font-sans">Enter</kbd> to send · <kbd className="font-sans">Shift + Enter</kbd> for a new line
        </span>
        {length > MAX_INPUT_CHARS * 0.8 && (
          <span className={clsx('tabular-nums', tooLong && 'font-medium text-red-500')}>
            {length.toLocaleString()} / {MAX_INPUT_CHARS.toLocaleString()}
          </span>
        )}
      </div>
    </form>
  )
})
