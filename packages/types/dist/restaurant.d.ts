export interface Restaurant {
    id: string;
    name: string;
    slug: string;
    description?: string;
    logo?: string;
    cover_image?: string;
    phone?: string;
    email?: string;
    address?: RestaurantAddress;
    business_hours?: BusinessHours[];
    settings: RestaurantSettings;
    created_at: string;
    updated_at: string;
}
export interface RestaurantAddress {
    street: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
    latitude?: number;
    longitude?: number;
}
export interface BusinessHours {
    day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
    open_time: string;
    close_time: string;
    is_closed: boolean;
}
export interface RestaurantSettings {
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
export interface RestaurantStats {
    total_orders: number;
    total_revenue: number;
    avg_order_value: number;
    today_orders: number;
    today_revenue: number;
    pending_orders: number;
}
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
//# sourceMappingURL=restaurant.d.ts.map