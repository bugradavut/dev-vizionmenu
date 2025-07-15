export interface Menu {
    id: string;
    restaurant_id: string;
    name: string;
    description?: string;
    is_active: boolean;
    display_order: number;
    categories: MenuCategory[];
    created_at: string;
    updated_at: string;
}
export interface MenuCategory {
    id: string;
    menu_id: string;
    name: string;
    description?: string;
    image?: string;
    is_active: boolean;
    display_order: number;
    items: MenuItem[];
    created_at: string;
    updated_at: string;
}
export interface MenuItem {
    id: string;
    category_id: string;
    name: string;
    description?: string;
    image?: string;
    price: number;
    compare_at_price?: number;
    cost_price?: number;
    is_active: boolean;
    is_featured: boolean;
    display_order: number;
    preparation_time?: number;
    calories?: number;
    allergens?: string[];
    dietary_info?: DietaryInfo[];
    variations?: MenuItemVariation[];
    modifiers?: MenuItemModifier[];
    created_at: string;
    updated_at: string;
}
export interface MenuItemVariation {
    id: string;
    item_id: string;
    name: string;
    price_adjustment: number;
    is_default: boolean;
    display_order: number;
}
export interface MenuItemModifier {
    id: string;
    item_id: string;
    modifier_group_id: string;
    name: string;
    description?: string;
    price_adjustment: number;
    is_required: boolean;
    max_selections: number;
    options: ModifierOption[];
    display_order: number;
}
export interface ModifierOption {
    id: string;
    modifier_id: string;
    name: string;
    price_adjustment: number;
    is_default: boolean;
    display_order: number;
}
export type DietaryInfo = "vegetarian" | "vegan" | "gluten-free" | "dairy-free" | "nut-free" | "spicy" | "halal" | "kosher";
export interface MenuAvailability {
    id: string;
    item_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
}
export interface MenuItemInventory {
    id: string;
    item_id: string;
    current_stock: number;
    low_stock_threshold: number;
    is_unlimited: boolean;
    is_out_of_stock: boolean;
    updated_at: string;
}
//# sourceMappingURL=menu.d.ts.map