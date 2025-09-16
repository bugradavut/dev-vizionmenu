/**
 * Chart Color Utilities
 * Professional color management for analytics charts
 */

// Professional color palette for analytics charts
export const CHART_COLORS = {
  // Revenue stays orange (primary brand color)
  revenue: '#ea580c',

  // Volume - Deep Green (contrasts with orange)
  volume: '#059669',

  // AOV - Deep Blue (contrasts with green and orange)
  aov: '#1e40af',

  // Platform breakdown - Multi-color palette
  platforms: [
    '#8b5cf6', // Purple
    '#10b981', // Emerald
    '#6366f1', // Indigo
    '#0891b2', // Teal/Cyan - çok elegant ve modern (Website bu index'e düşecek)
    '#ec4899', // Pink
    '#84cc16', // Lime
    '#f59e0b', // Amber
    '#f97316', // Orange
  ]
} as const;

/**
 * Get a deterministic color for platform breakdown
 * Uses platform name to ensure consistent colors across renders
 */
export function getPlatformColor(platformName: string, index: number): string {
  // Create a simple hash from the platform name for consistency
  const hash = platformName.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  // Use hash to select color, fallback to index if needed
  const colorIndex = Math.abs(hash) % CHART_COLORS.platforms.length;
  return CHART_COLORS.platforms[colorIndex] || CHART_COLORS.platforms[index % CHART_COLORS.platforms.length];
}

/**
 * Get random color from professional palette (excluding revenue orange)
 * Used for charts that need unique colors
 */
export function getRandomChartColor(excludeRevenue = true): string {
  const availableColors = excludeRevenue
    ? CHART_COLORS.platforms
    : [...CHART_COLORS.platforms, CHART_COLORS.revenue];

  const randomIndex = Math.floor(Math.random() * availableColors.length);
  return availableColors[randomIndex];
}

/**
 * Get color with opacity for area charts
 */
export function getColorWithOpacity(color: string, opacity: number): string {
  // Convert hex to rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Generate a deterministic color based on string hash
 * Ensures same input always produces same color
 */
export function getDeterministicColor(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert to positive number and get index
  const index = Math.abs(hash) % CHART_COLORS.platforms.length;
  return CHART_COLORS.platforms[index];
}