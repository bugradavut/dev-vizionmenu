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