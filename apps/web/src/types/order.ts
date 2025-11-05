export interface Order {
  id: string;
  restaurant_id: string;
  order_number: string;
  customer_info: CustomerInfo;
  items: OrderItem[];
  subtotal: number;
  tax_amount: number;
  service_fee: number;
  delivery_fee: number;
  discount_amount: number;
  total_amount: number;
  status: OrderStatus;
  type: OrderType;
  source: OrderSource;
  payment_info?: PaymentInfo;
  delivery_info?: DeliveryInfo;
  table_info?: TableInfo;
  special_instructions?: string;
  estimated_ready_time?: string;
  actual_ready_time?: string;
  created_at: string;
  updated_at: string;
  total_refunded?: number; // SW-78 FO-115: Total refunded amount for partial/full refunds
  refund_count?: number; // SW-78 FO-115: Number of refunds processed
  last_refund_at?: string; // SW-78 FO-115: Timestamp of most recent refund
}

export interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
  address?: CustomerAddress;
}

export interface CustomerAddress {
  street: string;
  city: string;
  state: string;
  postal_code: string;
  apartment?: string;
  delivery_instructions?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  variation?: OrderItemVariation;
  modifiers?: OrderItemModifier[];
  special_instructions?: string;
  refunded_quantity?: number; // SW-78 FO-115: Number of items refunded from this line item
  refund_amount?: number; // SW-78 FO-115: Total amount refunded for this line item
}

export interface OrderItemVariation {
  id: string;
  name: string;
  price_adjustment: number;
}

export interface OrderItemModifier {
  id: string;
  name: string;
  price_adjustment: number;
  options: OrderItemModifierOption[];
}

export interface OrderItemModifierOption {
  id: string;
  name: string;
  price_adjustment: number;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "scheduled"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled"
  | "rejected"
  | "refunded";

export type OrderType = "dine_in" | "takeaway" | "delivery" | "table_service";

export type OrderSource =
  | "web"
  | "mobile"
  | "qr_code"
  | "phone"
  | "uber_eats"
  | "doordash"
  | "grubhub"
  | "admin";

export interface PaymentInfo {
  method: PaymentMethod;
  status: PaymentStatus;
  stripe_payment_intent_id?: string;
  transaction_id?: string;
  paid_amount: number;
  refunded_amount: number;
  created_at: string;
  updated_at: string;
}

export type PaymentMethod =
  | "credit_card"
  | "debit_card"
  | "cash"
  | "digital_wallet"
  | "bank_transfer";

export type PaymentStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "refunded"
  | "partially_refunded";

export interface DeliveryInfo {
  address: CustomerAddress;
  driver_name?: string;
  driver_phone?: string;
  estimated_delivery_time?: string;
  actual_delivery_time?: string;
  delivery_fee: number;
}

export interface TableInfo {
  table_number: string;
  table_name?: string;
  area?: string;
  server_name?: string;
}

export interface OrderStatusUpdate {
  id: string;
  order_id: string;
  old_status: OrderStatus;
  new_status: OrderStatus;
  reason?: string;
  updated_by: string;
  created_at: string;
}

export interface OrderMetrics {
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  order_status_distribution: Record<OrderStatus, number>;
  order_type_distribution: Record<OrderType, number>;
  order_source_distribution: Record<OrderSource, number>;
  peak_hours: Array<{
    hour: number;
    order_count: number;
  }>;
}
