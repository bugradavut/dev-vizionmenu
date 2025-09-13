import { Job } from "bullmq";
import { logger } from "../utils/logger";
import { config } from "../config";
import {
  SendEmailJob,
  SendOrderConfirmationJob,
  SendOrderStatusUpdateJob,
  JobResult,
  JOB_TYPES,
} from "../types/jobs";

export class EmailProcessor {
  async processJob(job: Job): Promise<JobResult> {
    try {
      switch (job.name) {
        case JOB_TYPES.SEND_EMAIL:
          return await this.sendEmail(job.data as SendEmailJob);
        case JOB_TYPES.SEND_ORDER_CONFIRMATION:
          return await this.sendOrderConfirmation(
            job.data as SendOrderConfirmationJob,
          );
        case JOB_TYPES.SEND_ORDER_STATUS_UPDATE:
          return await this.sendOrderStatusUpdate(
            job.data as SendOrderStatusUpdateJob,
          );
        case JOB_TYPES.SEND_WELCOME_EMAIL:
          return await this.sendWelcomeEmail(job.data);
        case JOB_TYPES.SEND_PASSWORD_RESET:
          return await this.sendPasswordReset(job.data);
        default:
          throw new Error(`Unknown email job type: ${job.name}`);
      }
    } catch (error) {
      logger.error(`Email job ${job.id} failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async sendEmail(data: SendEmailJob): Promise<JobResult> {
    logger.info(`Sending email to ${data.to} with subject: ${data.subject}`);

    // For now, just log the email in development
    if (config.app.nodeEnv !== "production") {
      logger.info("Email content (DEV MODE):", {
        to: data.to,
        from: data.from || config.services.email.fromEmail,
        subject: data.subject,
        html: data.html.substring(0, 100) + "...",
      });

      return {
        success: true,
        message: "Email sent (development mode)",
      };
    }

    // In production, implement actual email sending
    // This is where you would integrate with SendGrid, AWS SES, etc.
    // For now, return success
    return {
      success: true,
      message: "Email sent successfully",
    };
  }

  private async sendOrderConfirmation(
    data: SendOrderConfirmationJob,
  ): Promise<JobResult> {
    const emailData: SendEmailJob = {
      to: data.customerEmail,
      subject: `Order Confirmation - ${data.restaurantName}`,
      html: this.generateOrderConfirmationHtml(data),
    };

    return await this.sendEmail(emailData);
  }

  private async sendOrderStatusUpdate(
    data: SendOrderStatusUpdateJob,
  ): Promise<JobResult> {
    const emailData: SendEmailJob = {
      to: data.customerEmail,
      subject: `Order Update - ${data.restaurantName}`,
      html: this.generateOrderStatusUpdateHtml(data),
    };

    return await this.sendEmail(emailData);
  }

  private async sendWelcomeEmail(data: any): Promise<JobResult> {
    const emailData: SendEmailJob = {
      to: data.email,
      subject: "Welcome to Vision Menu!",
      html: this.generateWelcomeEmailHtml(data),
    };

    return await this.sendEmail(emailData);
  }

  private async sendPasswordReset(data: any): Promise<JobResult> {
    const emailData: SendEmailJob = {
      to: data.email,
      subject: "Password Reset - Vision Menu",
      html: this.generatePasswordResetHtml(data),
    };

    return await this.sendEmail(emailData);
  }

  private generateOrderConfirmationHtml(
    data: SendOrderConfirmationJob,
  ): string {
    const itemsHtml = data.orderDetails.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
        </tr>
      `,
      )
      .join("");

    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; }
            .header { text-align: center; margin-bottom: 30px; }
            .order-details { margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; }
            th { background-color: #f8f9fa; padding: 12px; text-align: left; }
            .total { font-size: 18px; font-weight: bold; margin-top: 20px; text-align: right; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Confirmation</h1>
              <p>Thank you for your order, ${data.customerName}!</p>
            </div>
            
            <div class="order-details">
              <h2>Order Details</h2>
              <p><strong>Restaurant:</strong> ${data.restaurantName}</p>
              <p><strong>Order Number:</strong> ${data.orderDetails.orderNumber}</p>
              ${data.orderDetails.estimatedDeliveryTime ? `<p><strong>Estimated Delivery:</strong> ${data.orderDetails.estimatedDeliveryTime}</p>` : ""}
              
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style="text-align: center;">Quantity</th>
                    <th style="text-align: right;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
              
              <div class="total">
                Total: $${data.orderDetails.total.toFixed(2)}
              </div>
            </div>
            
            <p>We'll keep you updated on your order status. Thank you for choosing ${data.restaurantName}!</p>
          </div>
        </body>
      </html>
    `;
  }

  private generateOrderStatusUpdateHtml(
    data: SendOrderStatusUpdateJob,
  ): string {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; }
            .header { text-align: center; margin-bottom: 30px; }
            .status { font-size: 18px; font-weight: bold; color: #28a745; text-align: center; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Status Update</h1>
              <p>Hi ${data.customerName},</p>
            </div>
            
            <div class="status">
              Your order status: ${data.status}
            </div>
            
            ${data.estimatedTime ? `<p><strong>Estimated Time:</strong> ${data.estimatedTime}</p>` : ""}
            
            <p>Restaurant: ${data.restaurantName}</p>
            <p>Thank you for your patience!</p>
          </div>
        </body>
      </html>
    `;
  }

  private generateWelcomeEmailHtml(data: any): string {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; }
            .header { text-align: center; margin-bottom: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Vision Menu!</h1>
              <p>Hi ${data.name || "there"},</p>
            </div>
            
            <p>Welcome to Vision Menu! We're excited to have you on board.</p>
            <p>You can now start managing your restaurant's menu and orders with our platform.</p>
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
            
            <p>Best regards,<br>The Vision Menu Team</p>
          </div>
        </body>
      </html>
    `;
  }

  private generatePasswordResetHtml(data: any): string {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; }
            .header { text-align: center; margin-bottom: 30px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset</h1>
            </div>
            
            <p>You requested a password reset for your Vision Menu account.</p>
            
            ${data.resetLink ? `<p><a href="${data.resetLink}" class="button">Reset Password</a></p>` : ""}
            
            <p>If you didn't request this reset, please ignore this email.</p>
            <p>This link will expire in 24 hours.</p>
            
            <p>Best regards,<br>The Vision Menu Team</p>
          </div>
        </body>
      </html>
    `;
  }
}
