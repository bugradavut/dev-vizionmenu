export declare const QUEUES: {
    readonly EMAIL: "email-queue";
    readonly WEBHOOK: "webhook-queue";
    readonly SYNC: "sync-queue";
    readonly NOTIFICATION: "notification-queue";
};
export declare const JOB_TYPES: {
    readonly SEND_EMAIL: "send-email";
    readonly SEND_ORDER_CONFIRMATION: "send-order-confirmation";
    readonly SEND_ORDER_STATUS_UPDATE: "send-order-status-update";
    readonly SEND_WELCOME_EMAIL: "send-welcome-email";
    readonly SEND_PASSWORD_RESET: "send-password-reset";
    readonly PROCESS_STRIPE_WEBHOOK: "process-stripe-webhook";
    readonly PROCESS_THIRD_PARTY_WEBHOOK: "process-third-party-webhook";
    readonly SYNC_UBER_EATS_ORDERS: "sync-uber-eats-orders";
    readonly SYNC_DOORDASH_ORDERS: "sync-doordash-orders";
    readonly SYNC_MENU_TO_THIRD_PARTY: "sync-menu-to-third-party";
    readonly SEND_PUSH_NOTIFICATION: "send-push-notification";
    readonly SEND_SMS_NOTIFICATION: "send-sms-notification";
};
export interface SendEmailJob {
    to: string;
    from?: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: Array<{
        filename: string;
        content: string;
        encoding: string;
    }>;
}
export interface SendOrderConfirmationJob {
    orderId: string;
    customerEmail: string;
    customerName: string;
    restaurantName: string;
    orderDetails: {
        items: Array<{
            name: string;
            quantity: number;
            price: number;
        }>;
        total: number;
        orderNumber: string;
        estimatedDeliveryTime?: string;
    };
}
export interface SendOrderStatusUpdateJob {
    orderId: string;
    customerEmail: string;
    customerName: string;
    restaurantName: string;
    status: string;
    estimatedTime?: string;
}
export interface ProcessStripeWebhookJob {
    event: {
        id: string;
        type: string;
        data: any;
        created: number;
    };
    signature: string;
}
export interface ProcessThirdPartyWebhookJob {
    provider: "uber-eats" | "doordash" | "grubhub";
    payload: any;
    signature?: string;
    headers: Record<string, string>;
}
export interface SyncOrdersJob {
    restaurantId: string;
    provider: "uber-eats" | "doordash";
    startDate?: string;
    endDate?: string;
}
export interface SyncMenuJob {
    restaurantId: string;
    provider: "uber-eats" | "doordash";
    menuId: string;
}
export interface SendPushNotificationJob {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    badge?: number;
}
export interface SendSMSNotificationJob {
    to: string;
    message: string;
    from?: string;
}
export interface JobOptions {
    delay?: number;
    attempts?: number;
    backoff?: {
        type: "fixed" | "exponential";
        delay: number;
    };
    removeOnComplete?: number;
    removeOnFail?: number;
}
export interface JobResult {
    success: boolean;
    message?: string;
    data?: any;
    error?: string;
}
//# sourceMappingURL=jobs.d.ts.map