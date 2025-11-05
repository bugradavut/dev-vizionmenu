/**
 * Daily Closing Types
 * SW-78 FO-115: Quebec WEB-SRM Daily Closing Receipts (FER)
 */

export type DailyClosingStatus = 'draft' | 'completed' | 'cancelled';

export interface DailyClosing {
  id: string;
  branch_id: string;
  closing_date: string; // YYYY-MM-DD
  status: DailyClosingStatus;

  // Financial summary
  total_sales: number;
  total_refunds: number;
  net_sales: number;
  gst_collected: number;
  qst_collected: number;
  transaction_count: number;

  // Payment source breakdown
  terminal_total: number; // Terminal/kasada ödeme
  online_total: number;   // Online ödeme

  // Timestamps
  started_at: string;
  completed_at?: string;
  cancelled_at?: string;

  // Audit trail
  created_by: string;
  cancelled_by?: string;
  cancellation_reason?: string;

  // WEB-SRM integration
  websrm_transaction_id?: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface DailySummary {
  total_sales: number;
  total_refunds: number;
  net_sales: number;
  transaction_count: number;
  gst_collected: number;
  qst_collected: number;
  terminal_total: number; // Terminal/kasada ödeme
  online_total: number;   // Online ödeme
}

export interface DailyClosingListResponse {
  closings: DailyClosing[];
  total: number;
  page: number;
  limit: number;
}

export interface DailyClosingFilters {
  status?: DailyClosingStatus;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
  branch_id?: string;
}

export interface StartDailyClosingRequest {
  date: string; // YYYY-MM-DD
}

export interface CancelDailyClosingRequest {
  reason?: string;
}

export interface DailyClosingApiResponse<T = DailyClosing> {
  success?: boolean;
  data: T;
  message?: string;
}

export interface DailyClosingError {
  error: {
    code: string;
    message: string;
  };
}
