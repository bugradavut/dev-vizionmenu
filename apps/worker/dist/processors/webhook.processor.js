"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookProcessor = void 0;
const logger_1 = require("../utils/logger");
const jobs_1 = require("../types/jobs");
class WebhookProcessor {
    async processJob(job) {
        try {
            switch (job.name) {
                case jobs_1.JOB_TYPES.PROCESS_STRIPE_WEBHOOK:
                    return await this.processStripeWebhook(job.data);
                case jobs_1.JOB_TYPES.PROCESS_THIRD_PARTY_WEBHOOK:
                    return await this.processThirdPartyWebhook(job.data);
                default:
                    throw new Error(`Unknown webhook job type: ${job.name}`);
            }
        }
        catch (error) {
            logger_1.logger.error(`Webhook job ${job.id} failed:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
    async processStripeWebhook(data) {
        logger_1.logger.info(`Processing Stripe webhook: ${data.event.type}`);
        try {
            // Verify webhook signature (implement actual verification in production)
            // const isValid = this.verifyStripeSignature(data.event, data.signature);
            // if (!isValid) {
            //   throw new Error('Invalid webhook signature');
            // }
            switch (data.event.type) {
                case "payment_intent.succeeded":
                    return await this.handlePaymentSucceeded(data.event.data);
                case "payment_intent.payment_failed":
                    return await this.handlePaymentFailed(data.event.data);
                case "invoice.payment_succeeded":
                    return await this.handleSubscriptionPayment(data.event.data);
                case "customer.subscription.created":
                    return await this.handleSubscriptionCreated(data.event.data);
                case "customer.subscription.updated":
                    return await this.handleSubscriptionUpdated(data.event.data);
                case "customer.subscription.deleted":
                    return await this.handleSubscriptionCanceled(data.event.data);
                default:
                    logger_1.logger.info(`Unhandled Stripe webhook type: ${data.event.type}`);
                    return {
                        success: true,
                        message: "Webhook received but not processed",
                    };
            }
        }
        catch (error) {
            logger_1.logger.error("Error processing Stripe webhook:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
    async processThirdPartyWebhook(data) {
        logger_1.logger.info(`Processing ${data.provider} webhook`);
        try {
            switch (data.provider) {
                case "uber-eats":
                    return await this.processUberEatsWebhook(data.payload, data.headers);
                case "doordash":
                    return await this.processDoorDashWebhook(data.payload, data.headers);
                case "grubhub":
                    return await this.processGrubHubWebhook(data.payload, data.headers);
                default:
                    throw new Error(`Unknown third-party provider: ${data.provider}`);
            }
        }
        catch (error) {
            logger_1.logger.error(`Error processing ${data.provider} webhook:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
    // Stripe webhook handlers
    async handlePaymentSucceeded(paymentIntent) {
        logger_1.logger.info(`Payment succeeded: ${paymentIntent.id}`);
        // Update order status to paid
        // This would typically update the order in your database
        // For now, just log the success
        return {
            success: true,
            message: "Payment processed successfully",
            data: { paymentIntentId: paymentIntent.id },
        };
    }
    async handlePaymentFailed(paymentIntent) {
        logger_1.logger.warn(`Payment failed: ${paymentIntent.id}`);
        // Handle failed payment
        // Update order status, notify customer, etc.
        return {
            success: true,
            message: "Payment failure processed",
            data: { paymentIntentId: paymentIntent.id },
        };
    }
    async handleSubscriptionPayment(invoice) {
        logger_1.logger.info(`Subscription payment succeeded: ${invoice.id}`);
        // Update restaurant subscription status
        // Extend subscription period, etc.
        return {
            success: true,
            message: "Subscription payment processed",
            data: { invoiceId: invoice.id },
        };
    }
    async handleSubscriptionCreated(subscription) {
        logger_1.logger.info(`Subscription created: ${subscription.id}`);
        // Set up new subscription
        // Update restaurant features, send welcome email, etc.
        return {
            success: true,
            message: "Subscription created successfully",
            data: { subscriptionId: subscription.id },
        };
    }
    async handleSubscriptionUpdated(subscription) {
        logger_1.logger.info(`Subscription updated: ${subscription.id}`);
        // Handle subscription changes
        // Update features, billing, etc.
        return {
            success: true,
            message: "Subscription updated successfully",
            data: { subscriptionId: subscription.id },
        };
    }
    async handleSubscriptionCanceled(subscription) {
        logger_1.logger.info(`Subscription canceled: ${subscription.id}`);
        // Handle subscription cancellation
        // Downgrade features, send cancellation email, etc.
        return {
            success: true,
            message: "Subscription cancellation processed",
            data: { subscriptionId: subscription.id },
        };
    }
    // Third-party webhook handlers
    async processUberEatsWebhook(payload, headers) {
        logger_1.logger.info("Processing Uber Eats webhook:", payload.event_type);
        // Verify webhook signature
        // const isValid = this.verifyUberEatsSignature(payload, headers);
        // if (!isValid) {
        //   throw new Error('Invalid Uber Eats webhook signature');
        // }
        switch (payload.event_type) {
            case "order.placed":
                return await this.handleThirdPartyOrderPlaced(payload, "uber-eats");
            case "order.updated":
                return await this.handleThirdPartyOrderUpdated(payload, "uber-eats");
            case "order.cancelled":
                return await this.handleThirdPartyOrderCanceled(payload, "uber-eats");
            default:
                logger_1.logger.info(`Unhandled Uber Eats webhook type: ${payload.event_type}`);
                return {
                    success: true,
                    message: "Webhook received but not processed",
                };
        }
    }
    async processDoorDashWebhook(payload, headers) {
        logger_1.logger.info("Processing DoorDash webhook:", payload.event_type);
        // Similar processing for DoorDash
        switch (payload.event_type) {
            case "order.created":
                return await this.handleThirdPartyOrderPlaced(payload, "doordash");
            case "order.updated":
                return await this.handleThirdPartyOrderUpdated(payload, "doordash");
            case "order.cancelled":
                return await this.handleThirdPartyOrderCanceled(payload, "doordash");
            default:
                logger_1.logger.info(`Unhandled DoorDash webhook type: ${payload.event_type}`);
                return {
                    success: true,
                    message: "Webhook received but not processed",
                };
        }
    }
    async processGrubHubWebhook(payload, headers) {
        logger_1.logger.info("Processing GrubHub webhook:", payload.event_type);
        // Similar processing for GrubHub
        return {
            success: true,
            message: "GrubHub webhook processed",
        };
    }
    // Generic third-party order handlers
    async handleThirdPartyOrderPlaced(payload, provider) {
        logger_1.logger.info(`New ${provider} order placed:`, payload.order_id);
        // Create order in your system
        // Sync order data
        // Notify restaurant
        return {
            success: true,
            message: `${provider} order created successfully`,
            data: { orderId: payload.order_id, provider },
        };
    }
    async handleThirdPartyOrderUpdated(payload, provider) {
        logger_1.logger.info(`${provider} order updated:`, payload.order_id);
        // Update order in your system
        // Sync status changes
        return {
            success: true,
            message: `${provider} order updated successfully`,
            data: { orderId: payload.order_id, provider },
        };
    }
    async handleThirdPartyOrderCanceled(payload, provider) {
        logger_1.logger.info(`${provider} order canceled:`, payload.order_id);
        // Cancel order in your system
        // Handle refunds if needed
        // Notify restaurant
        return {
            success: true,
            message: `${provider} order cancellation processed`,
            data: { orderId: payload.order_id, provider },
        };
    }
    // Signature verification methods (implement in production)
    verifyStripeSignature(event, signature) {
        // Implement actual Stripe signature verification
        // using the webhook secret
        return true; // Placeholder
    }
    verifyUberEatsSignature(payload, headers) {
        // Implement actual Uber Eats signature verification
        return true; // Placeholder
    }
}
exports.WebhookProcessor = WebhookProcessor;
//# sourceMappingURL=webhook.processor.js.map