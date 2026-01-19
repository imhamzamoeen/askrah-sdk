import { SignJWT, decodeJwt } from 'jose'

/**
 * JWT Manager interface for generating and caching tokens
 */
export interface JWTManager {
  /**
   * Get a valid JWT token, generating a new one if needed
   */
  getToken(): Promise<string>

  /**
   * Invalidate the cached token, forcing a new one to be generated
   */
  invalidateToken(): void
}

/**
 * Create a JWT manager that handles token generation and caching
 *
 * @param projectId - The project identifier (sub claim)
 * @param signingSecret - The secret used to sign the JWT
 * @param expirySeconds - Token expiry in seconds (max 300)
 * @param refreshThreshold - Seconds before expiry to refresh
 */
export function createJWTManager(
  projectId: string,
  signingSecret: string,
  expirySeconds: number = 300,
  refreshThreshold: number = 60
): JWTManager {
  let cachedToken: string | null = null
  let tokenExpiresAt: number | null = null

  const generateToken = async (): Promise<string> => {
    const secret = new TextEncoder().encode(signingSecret)

    const token = await new SignJWT({ sub: projectId })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime(`${expirySeconds}s`)
      .sign(secret)

    // Cache the token and its expiry
    cachedToken = token
    const payload = decodeJwt(token)
    tokenExpiresAt = (payload.exp as number) * 1000 // Convert to milliseconds

    return token
  }

  const isTokenValid = (): boolean => {
    if (!cachedToken || !tokenExpiresAt) {
      return false
    }
    // Check if token will expire within the refresh threshold
    const now = Date.now()
    const expiresIn = tokenExpiresAt - now
    return expiresIn > refreshThreshold * 1000
  }

  return {
    async getToken(): Promise<string> {
      if (isTokenValid() && cachedToken) {
        return cachedToken
      }
      return generateToken()
    },

    invalidateToken(): void {
      cachedToken = null
      tokenExpiresAt = null
    },
  }
}
