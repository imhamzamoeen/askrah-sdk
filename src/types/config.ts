/**
 * Configuration options for the AskRah SDK client
 */
export interface AskRahConfig {
  /**
   * Project identifier (e.g., "proj_abc123...")
   * Obtained from AskRah dashboard when creating a project
   */
  projectId: string

  /**
   * Signing secret (e.g., "sk_xyz789...")
   * Obtained from AskRah dashboard - keep secure, never expose to client
   */
  signingSecret: string

  /**
   * Base URL for the AskRah API
   * @default "https://askrah.com"
   */
  baseUrl?: string

  /**
   * JWT expiration time in seconds
   * Maximum allowed: 300 (5 minutes)
   * @default 300
   */
  tokenExpirySeconds?: number

  /**
   * Time in seconds before expiry to refresh the token
   * @default 60
   */
  tokenRefreshThreshold?: number

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number

  /**
   * Custom fetch implementation (useful for testing or special environments)
   * Must be compatible with the global fetch API
   */
  fetch?: typeof fetch
}
