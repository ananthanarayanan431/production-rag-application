import { useCallback, useMemo, useState } from 'react'
import { decodeToken, type TokenInfo } from '../lib/jwt'
import { readString, writeString } from '../lib/storage'

export function useToken() {
  const [token, setTokenState] = useState<string | null>(() => readString('token'))

  const setToken = useCallback((value: string | null) => {
    const next = value?.trim() || null
    writeString('token', next)
    setTokenState(next)
  }, [])

  const info: TokenInfo | null = useMemo(() => (token ? decodeToken(token) : null), [token])

  return { token, info, setToken }
}
