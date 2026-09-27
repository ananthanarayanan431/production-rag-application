import { describe, expect, it } from 'vitest'
import { decodeToken, isExpired } from './jwt'

function token(payload: object): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`
}

describe('decodeToken', () => {
  it('reads subject and expiry', () => {
    expect(decodeToken(token({ sub: 'user-1', exp: 2_000_000_000 }))).toEqual({
      subject: 'user-1',
      expiresAt: 2_000_000_000_000,
    })
  })

  it('tolerates missing claims', () => {
    expect(decodeToken(token({}))).toEqual({ subject: null, expiresAt: null })
  })

  it.each(['', 'not-a-jwt', 'a.b.c', 'a.!!!.c'])('returns null for %j', (value) => {
    expect(decodeToken(value)).toBeNull()
  })
})

describe('isExpired', () => {
  it('compares expiry to now', () => {
    expect(isExpired({ subject: null, expiresAt: 1_000 }, 2_000)).toBe(true)
    expect(isExpired({ subject: null, expiresAt: 3_000 }, 2_000)).toBe(false)
    expect(isExpired({ subject: null, expiresAt: null }, 2_000)).toBe(false)
  })
})
