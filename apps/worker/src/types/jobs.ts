// Job queue names
export const QUEUES = {
  EMAIL: "email-queue",
  WEBHOOK: "webhook-queue",
  SYNC: "sync-queue",
  NOTIFICATION: "notification-queue",
} as const;

// Job types
export const JOB_TYPES = {
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
} as const;

// Job data interfaces
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

// Job options
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

// Job result interfaces
export interface JobResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}
