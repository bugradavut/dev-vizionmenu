export interface Campaign {
  id: string;
  branch_id: string;
  code: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  valid_from: string;
  valid_until: string;
  applicable_categories: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // 🆕 NEW FIELD: Usage statistics from backend
  usage_stats?: {
    totalUsages: number;
    totalSavings: number;
  };
}

export interface CreateCampaignData {
  code: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  valid_from?: string;
  valid_until: string;
  applicable_categories?: string[] | null;
  applicable_items?: string[] | null;
}

export interface UpdateCampaignData {
  code?: string;
  type?: 'percentage' | 'fixed_amount';
  value?: number;
  valid_from?: string;
  valid_until?: string;
  applicable_categories?: string[] | null;
  is_active?: boolean;
}

export interface CampaignValidationResult {
  isValid: boolean;
  discountAmount: number;
  message: string;
  campaign?: {
    id: string;
    code: string;
    type: 'percentage' | 'fixed_amount';
    value: number;
  };
}

export interface CampaignUsage {
  id: string;
  coupon_id: string;
  order_id: string;
  discount_amount: number;
  used_at: string;
}

export interface CampaignsListResponse {
  campaigns: Campaign[];
  total: number;
  page: number;
  limit: number;
}

// 🆕 NEW: Campaign Status Management
export enum CampaignStatus {
  ACTIVE = 'active',           // is_active=true AND not expired  
  EXPIRED = 'expired',         // valid_until < today
  INACTIVE = 'inactive',       // is_active=false AND not expired
  ALL = 'all'
}

// 🆕 NEW: Helper function to determine campaign status
export function getCampaignStatus(campaign: Campaign): CampaignStatus {
  const isExpired = new Date(campaign.valid_until) < new Date()
  if (isExpired) return CampaignStatus.EXPIRED
  return campaign.is_active ? CampaignStatus.ACTIVE : CampaignStatus.INACTIVE
}