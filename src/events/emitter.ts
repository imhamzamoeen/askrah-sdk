import type { AskRahConfig } from '../types/config'
import { AskRahClient } from '../client'
import type {
  AskRahEventType,
  AskRahEventPayloads,
  AskRahEventListener,
  SignupEventPayload,
  ConversionEventPayload,
  PaymentEventPayload,
  RefundEventPayload,
  SubscriptionEventPayload,
  SubscriptionCreatedPayload,
  SubscriptionUpdatedPayload,
  SubscriptionCancelledPayload,
  DisputeEventPayload,
} from './types'

/**
 * Configuration for AskRah Events
 */
export interface AskRahEventsConfig extends AskRahConfig {
  /**
   * Whether to throw errors or just log them
   * @default false
   */
  throwOnError?: boolean

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean
}

/**
 * AskRah Event Emitter
 *
 * Fire-and-forget event handling for referral tracking.
 * Just emit events and the SDK handles the rest.
 *
 * @example
 * ```typescript
 * import { AskRahEvents } from '@askrah/sdk/events';
 *
 * const askrah = new AskRahEvents({
 *   projectId: 'proj_xxx',
 *   signingSecret: 'sk_xxx'
 * });
 *
 * // When user signs up with a referral
 * await askrah.emit('signup', {
 *   userId: user.id,
 *   email: user.email,
 *   refCode: 'abc123'
 * });
 *
 * // When user makes a payment
 * await askrah.emit('payment', {
 *   userId: user.id,
 *   amountCents: 9900,
 *   planName: 'Pro'
 * });
 *
 * // When user gets a refund
 * await askrah.emit('refund', {
 *   userId: user.id,
 *   amountCents: 9900,
 *   originalEventId: 'evt_xxx'
 * });
 *
 * // Subscription events
 * await askrah.emit('subscription.created', {
 *   userId: user.id,
 *   planName: 'Pro'
 * });
 *
 * // Dispute/chargeback
 * await askrah.emit('dispute.created', {
 *   userId: user.id,
 *   amountCents: 9900
 * });
 * ```
 */
export class AskRahEvents {
  private client: AskRahClient
  private config: AskRahEventsConfig
  private listeners: Map<AskRahEventType, Set<AskRahEventListener<AskRahEventType>>>

  constructor(config: AskRahEventsConfig) {
    this.config = {
      throwOnError: false,
      debug: false,
      ...config,
    }
    this.client = new AskRahClient(config)
    this.listeners = new Map()
  }

  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[AskRah Events]', ...args)
    }
  }

  private async handleError(error: unknown, eventType: string): Promise<void> {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[AskRah Events] Error handling ${eventType}:`, message)

    if (this.config.throwOnError) {
      throw error
    }
  }

  /**
   * Emit an event to AskRah
   *
   * @param event - Event type
   * @param payload - Event data
   */
  async emit<T extends AskRahEventType>(
    event: T,
    payload: AskRahEventPayloads[T]
  ): Promise<void> {
    this.log(`Emitting ${event}:`, payload)

    try {
      // Route to appropriate handler
      switch (event) {
        case 'signup':
          await this.handleSignup(payload as SignupEventPayload)
          break
        case 'conversion':
          // Legacy: convert 'conversion' to 'payment' event
          await this.handlePayment(payload as ConversionEventPayload)
          break
        case 'payment':
          await this.handlePayment(payload as PaymentEventPayload)
          break
        case 'refund':
          await this.handleRefund(payload as RefundEventPayload)
          break
        case 'subscription':
          // Legacy: handle old subscription format
          await this.handleLegacySubscription(payload as SubscriptionEventPayload)
          break
        case 'subscription.created':
          await this.handleSubscriptionEvent('subscription.created', payload as SubscriptionCreatedPayload)
          break
        case 'subscription.updated':
          await this.handleSubscriptionEvent('subscription.updated', payload as SubscriptionUpdatedPayload)
          break
        case 'subscription.cancelled':
          await this.handleSubscriptionEvent('subscription.cancelled', payload as SubscriptionCancelledPayload)
          break
        case 'dispute.created':
          await this.handleDispute(payload as DisputeEventPayload)
          break
        default:
          this.log(`Unknown event type: ${event}`)
      }

      // Call custom listeners
      const eventListeners = this.listeners.get(event)
      if (eventListeners) {
        for (const listener of eventListeners) {
          try {
            await listener(payload)
          } catch (e) {
            this.log(`Custom listener error for ${event}:`, e)
          }
        }
      }
    } catch (error) {
      await this.handleError(error, event)
    }
  }

  /**
   * Add a custom event listener
   */
  on<T extends AskRahEventType>(
    event: T,
    listener: AskRahEventListener<T>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener as AskRahEventListener<AskRahEventType>)

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(listener as AskRahEventListener<AskRahEventType>)
    }
  }

  /**
   * Remove all listeners for an event
   */
  off(event: AskRahEventType): void {
    this.listeners.delete(event)
  }

  /**
   * Handle signup events using the legacy endpoint for backward compatibility
   */
  private async handleSignup(payload: SignupEventPayload): Promise<void> {
    this.log('Recording signup:', payload)

    await this.client.recordSignup({
      refCode: payload.refCode,
      externalUserId: payload.userId,
      externalEmail: payload.email,
    })

    this.log('Signup recorded successfully')
  }

  /**
   * Handle payment events using the unified endpoint
   */
  private async handlePayment(payload: PaymentEventPayload | ConversionEventPayload): Promise<void> {
    this.log('Recording payment:', payload)

    await this.client.sendEvent('payment', {
      userId: payload.userId,
      amountCents: payload.amountCents,
      currency: payload.currency,
      planName: payload.planName,
      eventId: payload.eventId,
    })

    this.log('Payment recorded successfully')
  }

  /**
   * Handle refund events using the unified endpoint
   */
  private async handleRefund(payload: RefundEventPayload): Promise<void> {
    this.log('Recording refund:', payload)

    await this.client.sendEvent('refund', {
      userId: payload.userId,
      amountCents: payload.amountCents,
      currency: payload.currency,
      originalEventId: payload.originalEventId,
    })

    this.log('Refund recorded successfully')
  }

  /**
   * Handle subscription events using the unified endpoint
   */
  private async handleSubscriptionEvent(
    eventType: 'subscription.created' | 'subscription.updated' | 'subscription.cancelled',
    payload: SubscriptionCreatedPayload | SubscriptionUpdatedPayload | SubscriptionCancelledPayload
  ): Promise<void> {
    this.log(`Recording ${eventType}:`, payload)

    await this.client.sendEvent(eventType, {
      userId: payload.userId,
      planName: (payload as SubscriptionCreatedPayload).planName,
      eventId: payload.eventId,
    })

    this.log(`${eventType} recorded successfully`)
  }

  /**
   * Handle dispute events using the unified endpoint
   */
  private async handleDispute(payload: DisputeEventPayload): Promise<void> {
    this.log('Recording dispute:', payload)

    await this.client.sendEvent('dispute.created', {
      userId: payload.userId,
      amountCents: payload.amountCents,
      eventId: payload.eventId,
    })

    this.log('Dispute recorded successfully')
  }

  /**
   * Handle legacy subscription format (backward compatibility)
   * @deprecated Use specific subscription events instead
   */
  private async handleLegacySubscription(payload: SubscriptionEventPayload): Promise<void> {
    this.log('Recording legacy subscription event:', payload)

    // Map legacy type to new event type
    switch (payload.type) {
      case 'subscription_start':
        await this.client.sendEvent('subscription.created', {
          userId: payload.userId,
          planName: payload.planName,
          eventId: payload.eventId,
        })
        break
      case 'subscription_cancel':
        await this.client.sendEvent('subscription.cancelled', {
          userId: payload.userId,
          eventId: payload.eventId,
        })
        break
      case 'subscription_renew':
        // Renewals with payment should be recorded as payment events
        if (payload.amountCents) {
          await this.client.sendEvent('payment', {
            userId: payload.userId,
            amountCents: payload.amountCents,
            currency: payload.currency,
            planName: payload.planName,
            eventId: payload.eventId,
          })
        }
        break
      case 'trial_start':
        // Trial starts don't have a direct mapping, log as subscription.created
        await this.client.sendEvent('subscription.created', {
          userId: payload.userId,
          planName: payload.planName ? `${payload.planName} (Trial)` : 'Trial',
          eventId: payload.eventId,
        })
        break
    }

    this.log('Legacy subscription event recorded successfully')
  }

  /**
   * Get the underlying client for advanced usage
   */
  getClient(): AskRahClient {
    return this.client
  }
}
