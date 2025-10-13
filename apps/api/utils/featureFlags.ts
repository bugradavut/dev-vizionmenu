/**
 * Feature Flags Utility
 * Centralized feature flag checks for API
 *
 * All feature flags should be defined here for consistency and easy auditing.
 */

/**
 * Check if WEB-SRM dry-run mode is enabled
 *
 * Dry-run mode:
 * - Only works in NON-PRODUCTION environments
 * - Must be explicitly enabled via WEBSRM_DRYRUN_ENABLED=true
 * - Generates WEB-SRM payloads to tmp/ for inspection
 * - Does NOT make network calls to WEB-SRM API
 * - Does NOT affect order processing
 *
 * @returns true if dry-run is enabled, false otherwise
 *
 * @example
 * if (isWebSrmDryRunEnabled()) {
 *   await emitWebsrmDryRun(order);
 * }
 */
export const isWebSrmDryRunEnabled = (): boolean => {
  // Never enable in production
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  // Must be explicitly enabled
  const flag = String(process.env.WEBSRM_DRYRUN_ENABLED || '').toLowerCase();
  return flag === 'true' || flag === '1';
};

/**
 * Check if WEB-SRM real integration is enabled
 * This will be used in Phase 4 for actual API calls
 *
 * @returns true if real integration is enabled, false otherwise
 */
export const isWebSrmRealEnabled = (): boolean => {
  // TODO: Implement in Phase 4
  // Will check WEBSRM_ENABLED flag and certification status
  return false;
};
