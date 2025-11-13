/**
 * WEB-SRM Certificate Types
 * FO-127: Certificate expiry warning system
 */

/**
 * Certificate expiry warning levels
 */
export type CertificateWarningLevel =
  | 'none'      // No warning needed (> 3 years until expiry)
  | 'info'      // <= 3 years: Quebec recommends renewal
  | 'warning'   // <= 90 days: Certificate expires soon
  | 'urgent'    // <= 30 days: Action required
  | 'critical'  // <= 7 days: Renew immediately
  | 'expired';  // Certificate has expired

/**
 * Certificate expiry status response from API
 */
export interface CertificateExpiryStatus {
  success: boolean;
  hasActiveCertificate: boolean;
  daysUntilExpiry?: number;
  expiryDate?: string;
  warningLevel: CertificateWarningLevel;
  shouldShowNotification: boolean;
  message: string;
  certificateId?: string;
  serialNumber?: string;
  env?: string;
}

/**
 * Certificate data (existing structure)
 */
export interface CertificateData {
  id: string;
  serialNumber: string;
  validFrom: string;
  validUntil: string;
  fingerprint: string;
  isActive: boolean;
  deviceId: string;
  env: string;
}
