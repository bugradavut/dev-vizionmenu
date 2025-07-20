import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { OrderService } from "./order.service";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { RestaurantRoleGuard } from "@/common/guards/restaurant-role.guard";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Public } from "@/common/decorators/public.decorator";

@ApiTags("order")
@Controller("order")
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: "Create new order (public)" })
  @ApiResponse({ status: 201, description: "Order created successfully" })
  async createOrder(@Body() orderData: any) {
    return this.orderService.createOrder(orderData);
  }

  @UseGuards(JwtAuthGuard, RestaurantRoleGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: "Get restaurant orders" })
  @ApiResponse({ status: 200, description: "Restaurant orders" })
  async getOrders(
    @CurrentUser() user: any,
    @Query("status") status?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.orderService.getOrders(user.restaurant_id, {
      status,
      page,
      limit,
    });
  }

  @UseGuards(JwtAuthGuard, RestaurantRoleGuard)
  @ApiBearerAuth()
  @Get(":orderId")
  @ApiOperation({ summary: "Get order details" })
  @ApiResponse({ status: 200, description: "Order details" })
  async getOrder(@CurrentUser() user: any, @Param("orderId") orderId: string) {
    return this.orderService.getOrder(user.restaurant_id, orderId);
  }

  @UseGuards(JwtAuthGuard, RestaurantRoleGuard)
  @ApiBearerAuth()
  @Patch(":orderId/status")
  @Roles("chain_owner", "branch_manager", "branch_staff")
  @ApiOperation({ summary: "Update order status" })
  @ApiResponse({ status: 200, description: "Order status updated" })
  async updateOrderStatus(
    @CurrentUser() user: any,
    @Param("orderId") orderId: string,
    @Body() statusData: { status: string; reason?: string },
  ) {
    return this.orderService.updateOrderStatus(
      user.restaurant_id,
      orderId,
      statusData,
    );
  }

  @UseGuards(JwtAuthGuard, RestaurantRoleGuard)
  @ApiBearerAuth()
  @Get("stats/summary")
  @Roles("chain_owner", "branch_manager")
  @ApiOperation({ summary: "Get order statistics" })
  @ApiResponse({ status: 200, description: "Order statistics" })
  async getOrderStats(@CurrentUser() user: any) {
    return this.orderService.getOrderStats(user.restaurant_id);
  }
}
