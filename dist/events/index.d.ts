import { a as AskRahConfig, A as AskRahClient } from '../client-0-9482Ai.js';

/**
 * Event payload for signup events
 */
interface SignupEventPayload {
    /** Your user's ID in your system */
    userId: string;
    /** User's email (optional) */
    email?: string;
    /** Referral code from AskRah.getRefCode() */
    refCode: string;
    /** Click ID from AskRah.getClickId() (optional) */
    clickId?: string;
}
/**
 * Event payload for conversion/payment events
 * @deprecated Use PaymentEventPayload instead
 */
interface ConversionEventPayload {
    /** Your user's ID in your system */
    userId: string;
    /** Payment amount in cents (e.g., 9900 = $99.00) */
    amountCents: number;
    /** Currency code (default: USD) */
    currency?: string;
    /** Plan or product name */
    planName?: string;
    /** Additional description */
    description?: string;
    /** Unique event ID to prevent duplicates (e.g., Upgate transaction ID) */
    eventId?: string;
}
/**
 * Event payload for payment events
 */
interface PaymentEventPayload {
    /** Your user's ID in your system */
    userId: string;
    /** Payment amount in cents (e.g., 9900 = $99.00) */
    amountCents: number;
    /** Currency code (default: USD) */
    currency?: string;
    /** Plan or product name */
    planName?: string;
    /** Unique event ID to prevent duplicates (e.g., Upgate transaction ID) */
    eventId?: string;
}
/**
 * Event payload for refund events
 */
interface RefundEventPayload {
    /** Your user's ID in your system */
    userId: string;
    /** Refund amount in cents */
    amountCents: number;
    /** Currency code (default: USD) */
    currency?: string;
    /** Original payment event ID to link the refund */
    originalEventId?: string;
}
/**
 * Event payload for subscription events (legacy)
 * @deprecated Use specific subscription event payloads instead
 */
interface SubscriptionEventPayload {
    /** Your user's ID in your system */
    userId: string;
    /** Event type */
    type: 'trial_start' | 'subscription_start' | 'subscription_cancel' | 'subscription_renew';
    /** Plan name */
    planName?: string;
    /** Amount in cents (for renewals) */
    amountCents?: number;
    /** Currency code */
    currency?: string;
    /** Unique event ID to prevent duplicates */
    eventId?: string;
}
/**
 * Event payload for subscription.created events
 */
interface SubscriptionCreatedPayload {
    /** Your user's ID in your system */
    userId: string;
    /** Plan or product name */
    planName?: string;
    /** Unique event ID to prevent duplicates */
    eventId?: string;
}
/**
 * Event payload for subscription.updated events
 */
interface SubscriptionUpdatedPayload {
    /** Your user's ID in your system */
    userId: string;
    /** New plan or product name */
    planName?: string;
    /** Unique event ID to prevent duplicates */
    eventId?: string;
}
/**
 * Event payload for subscription.cancelled events
 */
interface SubscriptionCancelledPayload {
    /** Your user's ID in your system */
    userId: string;
    /** Unique event ID to prevent duplicates */
    eventId?: string;
}
/**
 * Event payload for dispute events
 */
interface DisputeEventPayload {
    /** Your user's ID in your system */
    userId: string;
    /** Disputed amount in cents */
    amountCents: number;
    /** Unique event ID to prevent duplicates (e.g., Upgate transaction ID) */
    eventId?: string;
}
/**
 * All supported event types
 */
type AskRahEventType = 'signup' | 'conversion' | 'payment' | 'refund' | 'subscription' | 'subscription.created' | 'subscription.updated' | 'subscription.cancelled' | 'dispute.created';
/**
 * Event payload map
 */
interface AskRahEventPayloads {
    signup: SignupEventPayload;
    conversion: ConversionEventPayload;
    payment: PaymentEventPayload;
    refund: RefundEventPayload;
    subscription: SubscriptionEventPayload;
    'subscription.created': SubscriptionCreatedPayload;
    'subscription.updated': SubscriptionUpdatedPayload;
    'subscription.cancelled': SubscriptionCancelledPayload;
    'dispute.created': DisputeEventPayload;
}
/**
 * Event listener function type
 */
type AskRahEventListener<T extends AskRahEventType> = (payload: AskRahEventPayloads[T]) => void | Promise<void>;

/**
 * Configuration for AskRah Events
 */
interface AskRahEventsConfig extends AskRahConfig {
    /**
     * Whether to throw errors or just log them
     * @default false
     */
    throwOnError?: boolean;
    /**
     * Enable debug logging
     * @default false
     */
    debug?: boolean;
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
declare class AskRahEvents {
    private client;
    private config;
    private listeners;
    constructor(config: AskRahEventsConfig);
    private log;
    private handleError;
    /**
     * Emit an event to AskRah
     *
     * @param event - Event type
     * @param payload - Event data
     */
    emit<T extends AskRahEventType>(event: T, payload: AskRahEventPayloads[T]): Promise<void>;
    /**
     * Add a custom event listener
     */
    on<T extends AskRahEventType>(event: T, listener: AskRahEventListener<T>): () => void;
    /**
     * Remove all listeners for an event
     */
    off(event: AskRahEventType): void;
    /**
     * Handle signup events using the legacy endpoint for backward compatibility
     */
    private handleSignup;
    /**
     * Handle payment events using the unified endpoint
     */
    private handlePayment;
    /**
     * Handle refund events using the unified endpoint
     */
    private handleRefund;
    /**
     * Handle subscription events using the unified endpoint
     */
    private handleSubscriptionEvent;
    /**
     * Handle dispute events using the unified endpoint
     */
    private handleDispute;
    /**
     * Handle legacy subscription format (backward compatibility)
     * @deprecated Use specific subscription events instead
     */
    private handleLegacySubscription;
    /**
     * Get the underlying client for advanced usage
     */
    getClient(): AskRahClient;
}

export { type AskRahEventListener, type AskRahEventPayloads, type AskRahEventType, AskRahEvents, type AskRahEventsConfig, type ConversionEventPayload, type DisputeEventPayload, type PaymentEventPayload, type RefundEventPayload, type SignupEventPayload, type SubscriptionCancelledPayload, type SubscriptionCreatedPayload, type SubscriptionEventPayload, type SubscriptionUpdatedPayload };
