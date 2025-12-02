/**
 * Stripe Payment Service for Frontend
 * Handles payment processing with commission splits
 */

export interface StripePaymentData {
  amount: number; // Total amount in CAD dollars
  commissionAmount?: number; // Commission amount in CAD dollars (deprecated - use commissionData)
  commissionData?: {
    rate: number;
    commissionAmount: number;           // Total with tax
    commissionBeforeTax: number;        // Base commission
    commissionGST: number;              // GST 5%
    commissionQST: number;              // QST 9.975%
    commissionTaxTotal: number;         // Total tax
    netAmount: number;
  };
  orderId: string;
  branchId: string;
  customerEmail?: string;
  orderSource: string; // 'qr', 'website', etc.
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  commissionAmount: number;
  netAmount: number;
  connectedAccountId?: string;
  commissionSplit?: {
    enabled: boolean;
    platformCommission?: number;
    restaurantNet?: number;
    stripeAccountId?: string;
    reason?: string;
  };
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  transactionId?: string;
  error?: string;
}

class StripePaymentService {
  private baseUrl: string;

  constructor() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    this.baseUrl = `${apiUrl}/api/v1`;
  }

  /**
   * Create Payment Intent with commission split
   */
  async createPaymentIntent(paymentData: StripePaymentData): Promise<PaymentIntentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/stripe/payment-intents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: paymentData.amount,
          commission: paymentData.commissionData || { commissionAmount: paymentData.commissionAmount },
          orderId: paymentData.orderId,
          branchId: paymentData.branchId,
          customerEmail: paymentData.customerEmail,
          orderSource: paymentData.orderSource
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create payment intent');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create payment intent:', error);
      throw error;
    }
  }

  /**
   * Confirm payment and log transaction
   */
  async confirmPayment(paymentIntentId: string): Promise<PaymentResult> {
    try {
      const response = await fetch(`${this.baseUrl}/stripe/payment-intents/${paymentIntentId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to confirm payment');
      }

      const result = await response.json();
      return {
        success: true,
        paymentIntentId: result.paymentIntentId,
        transactionId: result.transactionId
      };
    } catch (error) {
      console.error('Failed to confirm payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment confirmation failed'
      };
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentIntentId: string): Promise<{ id: string; status: string; amount: number; commission: number; created: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/stripe/payment-intents/${paymentIntentId}/status`);
      
      if (!response.ok) {
        throw new Error('Failed to get payment status');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get payment status:', error);
      throw error;
    }
  }
}

export const stripePaymentService = new StripePaymentService();