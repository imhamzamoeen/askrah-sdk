import type {
  RefHandlerConfig,
  RefHandler,
  RefCookieResult,
  SignedRefPayload,
} from './types'
import {
  signCookieValue,
  verifyCookieValue,
  serializeSetCookie,
  serializeClearCookie,
  parseCookieHeader,
} from './cookie'

const DEFAULT_COOKIE_NAME = 'askrah_ref'
const DEFAULT_MAX_AGE = 30 * 24 * 60 * 60 // 30 days
const DEFAULT_PATH = '/'
const DEFAULT_SAME_SITE = 'Lax' as const
const DEFAULT_SECURE = true

const REF_CODE_PATTERN = /^[A-Za-z0-9_-]{4,32}$/

/**
 * Create request handlers for server-side referral cookie management.
 *
 * Returns { POST, DELETE } handlers using Web-standard Request/Response.
 * Mount these at your chosen API route (e.g., /api/askrah/ref).
 *
 * @example
 * ```typescript
 * // Next.js App Router
 * import { createRefHandler } from '@askrah/sdk/server'
 *
 * const handler = createRefHandler({
 *   signingSecret: process.env.ASKRAH_SIGNING_SECRET!,
 * })
 *
 * export const POST = handler.POST
 * export const DELETE = handler.DELETE
 * ```
 */
export function createRefHandler(config: RefHandlerConfig): RefHandler {
  if (!config.signingSecret || !config.signingSecret.startsWith('sk_')) {
    throw new Error(
      '[AskRah] Invalid signingSecret: must start with "sk_". ' +
        'Get this from your AskRah dashboard.'
    )
  }

  const cookieName = config.cookieName ?? DEFAULT_COOKIE_NAME
  const maxAge = config.cookieMaxAge ?? DEFAULT_MAX_AGE
  const path = config.cookiePath ?? DEFAULT_PATH
  const sameSite = config.cookieSameSite ?? DEFAULT_SAME_SITE
  const secure = config.cookieSecure ?? DEFAULT_SECURE
  const domain = config.cookieDomain
  const debug = config.debug ?? false

  function log(...args: unknown[]): void {
    if (debug) console.log('[AskRah Server]', ...args)
  }

  function jsonResponse(
    body: Record<string, unknown>,
    status: number,
    headers?: Record<string, string>
  ): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    })
  }

  async function POST(request: Request): Promise<Response> {
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      log('Invalid JSON body')
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    const refCode = body.ref_code
    if (typeof refCode !== 'string' || !REF_CODE_PATTERN.test(refCode)) {
      log('Invalid ref_code:', refCode)
      return jsonResponse(
        { error: 'Invalid ref_code: must be 4-32 alphanumeric characters' },
        400
      )
    }

    const clickId =
      typeof body.click_id === 'string' ? body.click_id : undefined

    const payload: SignedRefPayload = {
      ref: refCode,
      ts: Math.floor(Date.now() / 1000),
    }
    if (clickId) {
      payload.cid = clickId
    }

    const cookieValue = await signCookieValue(payload, config.signingSecret)

    const setCookieHeader = serializeSetCookie(cookieName, cookieValue, {
      maxAge,
      path,
      domain,
      secure,
      sameSite,
      httpOnly: true,
    })

    log('Setting ref cookie for:', refCode)

    return jsonResponse({ success: true }, 200, {
      'Set-Cookie': setCookieHeader,
    })
  }

  async function DELETE(_request: Request): Promise<Response> {
    const clearHeader = serializeClearCookie(cookieName, path, domain)

    log('Clearing ref cookie')

    return jsonResponse({ success: true }, 200, {
      'Set-Cookie': clearHeader,
    })
  }

  return { POST, DELETE }
}

/**
 * Read and verify the referral code from the request's cookies.
 *
 * Call this server-side when a user signs up to extract the
 * tamper-proof ref code from the HttpOnly cookie.
 *
 * @param request - The incoming Web-standard Request
 * @param signingSecret - The same signing secret used in createRefHandler
 * @param cookieName - Cookie name (default: "askrah_ref")
 * @param maxAgeSeconds - Max age for validity check (default: 30 days)
 * @returns The verified ref data, or null if no valid cookie
 *
 * @example
 * ```typescript
 * import { getRefFromRequest } from '@askrah/sdk/server'
 *
 * const ref = await getRefFromRequest(request, process.env.ASKRAH_SIGNING_SECRET!)
 * if (ref) {
 *   await askrah.recordSignup({
 *     refCode: ref.refCode,
 *     externalUserId: user.id,
 *   })
 * }
 * ```
 */
export async function getRefFromRequest(
  request: Request,
  signingSecret: string,
  cookieName: string = DEFAULT_COOKIE_NAME,
  maxAgeSeconds: number = DEFAULT_MAX_AGE
): Promise<RefCookieResult | null> {
  const cookieHeader = request.headers.get('cookie')
  const cookieValue = parseCookieHeader(cookieHeader, cookieName)

  if (!cookieValue) {
    return null
  }

  const payload = await verifyCookieValue(
    cookieValue,
    signingSecret,
    maxAgeSeconds
  )
  if (!payload) {
    return null
  }

  return {
    refCode: payload.ref,
    clickId: payload.cid ?? null,
    timestamp: payload.ts,
  }
}
