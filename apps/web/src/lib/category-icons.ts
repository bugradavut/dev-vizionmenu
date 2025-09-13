/**
 * Category Icons Library - Lucide React Icons for Menu Categories
 * Professional food & restaurant icons for category management
 */

import {
  UtensilsCrossed,
  Coffee,
  Pizza,
  Salad,
  IceCream,
  Wine,
  Cookie,
  Cherry,
  Beef,
  Fish,
  Soup,
  Sandwich,
  Cake,
  Martini,
  ChefHat,
  Wheat,
  Apple,
  Croissant,
  Banana,
  Grape,
  // New food icons
  Utensils,
  CupSoda,
  Drumstick,
  EggFried,
  Ham,
  IceCreamCone,
  Popcorn,
  Donut,
  CakeSlice,
  GlassWater,
  Milk,
  Beer,
  Carrot,
  LeafyGreen,
  Candy
} from 'lucide-react'

// Icon mapping for category selection
export const CATEGORY_ICONS = {
  // General Categories
  'UtensilsCrossed': { icon: UtensilsCrossed, label: 'General Food', category: 'general' },
  'ChefHat': { icon: ChefHat, label: 'Chef Specials', category: 'general' },
  'Utensils': { icon: Utensils, label: 'Restaurant', category: 'general' },
  
  // Food Categories - Main Dishes
  'Pizza': { icon: Pizza, label: 'Pizza', category: 'food' },
  'Sandwich': { icon: Sandwich, label: 'Sandwiches', category: 'food' },
  'Soup': { icon: Soup, label: 'Soups', category: 'food' },
  'Salad': { icon: Salad, label: 'Salads', category: 'food' },
  'Beef': { icon: Beef, label: 'Meat Dishes', category: 'food' },
  'Fish': { icon: Fish, label: 'Seafood', category: 'food' },
  'Drumstick': { icon: Drumstick, label: 'Chicken', category: 'food' },
  'Ham': { icon: Ham, label: 'Ham & Deli', category: 'food' },
  'EggFried': { icon: EggFried, label: 'Breakfast', category: 'food' },
  
  // Bread & Grains
  'Wheat': { icon: Wheat, label: 'Bread & Grains', category: 'food' },
  'Croissant': { icon: Croissant, label: 'Pastries', category: 'food' },
  
  // Asian Food (using available icons as close matches)
  'LeafyGreen': { icon: LeafyGreen, label: 'Asian/Healthy', category: 'food' },
  
  // Beverages
  'Coffee': { icon: Coffee, label: 'Coffee & Hot Drinks', category: 'beverages' },
  'Wine': { icon: Wine, label: 'Wine & Alcohol', category: 'beverages' },
  'Beer': { icon: Beer, label: 'Beer', category: 'beverages' },
  'Martini': { icon: Martini, label: 'Cocktails', category: 'beverages' },
  'CupSoda': { icon: CupSoda, label: 'Soft Drinks', category: 'beverages' },
  'GlassWater': { icon: GlassWater, label: 'Water & Juice', category: 'beverages' },
  'Milk': { icon: Milk, label: 'Milk & Dairy', category: 'beverages' },
  
  // Desserts & Sweets
  'IceCream': { icon: IceCream, label: 'Ice Cream', category: 'desserts' },
  'IceCreamCone': { icon: IceCreamCone, label: 'Ice Cream Cone', category: 'desserts' },
  'Cookie': { icon: Cookie, label: 'Cookies & Biscuits', category: 'desserts' },
  'Cake': { icon: Cake, label: 'Cakes', category: 'desserts' },
  'CakeSlice': { icon: CakeSlice, label: 'Cake Slice', category: 'desserts' },
  'Donut': { icon: Donut, label: 'Donuts', category: 'desserts' },
  'Candy': { icon: Candy, label: 'Candy & Sweets', category: 'desserts' },
  
  // Snacks
  'Popcorn': { icon: Popcorn, label: 'Snacks', category: 'snacks' },
  
  // Fruits & Vegetables
  'Cherry': { icon: Cherry, label: 'Fruits', category: 'fruits' },
  'Apple': { icon: Apple, label: 'Fresh Fruits', category: 'fruits' },
  'Banana': { icon: Banana, label: 'Tropical Fruits', category: 'fruits' },
  'Grape': { icon: Grape, label: 'Grapes & Berries', category: 'fruits' },
  'Carrot': { icon: Carrot, label: 'Vegetables', category: 'fruits' },
} as const

// Icon categories for organized selection
export const ICON_CATEGORIES = {
  general: 'General',
  food: 'Food & Main Dishes',
  beverages: 'Beverages',
  desserts: 'Desserts & Sweets',
  snacks: 'Snacks',
  fruits: 'Fruits & Vegetables'
} as const

// Get all icons as array for selection
export const getAllIcons = () => {
  return Object.entries(CATEGORY_ICONS).map(([key, value]) => ({
    key,
    ...value
  }))
}

// Get icons by category
export const getIconsByCategory = (category: keyof typeof ICON_CATEGORIES) => {
  return Object.entries(CATEGORY_ICONS)
    .filter(([, value]) => value.category === category)
    .map(([key, value]) => ({ key, ...value }))
}

// Get icon component by key
export const getIconComponent = (iconKey: string) => {
  return CATEGORY_ICONS[iconKey as keyof typeof CATEGORY_ICONS]?.icon || UtensilsCrossed
}

// Default icon
export const DEFAULT_CATEGORY_ICON = 'UtensilsCrossed'