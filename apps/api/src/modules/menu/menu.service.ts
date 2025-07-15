import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "@/config/database.service";

@Injectable()
export class MenuService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getPublicMenu(restaurantSlug: string) {
    try {
      const supabase = this.databaseService.getAdminClient();

      // Get restaurant by slug
      const { data: restaurant, error: restaurantError } = await supabase
        .from("restaurants")
        .select("id, name, slug")
        .eq("slug", restaurantSlug)
        .single();

      if (restaurantError || !restaurant) {
        throw new NotFoundException("Restaurant not found");
      }

      // Get menu with categories and items
      const { data: menu, error: menuError } = await supabase
        .from("menus")
        .select(
          `
          *,
          categories:menu_categories(
            *,
            items:menu_items(
              *,
              variations:menu_item_variations(*),
              modifiers:menu_item_modifiers(
                *,
                options:modifier_options(*)
              )
            )
          )
        `,
        )
        .eq("restaurant_id", restaurant.id)
        .eq("is_active", true)
        .order("display_order");

      if (menuError) {
        throw new BadRequestException("Failed to get menu");
      }

      return {
        restaurant,
        menu: menu || [],
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException("Failed to get public menu");
    }
  }

  async getMenu(restaurantId: string) {
    try {
      const supabase = this.databaseService.getAdminClient();

      const { data: menu, error } = await supabase
        .from("menus")
        .select(
          `
          *,
          categories:menu_categories(
            *,
            items:menu_items(
              *,
              variations:menu_item_variations(*),
              modifiers:menu_item_modifiers(
                *,
                options:modifier_options(*)
              )
            )
          )
        `,
        )
        .eq("restaurant_id", restaurantId)
        .order("display_order");

      if (error) {
        throw new BadRequestException("Failed to get menu");
      }

      return menu;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to get menu");
    }
  }

  async createCategory(restaurantId: string, categoryData: any) {
    try {
      const supabase = this.databaseService.getAdminClient();

      const { data: category, error } = await supabase
        .from("menu_categories")
        .insert({
          ...categoryData,
          restaurant_id: restaurantId,
        })
        .select()
        .single();

      if (error) {
        throw new BadRequestException("Failed to create category");
      }

      return category;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to create category");
    }
  }

  async createItem(restaurantId: string, itemData: any) {
    try {
      const supabase = this.databaseService.getAdminClient();

      const { data: item, error } = await supabase
        .from("menu_items")
        .insert({
          ...itemData,
          restaurant_id: restaurantId,
        })
        .select()
        .single();

      if (error) {
        throw new BadRequestException("Failed to create item");
      }

      return item;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to create item");
    }
  }

  async updateItem(restaurantId: string, itemId: string, itemData: any) {
    try {
      const supabase = this.databaseService.getAdminClient();

      const { data: item, error } = await supabase
        .from("menu_items")
        .update({
          ...itemData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", itemId)
        .eq("restaurant_id", restaurantId)
        .select()
        .single();

      if (error) {
        throw new BadRequestException("Failed to update item");
      }

      return item;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to update item");
    }
  }

  async deleteItem(restaurantId: string, itemId: string) {
    try {
      const supabase = this.databaseService.getAdminClient();

      const { error } = await supabase
        .from("menu_items")
        .delete()
        .eq("id", itemId)
        .eq("restaurant_id", restaurantId);

      if (error) {
        throw new BadRequestException("Failed to delete item");
      }

      return { message: "Item deleted successfully" };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to delete item");
    }
  }
}
