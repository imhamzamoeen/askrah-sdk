import {
  AskRahClient
} from "../chunk-JFK543FX.mjs";

// src/events/emitter.ts
var AskRahEvents = class {
  constructor(config) {
    this.config = {
      throwOnError: false,
      debug: false,
      ...config
    };
    this.client = new AskRahClient(config);
    this.listeners = /* @__PURE__ */ new Map();
  }
  log(...args) {
    if (this.config.debug) {
      console.log("[AskRah Events]", ...args);
    }
  }
  async handleError(error, eventType) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[AskRah Events] Error handling ${eventType}:`, message);
    if (this.config.throwOnError) {
      throw error;
    }
  }
  /**
   * Emit an event to AskRah
   *
   * @param event - Event type
   * @param payload - Event data
   */
  async emit(event, payload) {
    this.log(`Emitting ${event}:`, payload);
    try {
      switch (event) {
        case "signup":
          await this.handleSignup(payload);
          break;
        case "conversion":
          await this.handlePayment(payload);
          break;
        case "payment":
          await this.handlePayment(payload);
          break;
        case "refund":
          await this.handleRefund(payload);
          break;
        case "subscription":
          await this.handleLegacySubscription(payload);
          break;
        case "subscription.created":
          await this.handleSubscriptionEvent("subscription.created", payload);
          break;
        case "subscription.updated":
          await this.handleSubscriptionEvent("subscription.updated", payload);
          break;
        case "subscription.cancelled":
          await this.handleSubscriptionEvent("subscription.cancelled", payload);
          break;
        case "dispute.created":
          await this.handleDispute(payload);
          break;
        default:
          this.log(`Unknown event type: ${event}`);
      }
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        for (const listener of eventListeners) {
          try {
            await listener(payload);
          } catch (e) {
            this.log(`Custom listener error for ${event}:`, e);
          }
        }
      }
    } catch (error) {
      await this.handleError(error, event);
    }
  }
  /**
   * Add a custom event listener
   */
  on(event, listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, /* @__PURE__ */ new Set());
    }
    this.listeners.get(event).add(listener);
    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }
  /**
   * Remove all listeners for an event
   */
  off(event) {
    this.listeners.delete(event);
  }
  /**
   * Handle signup events using the legacy endpoint for backward compatibility
   */
  async handleSignup(payload) {
    this.log("Recording signup:", payload);
    await this.client.recordSignup({
      refCode: payload.refCode,
      externalUserId: payload.userId,
      externalEmail: payload.email
    });
    this.log("Signup recorded successfully");
  }
  /**
   * Handle payment events using the unified endpoint
   */
  async handlePayment(payload) {
    this.log("Recording payment:", payload);
    await this.client.sendEvent("payment", {
      userId: payload.userId,
      amountCents: payload.amountCents,
      currency: payload.currency,
      planName: payload.planName,
      eventId: payload.eventId
    });
    this.log("Payment recorded successfully");
  }
  /**
   * Handle refund events using the unified endpoint
   */
  async handleRefund(payload) {
    this.log("Recording refund:", payload);
    await this.client.sendEvent("refund", {
      userId: payload.userId,
      amountCents: payload.amountCents,
      currency: payload.currency,
      originalEventId: payload.originalEventId
    });
    this.log("Refund recorded successfully");
  }
  /**
   * Handle subscription events using the unified endpoint
   */
  async handleSubscriptionEvent(eventType, payload) {
    this.log(`Recording ${eventType}:`, payload);
    await this.client.sendEvent(eventType, {
      userId: payload.userId,
      planName: payload.planName,
      eventId: payload.eventId
    });
    this.log(`${eventType} recorded successfully`);
  }
  /**
   * Handle dispute events using the unified endpoint
   */
  async handleDispute(payload) {
    this.log("Recording dispute:", payload);
    await this.client.sendEvent("dispute.created", {
      userId: payload.userId,
      amountCents: payload.amountCents,
      eventId: payload.eventId
    });
    this.log("Dispute recorded successfully");
  }
  /**
   * Handle legacy subscription format (backward compatibility)
   * @deprecated Use specific subscription events instead
   */
  async handleLegacySubscription(payload) {
    this.log("Recording legacy subscription event:", payload);
    switch (payload.type) {
      case "subscription_start":
        await this.client.sendEvent("subscription.created", {
          userId: payload.userId,
          planName: payload.planName,
          eventId: payload.eventId
        });
        break;
      case "subscription_cancel":
        await this.client.sendEvent("subscription.cancelled", {
          userId: payload.userId,
          eventId: payload.eventId
        });
        break;
      case "subscription_renew":
        if (payload.amountCents) {
          await this.client.sendEvent("payment", {
            userId: payload.userId,
            amountCents: payload.amountCents,
            currency: payload.currency,
            planName: payload.planName,
            eventId: payload.eventId
          });
        }
        break;
      case "trial_start":
        await this.client.sendEvent("subscription.created", {
          userId: payload.userId,
          planName: payload.planName ? `${payload.planName} (Trial)` : "Trial",
          eventId: payload.eventId
        });
        break;
    }
    this.log("Legacy subscription event recorded successfully");
  }
  /**
   * Get the underlying client for advanced usage
   */
  getClient() {
    return this.client;
  }
};
export {
  AskRahEvents
};
