"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JOB_TYPES = exports.QUEUES = void 0;
// Job queue names
exports.QUEUES = {
    EMAIL: "email-queue",
    WEBHOOK: "webhook-queue",
    SYNC: "sync-queue",
    NOTIFICATION: "notification-queue",
};
// Job types
exports.JOB_TYPES = {
    // Email jobs
    SEND_EMAIL: "send-email",
    SEND_ORDER_CONFIRMATION: "send-order-confirmation",
    SEND_ORDER_STATUS_UPDATE: "send-order-status-update",
    SEND_WELCOME_EMAIL: "send-welcome-email",
    SEND_PASSWORD_RESET: "send-password-reset",
    // Webhook jobs
    PROCESS_STRIPE_WEBHOOK: "process-stripe-webhook",
    PROCESS_THIRD_PARTY_WEBHOOK: "process-third-party-webhook",
    // Sync jobs
    SYNC_UBER_EATS_ORDERS: "sync-uber-eats-orders",
    SYNC_DOORDASH_ORDERS: "sync-doordash-orders",
    SYNC_MENU_TO_THIRD_PARTY: "sync-menu-to-third-party",
    // Notification jobs
    SEND_PUSH_NOTIFICATION: "send-push-notification",
    SEND_SMS_NOTIFICATION: "send-sms-notification",
};
//# sourceMappingURL=jobs.js.map