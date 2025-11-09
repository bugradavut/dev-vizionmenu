import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

class PaymentMethodChangeService {
  private apiUrl: string;

  constructor() {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    this.apiUrl = `${baseUrl}/api/v1/payment-method-change`;
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

  // Validate payment method change eligibility for a specific order
  async validatePaymentMethodChangeEligibility(
    orderId: string,
    newPaymentMethod: 'cash' | 'card' | 'online'
  ) {
    return this.makeRequest(
      `/orders/${orderId}/eligibility?newPaymentMethod=${newPaymentMethod}`
    );
  }

  // Change payment method for a specific order
  async changePaymentMethod(
    orderId: string,
    newPaymentMethod: 'cash' | 'card' | 'online',
    reason?: string
  ) {
    return this.makeRequest(`/orders/${orderId}/change`, {
      method: 'POST',
      body: JSON.stringify({
        newPaymentMethod,
        reason: reason || 'customer_request'
      }),
    });
  }

  // Get payment method change history
  async getPaymentMethodChangeHistory(limit?: number) {
    const params = limit ? `?limit=${limit}` : '';
    return this.makeRequest(`/history${params}`);
  }

  // Get payment method change analytics
  async getPaymentMethodChangeAnalytics(days?: number) {
    const params = days ? `?days=${days}` : '';
    return this.makeRequest(`/analytics${params}`);
  }
}

export const paymentMethodChangeService = new PaymentMethodChangeService();
