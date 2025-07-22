// Restaurant Chain (Multi-brand support)
export interface RestaurantChain {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  cover_image_url?: string;
  settings: ChainSettings;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  branches?: Branch[];
}

// Individual Branch
export interface Branch {
  id: string;
  chain_id: string;
  name: string;
  slug: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: BranchAddress;
  location?: {
    latitude: number;
    longitude: number;
  };
  business_hours?: BusinessHours[];
  settings: BranchSettings;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  chain?: RestaurantChain;
}

// Legacy Restaurant interface (for backward compatibility)
export interface Restaurant extends Branch {
  // Deprecated: Use Branch instead
}

export interface BranchAddress {
  street: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
}

// Legacy alias
export interface RestaurantAddress extends BranchAddress {}

export interface BusinessHours {
  day:
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday";
  open_time: string; // HH:MM format
  close_time: string; // HH:MM format
  is_closed: boolean;
}

export interface ChainSettings {
  default_currency: string;
  default_tax_rate: number;
  default_service_fee: number;
  branding: {
    primary_color?: string;
    secondary_color?: string;
    font_family?: string;
  };
  features: {
    multi_branch_reporting: boolean;
    centralized_menu_management: boolean;
    cross_branch_transfers: boolean;
  };
}

export interface BranchSettings {
  currency: string;
  tax_rate: number;
  service_fee: number;
  min_order_amount: number;
  max_delivery_distance: number;
  delivery_fee: number;
  pickup_enabled: boolean;
  delivery_enabled: boolean;
  table_service_enabled: boolean;
  qr_ordering_enabled: boolean;
  online_payments_enabled: boolean;
  third_party_integration_enabled: boolean;
}

// Legacy alias
export interface RestaurantSettings extends BranchSettings {}

export interface BranchStats {
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  today_orders: number;
  today_revenue: number;
  pending_orders: number;
}

export interface ChainStats {
  total_branches: number;
  active_branches: number;
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  today_orders: number;
  today_revenue: number;
  pending_orders: number;
  branch_stats: Record<string, BranchStats>; // branch_id -> stats
}

// Legacy alias
export interface RestaurantStats extends BranchStats {}

// Note: BranchUser interface moved to auth.ts to avoid duplicate exports

// Legacy types (deprecated)
export type RestaurantRole = "owner" | "manager" | "staff" | "viewer";

export interface RestaurantUser {
  id: string;
  restaurant_id: string;
  user_id: string;
  role: RestaurantRole;
  permissions: string[];
  created_at: string;
  updated_at: string;
}
