"use client"

import { apiClient } from "./api-client"

export interface StripeAccountSummary {
  hasAccount: boolean
  accountId?: string
  onboardingStatus?: 'pending' | 'verified' | 'rejected' | 'incomplete'
  verificationStatus?: 'unverified' | 'pending' | 'verified'
  payoutsEnabled?: boolean
  chargesEnabled?: boolean
  requirements?: string[]
  capabilities?: {
    card_payments?: 'active' | 'inactive' | 'pending'
    transfers?: 'active' | 'inactive' | 'pending'
    [key: string]: 'active' | 'inactive' | 'pending' | undefined
  }
}

export interface CreateExpressAccountBody {
  restaurant_chain_id?: string
  branch_id?: string
  business_type?: 'company' | 'individual'
  business_url?: string
  business_profile?: Record<string, unknown>
}

class StripeAccountsService {
  async getStatusByChain(chainId: string) {
    return apiClient.get<StripeAccountSummary>(`/api/v1/stripe/accounts/status`, { chainId })
  }

  async createExpressAccount(body: CreateExpressAccountBody) {
    return apiClient.post<{ account: Record<string, unknown>; stripe_account_id: string; onboarding_required: boolean }>(
      `/api/v1/stripe/accounts/create`,
      body
    )
  }

  async createOnboardingLink(accountId: string, refreshUrl?: string, returnUrl?: string) {
    return apiClient.post<{ onboarding_url: string; expires_at: number }>(
      `/api/v1/stripe/accounts/${accountId}/onboard`,
      refreshUrl || returnUrl ? { refresh_url: refreshUrl, return_url: returnUrl } : undefined
    )
  }

  async getAccountCapabilities(accountId: string) {
    return apiClient.get<{ 
      capabilities: { card_payments: boolean; transfers: boolean }
      charges_enabled: boolean
      payouts_enabled: boolean
      is_ready: boolean
      requirements_due: string[]
      requirements_past_due: string[]
    }>(`/api/v1/stripe/accounts/${accountId}/capabilities`)
  }
}

export const stripeAccountsService = new StripeAccountsService()

