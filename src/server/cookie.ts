import { base64url } from 'jose'
import type { SignedRefPayload } from './types'

const ALGORITHM = { name: 'HMAC', hash: 'SHA-256' } as const

async function importKey(secret: string): Promise<CryptoKey> {
  const keyData = new TextEncoder().encode(secret)
  return crypto.subtle.importKey('raw', keyData, ALGORITHM, false, [
    'sign',
    'verify',
  ])
}

/**
 * Sign a referral payload and produce the cookie value string.
 *
 * Format: base64url(json_payload).base64url(hmac_signature)
 */
export async function signCookieValue(
  payload: SignedRefPayload,
  secret: string
): Promise<string> {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(payload))
  const encodedPayload = base64url.encode(jsonBytes)

  const key = await importKey(secret)
  const payloadBytes = new TextEncoder().encode(encodedPayload)
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, payloadBytes)
  const encodedSignature = base64url.encode(new Uint8Array(signatureBuffer))

  return `${encodedPayload}.${encodedSignature}`
}

/**
 * Verify a signed cookie value and extract the payload.
 *
 * Returns null if the cookie is malformed, tampered, or expired.
 */
export async function verifyCookieValue(
  cookieValue: string,
  secret: string,
  maxAgeSeconds: number
): Promise<SignedRefPayload | null> {
  const dotIndex = cookieValue.indexOf('.')
  if (
    dotIndex === -1 ||
    dotIndex === 0 ||
    dotIndex === cookieValue.length - 1
  ) {
    return null
  }

  const encodedPayload = cookieValue.substring(0, dotIndex)
  const encodedSignature = cookieValue.substring(dotIndex + 1)

  let signatureBytes: Uint8Array
  try {
    signatureBytes = base64url.decode(encodedSignature)
  } catch {
    return null
  }

  const key = await importKey(secret)
  const payloadBytes = new TextEncoder().encode(encodedPayload)

  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    signatureBytes.buffer as ArrayBuffer,
    payloadBytes
  )
  if (!valid) {
    return null
  }

  let payload: SignedRefPayload
  try {
    const jsonBytes = base64url.decode(encodedPayload)
    const jsonString = new TextDecoder().decode(jsonBytes)
    payload = JSON.parse(jsonString)
  } catch {
    return null
  }

  if (
    typeof payload.ref !== 'string' ||
    !payload.ref ||
    typeof payload.ts !== 'number'
  ) {
    return null
  }

  const nowSeconds = Math.floor(Date.now() / 1000)
  if (nowSeconds - payload.ts > maxAgeSeconds) {
    return null
  }

  return payload
}

/**
 * Serialize a Set-Cookie header value.
 */
export function serializeSetCookie(
  name: string,
  value: string,
  options: {
    maxAge: number
    path: string
    domain?: string
    secure: boolean
    sameSite: 'Strict' | 'Lax' | 'None'
    httpOnly: boolean
  }
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path}`,
    `Max-Age=${options.maxAge}`,
    `SameSite=${options.sameSite}`,
  ]

  if (options.httpOnly) parts.push('HttpOnly')
  if (options.secure) parts.push('Secure')
  if (options.domain) parts.push(`Domain=${options.domain}`)

  return parts.join('; ')
}

/**
 * Serialize a Set-Cookie header that clears (expires) a cookie.
 */
export function serializeClearCookie(
  name: string,
  path: string,
  domain?: string
): string {
  const parts = [
    `${name}=`,
    `Path=${path}`,
    `Max-Age=0`,
    `Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
  ]
  if (domain) parts.push(`Domain=${domain}`)
  return parts.join('; ')
}

/**
 * Parse a Cookie header and extract a named cookie value.
 */
export function parseCookieHeader(
  cookieHeader: string | null,
  name: string
): string | null {
  if (!cookieHeader) return null

  const cookies = cookieHeader.split(';')
  for (const cookie of cookies) {
    const [cookieName, ...rest] = cookie.trim().split('=')
    if (cookieName?.trim() === name) {
      const value = rest.join('=').trim()
      try {
        return decodeURIComponent(value)
      } catch {
        return value
      }
    }
  }
  return null
}
