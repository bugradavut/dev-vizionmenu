import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "@/config/database.service";
import { OrderMetrics, OrderStatus, OrderType, OrderSource } from "../../../types/order";

@Injectable()
export class OrderService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createOrder(orderData: any) {
    try {
      const supabase = this.databaseService.getAdminClient();

      // Generate order number
      const orderNumber = `ORDER-${Date.now()}`;

      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          ...orderData,
          order_number: orderNumber,
          status: "pending",
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new BadRequestException("Failed to create order");
      }

      return order;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to create order");
    }
  }

  async getOrders(restaurantId: string, filters: any) {
    try {
      const supabase = this.databaseService.getAdminClient();

      let query = supabase
        .from("orders")
        .select(
          `
          *,
          items:order_items(
            *,
            menu_item:menu_items(name, price)
          )
        `,
        )
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;

      query = query.range(offset, offset + limit - 1);

      const { data: orders, error } = await query;

      if (error) {
        throw new BadRequestException("Failed to get orders");
      }

      return orders;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to get orders");
    }
  }

  async getOrder(restaurantId: string, orderId: string) {
    try {
      const supabase = this.databaseService.getAdminClient();

      const { data: order, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          items:order_items(
            *,
            menu_item:menu_items(name, price),
            variations:order_item_variations(*),
            modifiers:order_item_modifiers(*)
          )
        `,
        )
        .eq("id", orderId)
        .eq("restaurant_id", restaurantId)
        .single();

      if (error || !order) {
        throw new NotFoundException("Order not found");
      }

      return order;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException("Failed to get order");
    }
  }

  async updateOrderStatus(
    restaurantId: string,
    orderId: string,
    statusData: any,
  ) {
    try {
      const supabase = this.databaseService.getAdminClient();

      const { data: order, error } = await supabase
        .from("orders")
        .update({
          status: statusData.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .eq("restaurant_id", restaurantId)
        .select()
        .single();

      if (error) {
        throw new BadRequestException("Failed to update order status");
      }

      // Log status change
      await supabase.from("order_status_updates").insert({
        order_id: orderId,
        old_status: order.status,
        new_status: statusData.status,
        reason: statusData.reason,
        updated_by: "system", // This would be the user ID
        created_at: new Date().toISOString(),
      });

      return order;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to update order status");
    }
  }

  async getOrderStats(restaurantId: string): Promise<OrderMetrics> {
    try {
      const supabase = this.databaseService.getAdminClient();

      const { data: orders, error } = await supabase
        .from("orders")
        .select("total_amount, status, type, source, created_at")
        .eq("restaurant_id", restaurantId);

      if (error) {
        throw new BadRequestException("Failed to get order stats");
      }

      const totalOrders = orders.length;
      const totalRevenue = orders.reduce(
        (sum, order) => sum + order.total_amount,
        0,
      );
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Status distribution
      const statusDistribution = orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<OrderStatus, number>);

      // Type distribution
      const typeDistribution = orders.reduce((acc, order) => {
        acc[order.type] = (acc[order.type] || 0) + 1;
        return acc;
      }, {} as Record<OrderType, number>);

      // Source distribution
      const sourceDistribution = orders.reduce((acc, order) => {
        acc[order.source] = (acc[order.source] || 0) + 1;
        return acc;
      }, {} as Record<OrderSource, number>);

      // Peak hours
      const hourlyOrders = orders.reduce((acc, order) => {
        const hour = new Date(order.created_at).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {});

      const peakHours = Object.entries(hourlyOrders)
        .map(([hour, count]) => ({
          hour: parseInt(hour),
          order_count: count as number,
        }))
        .sort((a, b) => b.order_count - a.order_count);

      return {
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        avg_order_value: avgOrderValue,
        order_status_distribution: statusDistribution,
        order_type_distribution: typeDistribution,
        order_source_distribution: sourceDistribution,
        peak_hours: peakHours,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to get order stats");
    }
  }
}
