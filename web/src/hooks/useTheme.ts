import { useCallback, useEffect, useState } from 'react'
import { readString, writeString } from '../lib/storage'

export type Theme = 'light' | 'dark'

function initialTheme(): Theme {
  const saved = readString('theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      writeString('theme', next)
      return next
    })
  }, [])

  return { theme, toggle }
}
