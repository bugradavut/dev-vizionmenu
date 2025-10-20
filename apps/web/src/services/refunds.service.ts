import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

class RefundsService {
  private apiUrl: string;

  constructor() {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    this.apiUrl = `${baseUrl}/api/v1/refunds`;
  }

  private async getAuthToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const token = await this.getAuthToken();

    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || error.error || 'Request failed');
    }

    return response.json();
  }

  // Get all refund-eligible orders (last 7 days)
  async getEligibleOrders() {
    return this.makeRequest('/eligible');
  }

  // Process a refund for a specific order
  async processRefund(
    orderId: string,
    amount: number,
    reason?: string,
    refundedItems?: Array<{ itemId: string; quantity: number; amount: number }>
  ) {
    return this.makeRequest(`/orders/${orderId}/refund`, {
      method: 'POST',
      body: JSON.stringify({
        amount,
        reason: reason || 'requested_by_customer',
        refundedItems: refundedItems || []
      }),
    });
  }

  // Validate refund eligibility for a specific order
  async validateRefundEligibility(orderId: string) {
    return this.makeRequest(`/orders/${orderId}/eligibility`);
  }

  // Get refund history
  async getRefundHistory(limit?: number) {
    const params = limit ? `?limit=${limit}` : '';
    return this.makeRequest(`/history${params}`);
  }

  // Get refund status from Stripe
  async getRefundStatus(refundId: string) {
    return this.makeRequest(`/${refundId}/status`);
  }

  // Get refund analytics
  async getRefundAnalytics(days?: number) {
    const params = days ? `?days=${days}` : '';
    return this.makeRequest(`/analytics${params}`);
  }
}

export const refundsService = new RefundsService();