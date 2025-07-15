import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { RestaurantService } from "./restaurant.service";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { RestaurantRoleGuard } from "@/common/guards/restaurant-role.guard";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Restaurant, RestaurantStats, User } from "@vision-menu/types";

@ApiTags("restaurant")
@Controller("restaurant")
@UseGuards(JwtAuthGuard, RestaurantRoleGuard)
@ApiBearerAuth()
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  @Get()
  @ApiOperation({ summary: "Get current restaurant details" })
  @ApiResponse({ status: 200, description: "Restaurant details" })
  async getRestaurant(@CurrentUser() user: User): Promise<Restaurant> {
    return this.restaurantService.getRestaurant(user.restaurant_id);
  }

  @Patch()
  @Roles("owner", "manager")
  @ApiOperation({ summary: "Update restaurant details" })
  @ApiResponse({ status: 200, description: "Restaurant updated successfully" })
  async updateRestaurant(
    @CurrentUser() user: User,
    @Body() updateRestaurantDto: Partial<Restaurant>,
  ): Promise<Restaurant> {
    return this.restaurantService.updateRestaurant(
      user.restaurant_id,
      updateRestaurantDto,
    );
  }

  @Get("stats")
  @Roles("owner", "manager")
  @ApiOperation({ summary: "Get restaurant statistics" })
  @ApiResponse({ status: 200, description: "Restaurant statistics" })
  async getRestaurantStats(
    @CurrentUser() user: User,
  ): Promise<RestaurantStats> {
    return this.restaurantService.getRestaurantStats(user.restaurant_id);
  }

  @Get("users")
  @Roles("owner", "manager")
  @ApiOperation({ summary: "Get restaurant users" })
  @ApiResponse({ status: 200, description: "Restaurant users" })
  async getRestaurantUsers(@CurrentUser() user: User) {
    return this.restaurantService.getRestaurantUsers(user.restaurant_id);
  }

  @Post("users/invite")
  @Roles("owner", "manager")
  @ApiOperation({ summary: "Invite user to restaurant" })
  @ApiResponse({ status: 201, description: "User invited successfully" })
  async inviteUser(
    @CurrentUser() user: User,
    @Body() inviteDto: { email: string; role: string; permissions: string[] },
  ) {
    return this.restaurantService.inviteUser(user.restaurant_id, inviteDto);
  }

  @Delete("users/:userId")
  @Roles("owner")
  @ApiOperation({ summary: "Remove user from restaurant" })
  @ApiResponse({ status: 200, description: "User removed successfully" })
  async removeUser(@CurrentUser() user: User, @Param("userId") userId: string) {
    return this.restaurantService.removeUser(user.restaurant_id, userId);
  }
}
