export interface TokenInfo {
  subject: string | null
  /** Expiry as epoch milliseconds, or null when the token has no exp claim. */
  expiresAt: number | null
}

/**
 * Reads a JWT's claims for display only. The signature is not checked here;
 * the API verifies every token it receives.
 */
export function decodeToken(token: string): TokenInfo | null {
  const parts = token.trim().split('.')
  if (parts.length !== 3) return null
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const payload = JSON.parse(atob(padded))
    if (typeof payload !== 'object' || payload === null) return null
    return {
      subject: typeof payload.sub === 'string' ? payload.sub : null,
      expiresAt: typeof payload.exp === 'number' ? payload.exp * 1000 : null,
    }
  } catch {
    return null
  }
}

export function isExpired(info: TokenInfo, now = Date.now()): boolean {
  return info.expiresAt !== null && info.expiresAt <= now
}
