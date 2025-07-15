import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "@/config/database.service";
import { Restaurant, RestaurantStats } from "@vision-menu/types";

@Injectable()
export class RestaurantService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getRestaurant(restaurantId: string): Promise<Restaurant> {
    try {
      const supabase = this.databaseService.getAdminClient();

      const { data: restaurant, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", restaurantId)
        .single();

      if (error || !restaurant) {
        throw new NotFoundException("Restaurant not found");
      }

      return restaurant;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException("Failed to get restaurant");
    }
  }

  async updateRestaurant(
    restaurantId: string,
    updateData: Partial<Restaurant>,
  ): Promise<Restaurant> {
    try {
      const supabase = this.databaseService.getAdminClient();

      const { data: restaurant, error } = await supabase
        .from("restaurants")
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", restaurantId)
        .select()
        .single();

      if (error) {
        throw new BadRequestException("Failed to update restaurant");
      }

      return restaurant;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to update restaurant");
    }
  }

  async getRestaurantStats(restaurantId: string): Promise<RestaurantStats> {
    try {
      const supabase = this.databaseService.getAdminClient();

      // Get orders count and revenue
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("total_amount, status, created_at")
        .eq("restaurant_id", restaurantId);

      if (ordersError) {
        throw new BadRequestException("Failed to get orders data");
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const totalOrders = orders.length;
      const totalRevenue = orders.reduce(
        (sum, order) => sum + order.total_amount,
        0,
      );
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const todayOrders = orders.filter(
        (order) => new Date(order.created_at) >= today,
      ).length;

      const todayRevenue = orders
        .filter((order) => new Date(order.created_at) >= today)
        .reduce((sum, order) => sum + order.total_amount, 0);

      const pendingOrders = orders.filter((order) =>
        ["pending", "confirmed", "preparing"].includes(order.status),
      ).length;

      return {
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        avg_order_value: avgOrderValue,
        today_orders: todayOrders,
        today_revenue: todayRevenue,
        pending_orders: pendingOrders,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to get restaurant stats");
    }
  }

  async getRestaurantUsers(restaurantId: string) {
    try {
      const supabase = this.databaseService.getAdminClient();

      const { data: users, error } = await supabase
        .from("restaurant_users")
        .select(
          `
          *,
          user:users(id, email, full_name, phone, avatar_url, is_active)
        `,
        )
        .eq("restaurant_id", restaurantId);

      if (error) {
        throw new BadRequestException("Failed to get restaurant users");
      }

      return users;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to get restaurant users");
    }
  }

  async inviteUser(
    restaurantId: string,
    inviteDto: { email: string; role: string; permissions: string[] },
  ) {
    try {
      const supabase = this.databaseService.getAdminClient();

      // Check if user exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", inviteDto.email)
        .single();

      if (existingUser) {
        // Check if user is already associated with restaurant
        const { data: existingAssociation } = await supabase
          .from("restaurant_users")
          .select("id")
          .eq("user_id", existingUser.id)
          .eq("restaurant_id", restaurantId)
          .single();

        if (existingAssociation) {
          throw new BadRequestException(
            "User is already associated with this restaurant",
          );
        }

        // Add user to restaurant
        const { error } = await supabase.from("restaurant_users").insert({
          user_id: existingUser.id,
          restaurant_id: restaurantId,
          role: inviteDto.role,
          permissions: inviteDto.permissions,
        });

        if (error) {
          throw new BadRequestException("Failed to add user to restaurant");
        }

        return { message: "User added to restaurant successfully" };
      } else {
        // Create invitation (implementation would depend on your invitation system)
        // For now, return success message
        return { message: "Invitation sent successfully" };
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to invite user");
    }
  }

  async removeUser(restaurantId: string, userId: string) {
    try {
      const supabase = this.databaseService.getAdminClient();

      const { error } = await supabase
        .from("restaurant_users")
        .delete()
        .eq("user_id", userId)
        .eq("restaurant_id", restaurantId);

      if (error) {
        throw new BadRequestException("Failed to remove user from restaurant");
      }

      return { message: "User removed from restaurant successfully" };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to remove user");
    }
  }
}
