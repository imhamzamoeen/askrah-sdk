import {
  AskRahError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServerError,
  NetworkError,
  TimeoutError,
} from '../errors'
import type { ApiResponse } from '../types/responses'

export interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: Record<string, unknown>
  timeout?: number
}

/**
 * Make an HTTP request to the AskRah API
 *
 * @param url - The full URL to request
 * @param token - JWT bearer token
 * @param options - Request options
 * @param fetchFn - Fetch implementation (defaults to global fetch)
 */
export async function request<T>(
  url: string,
  token: string,
  options: RequestOptions,
  fetchFn: typeof fetch = fetch
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = options.timeout
    ? setTimeout(() => controller.abort(), options.timeout)
    : undefined

  try {
    const response = await fetchFn(url, {
      method: options.method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    })

    let data: ApiResponse<T>
    try {
      data = await response.json()
    } catch {
      throw new ServerError('Invalid JSON response from server')
    }

    if (!response.ok || !data.success) {
      throw createErrorFromResponse(response.status, data.error)
    }

    return data.data as T
  } catch (error) {
    if (error instanceof AskRahError) {
      throw error
    }
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new TimeoutError()
      }
      throw new NetworkError(`Network request failed: ${error.message}`)
    }
    throw new NetworkError('Unknown network error')
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

/**
 * Create a typed error from an HTTP response
 */
function createErrorFromResponse(status: number, message?: string): AskRahError {
  const errorMessage = message || 'Unknown error'

  switch (status) {
    case 400:
      return new ValidationError(errorMessage)
    case 401:
    case 403:
      return new AuthenticationError(errorMessage)
    case 404:
      return new NotFoundError(errorMessage)
    case 409:
      return new ConflictError(errorMessage)
    case 429:
      return new RateLimitError(errorMessage)
    case 500:
    case 502:
    case 503:
    case 504:
      return new ServerError(errorMessage)
    default:
      return new AskRahError(errorMessage, 'UNKNOWN_ERROR', status)
  }
}
