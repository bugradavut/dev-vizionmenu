import { Injectable, Logger } from "@nestjs/common";
import { Queue } from "bullmq";
import { InjectQueue } from "@nestjs/bullmq";

// Queue names - should match worker queues
export const QUEUE_NAMES = {
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

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue("email-queue") private emailQueue: Queue,
    @InjectQueue("webhook-queue") private webhookQueue: Queue,
    @InjectQueue("sync-queue") private syncQueue: Queue,
    @InjectQueue("notification-queue") private notificationQueue: Queue,
  ) {}

  // Email job methods
  async sendEmail(data: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    await this.emailQueue.add(JOB_TYPES.SEND_EMAIL, data);
    this.logger.log(`Email job queued for ${data.to}`);
  }

  async sendOrderConfirmation(data: {
    orderId: string;
    customerEmail: string;
    customerName: string;
    restaurantName: string;
    orderDetails: any;
  }): Promise<void> {
    await this.emailQueue.add(JOB_TYPES.SEND_ORDER_CONFIRMATION, data);
    this.logger.log(
      `Order confirmation email queued for order ${data.orderId}`,
    );
  }

  async sendOrderStatusUpdate(data: {
    orderId: string;
    customerEmail: string;
    customerName: string;
    restaurantName: string;
    status: string;
    estimatedTime?: string;
  }): Promise<void> {
    await this.emailQueue.add(JOB_TYPES.SEND_ORDER_STATUS_UPDATE, data);
    this.logger.log(
      `Order status update email queued for order ${data.orderId}`,
    );
  }

  async sendWelcomeEmail(data: { email: string; name: string }): Promise<void> {
    await this.emailQueue.add(JOB_TYPES.SEND_WELCOME_EMAIL, data);
    this.logger.log(`Welcome email queued for ${data.email}`);
  }

  async sendPasswordReset(data: {
    email: string;
    resetLink: string;
  }): Promise<void> {
    await this.emailQueue.add(JOB_TYPES.SEND_PASSWORD_RESET, data);
    this.logger.log(`Password reset email queued for ${data.email}`);
  }

  // Webhook job methods
  async processStripeWebhook(data: {
    event: any;
    signature: string;
  }): Promise<void> {
    await this.webhookQueue.add(JOB_TYPES.PROCESS_STRIPE_WEBHOOK, data);
    this.logger.log(`Stripe webhook job queued: ${data.event.type}`);
  }

  async processThirdPartyWebhook(data: {
    provider: "uber-eats" | "doordash" | "grubhub";
    payload: any;
    signature?: string;
    headers: Record<string, string>;
  }): Promise<void> {
    await this.webhookQueue.add(JOB_TYPES.PROCESS_THIRD_PARTY_WEBHOOK, data);
    this.logger.log(`${data.provider} webhook job queued`);
  }

  // Sync job methods
  async syncUberEatsOrders(data: {
    restaurantId: string;
    startDate?: string;
    endDate?: string;
  }): Promise<void> {
    await this.syncQueue.add(JOB_TYPES.SYNC_UBER_EATS_ORDERS, data);
    this.logger.log(
      `Uber Eats sync job queued for restaurant ${data.restaurantId}`,
    );
  }

  async syncDoorDashOrders(data: {
    restaurantId: string;
    startDate?: string;
    endDate?: string;
  }): Promise<void> {
    await this.syncQueue.add(JOB_TYPES.SYNC_DOORDASH_ORDERS, data);
    this.logger.log(
      `DoorDash sync job queued for restaurant ${data.restaurantId}`,
    );
  }

  async syncMenuToThirdParty(data: {
    restaurantId: string;
    provider: "uber-eats" | "doordash";
    menuId: string;
  }): Promise<void> {
    await this.syncQueue.add(JOB_TYPES.SYNC_MENU_TO_THIRD_PARTY, data);
    this.logger.log(
      `Menu sync job queued for restaurant ${data.restaurantId} to ${data.provider}`,
    );
  }

  // Notification job methods
  async sendPushNotification(data: {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, any>;
  }): Promise<void> {
    await this.notificationQueue.add(JOB_TYPES.SEND_PUSH_NOTIFICATION, data);
    this.logger.log(`Push notification job queued for user ${data.userId}`);
  }

  async sendSMSNotification(data: {
    to: string;
    message: string;
    from?: string;
  }): Promise<void> {
    await this.notificationQueue.add(JOB_TYPES.SEND_SMS_NOTIFICATION, data);
    this.logger.log(`SMS notification job queued for ${data.to}`);
  }

  // Queue management methods
  async getQueueStats() {
    const stats = await Promise.all([
      this.getQueueStat("email", this.emailQueue),
      this.getQueueStat("webhook", this.webhookQueue),
      this.getQueueStat("sync", this.syncQueue),
      this.getQueueStat("notification", this.notificationQueue),
    ]);

    return stats.reduce(
      (acc, stat) => {
        acc[stat.name] = stat.stats;
        return acc;
      },
      {} as Record<string, any>,
    );
  }

  private async getQueueStat(name: string, queue: Queue) {
    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();

    return {
      name,
      stats: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
      },
    };
  }
}
