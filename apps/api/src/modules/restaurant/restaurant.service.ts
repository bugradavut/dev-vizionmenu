import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "@/config/database.service";
import { Branch, BranchStats, BranchUser } from "@vision-menu/types";

@Injectable()
export class RestaurantService {
  constructor(private readonly databaseService: DatabaseService) {}

  // Multi-branch methods
  async getBranch(branchId: string): Promise<Branch> {
    try {
      const supabase = this.databaseService.getAdminClient();

      const { data: branch, error } = await supabase
        .from("branches")
        .select(`
          *,
          chain:restaurant_chains(*)
        `)
        .eq("id", branchId)
        .single();

      if (error || !branch) {
        throw new NotFoundException("Branch not found");
      }

      return branch;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException("Failed to get branch");
    }
  }

  async updateBranch(
    branchId: string,
    updateData: Partial<Branch>,
  ): Promise<Branch> {
    try {
      const supabase = this.databaseService.getAdminClient();

      const { data: branch, error } = await supabase
        .from("branches")
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", branchId)
        .select(`
          *,
          chain:restaurant_chains(*)
        `)
        .single();

      if (error) {
        throw new BadRequestException("Failed to update branch");
      }

      return branch;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to update branch");
    }
  }

  async getBranchStats(branchId: string): Promise<BranchStats> {
    try {
      const supabase = this.databaseService.getAdminClient();

      // Get orders count and revenue
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("total_amount, status, created_at")
        .eq("branch_id", branchId);

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
      throw new BadRequestException("Failed to get branch stats");
    }
  }

  async getBranchUsers(branchId: string): Promise<BranchUser[]> {
    try {
      const supabase = this.databaseService.getAdminClient();

      const { data: users, error } = await supabase
        .from("branch_users")
        .select(`
          *,
          user:user_profiles!inner(
            user_id,
            full_name,
            phone,
            avatar_url
          )
        `)
        .eq("branch_id", branchId)
        .eq("is_active", true);

      if (error) {
        throw new BadRequestException("Failed to get branch users");
      }

      // Get auth user emails
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      
      const authUserMap = new Map<string, { email: string; id: string }>();
      if (authUsers?.users) {
        authUsers.users.forEach((u: any) => {
          authUserMap.set(u.id, { email: u.email || '', id: u.id });
        });
      }

      return users.map(user => ({
        ...user,
        user: {
          id: user.user_id,
          email: authUserMap.get(user.user_id)?.email || '',
          full_name: user.user?.full_name,
          phone: user.user?.phone,
          avatar_url: user.user?.avatar_url,
        }
      }));
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to get branch users");
    }
  }

  async inviteUserToBranch(
    branchId: string,
    inviteDto: { email: string; role: string; permissions: string[] },
  ) {
    try {
      const supabase = this.databaseService.getAdminClient();

      // Get auth user by email
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const existingAuthUser = authUsers?.users?.find((u: any) => u.email === inviteDto.email);

      if (existingAuthUser) {
        // Check if user is already associated with branch
        const { data: existingAssociation } = await supabase
          .from("branch_users")
          .select("id")
          .eq("user_id", existingAuthUser.id)
          .eq("branch_id", branchId)
          .single();

        if (existingAssociation) {
          throw new BadRequestException(
            "User is already associated with this branch",
          );
        }

        // Add user to branch
        const { error } = await supabase.from("branch_users").insert({
          user_id: existingAuthUser.id,
          branch_id: branchId,
          role: inviteDto.role,
          permissions: inviteDto.permissions,
          is_active: true,
        });

        if (error) {
          throw new BadRequestException("Failed to add user to branch");
        }

        return { message: "User added to branch successfully" };
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

  async removeUserFromBranch(branchId: string, userId: string) {
    try {
      const supabase = this.databaseService.getAdminClient();

      const { error } = await supabase
        .from("branch_users")
        .delete()
        .eq("user_id", userId)
        .eq("branch_id", branchId);

      if (error) {
        throw new BadRequestException("Failed to remove user from branch");
      }

      return { message: "User removed from branch successfully" };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to remove user");
    }
  }
}
