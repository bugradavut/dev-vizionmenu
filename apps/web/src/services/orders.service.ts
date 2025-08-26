"use client";

/**
 * Order Service for VizionMenu
 * Handles all order-related API operations with TypeScript types
 */

import { apiClient, type ApiResponse } from './api-client';

// Order-related TypeScript interfaces
export interface OrderCustomer {
  name: string;
  phone: string;
  email?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  special_instructions?: string;
  variants?: Array<{
    name: string;
    price: number;
  }>;
}

export interface OrderPricing {
  subtotal: number;
  tax_amount: number;
  service_fee: number;
  delivery_fee: number;
  total: number;
}

export interface DeliveryAddress {
  street: string;
  city: string;
  province: string;
  postalCode: string;
  unitNumber?: string;
  buzzerCode?: string;
  deliveryInstructions?: string;
  addressType?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: OrderCustomer;
  source: 'qr_code' | 'uber_eats' | 'doordash' | 'phone' | 'web';
  status: 'preparing' | 'scheduled' | 'ready' | 'completed' | 'cancelled' | 'rejected';
  order_type: string;
  table_number?: string;
  payment_method?: string;
  pricing: OrderPricing;
  notes?: string;
  special_instructions?: string;
  estimated_ready_time?: string;
  scheduled_datetime?: string;
  delivery_address?: DeliveryAddress;
  third_party_order_id?: string;
  third_party_platform?: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderListParams {
  page?: number;
  limit?: number;
  status?: string;
  source?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface OrdersListResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
}

export interface OrderStatusUpdateRequest {
  status: 'preparing' | 'scheduled' | 'ready' | 'completed' | 'cancelled' | 'rejected';
  notes?: string;
}

export interface CreateOrderRequest {
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    special_instructions?: string;
  }>;
  orderType: 'dine_in' | 'takeaway' | 'delivery' | 'pickup';
  source: 'qr_code' | 'web';
  tableNumber?: string;
  notes?: string;
  specialInstructions?: string;
}

export interface CreateOrderResponse {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    createdAt: string;
  };
  autoAccepted: boolean;
  autoAcceptMessage?: string;
}

class OrdersService {
  /**
   * Get list of orders with filtering and pagination
   */
  async getOrders(params?: OrderListParams): Promise<ApiResponse<OrdersListResponse>> {
    const queryParams: Record<string, unknown> = {};
    
    if (params?.page) queryParams.page = params.page;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.status && params.status !== 'all') queryParams.status = params.status;
    if (params?.source) queryParams.source = params.source;
    if (params?.date_from) queryParams.date_from = params.date_from;
    if (params?.date_to) queryParams.date_to = params.date_to;
    if (params?.search) queryParams.search = params.search;

    return apiClient.get<OrdersListResponse>('/api/v1/orders', queryParams);
  }

  /**
   * Get detailed order information by ID
   */
  async getOrderById(orderId: string): Promise<ApiResponse<Order>> {
    return apiClient.get<Order>(`/api/v1/orders/${orderId}`);
  }

  /**
   * Create a new order (internal orders: QR code, web)
   */
  async createOrder(orderData: CreateOrderRequest): Promise<ApiResponse<CreateOrderResponse>> {
    return apiClient.post<CreateOrderResponse>('/api/v1/orders', orderData);
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string, 
    updateData: OrderStatusUpdateRequest
  ): Promise<ApiResponse<{ success: boolean; message: string; updated_order: Order }>> {
    return apiClient.patch(`/api/v1/orders/${orderId}/status`, updateData);
  }

  /**
   * Get live orders (preparing only in new simplified flow)
   */
  async getLiveOrders(params?: Omit<OrderListParams, 'status'>): Promise<ApiResponse<OrdersListResponse>> {
    return this.getOrders({
      ...params,
      status: 'preparing,scheduled' // Include both preparing and scheduled orders for live view
    });
  }

  /**
   * Get order history (completed, cancelled)
   */
  async getOrderHistory(params?: Omit<OrderListParams, 'status'>): Promise<ApiResponse<OrdersListResponse>> {
    return this.getOrders({
      ...params,
      status: 'completed,cancelled'
    });
  }

  /**
   * Get orders by status
   */
  async getOrdersByStatus(
    status: Order['status'], 
    params?: Omit<OrderListParams, 'status'>
  ): Promise<ApiResponse<OrdersListResponse>> {
    return this.getOrders({
      ...params,
      status
    });
  }

  /**
   * Search orders by query string
   */
  async searchOrders(
    query: string, 
    params?: Omit<OrderListParams, 'search'>
  ): Promise<ApiResponse<OrdersListResponse>> {
    return this.getOrders({
      ...params,
      search: query
    });
  }

  /**
   * Helper method to transform API order data to frontend format
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transformOrder(apiOrder: any): Order {
    
    return {
      id: apiOrder.id,
      orderNumber: apiOrder.orderNumber || apiOrder.order_number || `ORDER-${apiOrder.id.slice(-6).toUpperCase()}`,
      customer: {
        name: apiOrder.customer?.name || apiOrder.customerName || 'Unknown Customer',
        phone: apiOrder.customer?.phone || apiOrder.customerPhone || '',
        email: apiOrder.customer?.email || apiOrder.customerEmail || undefined,
      },
      source: apiOrder.source || 'web',
      status: apiOrder.status || apiOrder.order_status,
      order_type: apiOrder.orderType || apiOrder.order_type,
      table_number: apiOrder.tableNumber || apiOrder.table_number || undefined,
      payment_method: apiOrder.payment_method || undefined,
      pricing: {
        subtotal: apiOrder.pricing?.subtotal || apiOrder.subtotal || 0,
        tax_amount: apiOrder.pricing?.taxAmount || apiOrder.tax_amount || 0,
        service_fee: apiOrder.pricing?.serviceFee || apiOrder.service_fee || 0,
        delivery_fee: apiOrder.pricing?.deliveryFee || apiOrder.delivery_fee || 0,
        total: apiOrder.pricing?.total || apiOrder.total_amount || 0,
      },
      notes: apiOrder.notes || undefined,
      special_instructions: apiOrder.specialInstructions || apiOrder.special_instructions || undefined,
      estimated_ready_time: apiOrder.estimatedReadyTime || apiOrder.estimated_ready_time || undefined,
      delivery_address: apiOrder.delivery_address || undefined, // Add delivery address mapping
      third_party_order_id: apiOrder.third_party_order_id || undefined,
      third_party_platform: apiOrder.third_party_platform || undefined,
      created_at: apiOrder.timestamps?.createdAt || apiOrder.created_at,
      updated_at: apiOrder.timestamps?.updatedAt || apiOrder.updated_at,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: apiOrder.items?.map((item: any) => ({
        id: item.id,
        name: item.name, // API already sends 'name' field
        price: parseFloat(item.price || '0'),
        quantity: item.quantity || 1,
        total: parseFloat(item.total || '0'),
        special_instructions: item.special_instructions || undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        variants: item.variants?.map((variant: any) => ({
          name: variant.name, // API already sends 'name' field
          price: parseFloat(variant.price || '0'),
        })) || [],
      })) || [],
    };
  }

  /**
   * Helper method to transform API response to frontend format
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transformOrdersResponse(apiResponse: any): OrdersListResponse {
    const ordersArray = apiResponse.data || apiResponse.orders || [];
    
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orders: ordersArray.map((order: any) => this.transformOrder(order)),
      total: apiResponse.meta?.total || apiResponse.total || 0,
      page: apiResponse.meta?.page || apiResponse.page || 1,
      limit: apiResponse.meta?.limit || apiResponse.limit || 20,
    };
  }
}

// Export singleton instance
export const ordersService = new OrdersService();
export default ordersService;