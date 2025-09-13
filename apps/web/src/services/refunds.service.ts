class RefundsService {
  private apiUrl = '/api/v1/refunds';

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
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
  async processRefund(orderId: string, amount: number, reason?: string) {
    return this.makeRequest(`/orders/${orderId}/refund`, {
      method: 'POST',
      body: JSON.stringify({
        amount,
        reason: reason || 'requested_by_customer'
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