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
import { MenuService } from "./menu.service";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { RestaurantRoleGuard } from "@/common/guards/restaurant-role.guard";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Public } from "@/common/decorators/public.decorator";

@ApiTags("menu")
@Controller("menu")
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Public()
  @Get("restaurant/:restaurantSlug")
  @ApiOperation({ summary: "Get public menu for restaurant" })
  @ApiResponse({ status: 200, description: "Restaurant menu" })
  async getPublicMenu(@Param("restaurantSlug") restaurantSlug: string) {
    return this.menuService.getPublicMenu(restaurantSlug);
  }

  @UseGuards(JwtAuthGuard, RestaurantRoleGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: "Get restaurant menu (admin)" })
  @ApiResponse({ status: 200, description: "Restaurant menu" })
  async getMenu(@CurrentUser() user: any) {
    return this.menuService.getMenu(user.restaurant_id);
  }

  @UseGuards(JwtAuthGuard, RestaurantRoleGuard)
  @ApiBearerAuth()
  @Post("categories")
  @Roles("chain_owner", "branch_manager")
  @ApiOperation({ summary: "Create menu category" })
  @ApiResponse({ status: 201, description: "Category created successfully" })
  async createCategory(@CurrentUser() user: any, @Body() categoryData: any) {
    return this.menuService.createCategory(user.restaurant_id, categoryData);
  }

  @UseGuards(JwtAuthGuard, RestaurantRoleGuard)
  @ApiBearerAuth()
  @Post("items")
  @Roles("chain_owner", "branch_manager")
  @ApiOperation({ summary: "Create menu item" })
  @ApiResponse({ status: 201, description: "Item created successfully" })
  async createItem(@CurrentUser() user: any, @Body() itemData: any) {
    return this.menuService.createItem(user.restaurant_id, itemData);
  }

  @UseGuards(JwtAuthGuard, RestaurantRoleGuard)
  @ApiBearerAuth()
  @Patch("items/:itemId")
  @Roles("chain_owner", "branch_manager")
  @ApiOperation({ summary: "Update menu item" })
  @ApiResponse({ status: 200, description: "Item updated successfully" })
  async updateItem(
    @CurrentUser() user: any,
    @Param("itemId") itemId: string,
    @Body() itemData: any,
  ) {
    return this.menuService.updateItem(user.restaurant_id, itemId, itemData);
  }

  @UseGuards(JwtAuthGuard, RestaurantRoleGuard)
  @ApiBearerAuth()
  @Delete("items/:itemId")
  @Roles("chain_owner", "branch_manager")
  @ApiOperation({ summary: "Delete menu item" })
  @ApiResponse({ status: 200, description: "Item deleted successfully" })
  async deleteItem(@CurrentUser() user: any, @Param("itemId") itemId: string) {
    return this.menuService.deleteItem(user.restaurant_id, itemId);
  }
}
