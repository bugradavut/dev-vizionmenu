"use client"

import { apiClient } from './api-client'

// Simplified Types
export interface WaiterCall {
  id: string
  branch_id: string
  table_number: number
  zone?: string
  created_at: string
}

export interface CreateWaiterCallRequest {
  branch_id: string
  table_number: number
  zone?: string
}

/**
 * Waiter Calls Service - Simplified
 * Handles QR table service requests
 */
class WaiterCallsService {

  /**
   * Create new waiter call (Public - no auth required for QR customers)
   */
  async createWaiterCall(request: CreateWaiterCallRequest): Promise<WaiterCall> {
    const response = await apiClient.post<WaiterCall>('/api/v1/waiter-calls', request)
    return response.data
  }

  /**
   * Get pending waiter calls for branch (Protected - requires auth)
   */
  async getPendingWaiterCalls(): Promise<WaiterCall[]> {
    const response = await apiClient.get<WaiterCall[]>('/api/v1/waiter-calls/pending')
    return response.data
  }

  /**
   * Resolve waiter call (Protected - requires auth)
   */
  async resolveWaiterCall(callId: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ success: boolean }>(`/api/v1/waiter-calls/${callId}`)
    return response.data
  }
}

// Export singleton instance
export const waiterCallsService = new WaiterCallsService()