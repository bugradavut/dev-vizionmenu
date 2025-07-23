/**
 * JWT Utility Functions
 * Client-side JWT token parsing and validation
 */

import type { AuthTokenPayload } from '@repo/types/auth';

/**
 * Decode JWT token payload
 */
export function decodeJWT(token: string): AuthTokenPayload | null {
  try {
    // Split token into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode payload (second part)
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    
    return JSON.parse(decoded) as AuthTokenPayload;
  } catch (error) {
    console.warn('Failed to decode JWT token:', error);
    return null;
  }
}

/**
 * Check if JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
}

/**
 * Get token expiration time in milliseconds
 */
export function getTokenExpiration(token: string): number | null {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return null;
  }

  return payload.exp * 1000;
}

/**
 * Check if token expires within specified minutes
 */
export function isTokenExpiringWithin(token: string, minutes: number): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const expiresInSeconds = payload.exp - currentTime;
  const expiresInMinutes = expiresInSeconds / 60;

  return expiresInMinutes <= minutes;
}

/**
 * Extract user data from JWT token
 */
export function extractUserFromToken(token: string) {
  const payload = decodeJWT(token);
  if (!payload) {
    return null;
  }

  return {
    userId: payload.sub,
    email: payload.email,
    chainId: payload.chain_id,
    branchId: payload.branch_id,
    branchName: payload.branch_name,
    role: payload.role,
    permissions: payload.permissions,
    issuedAt: payload.iat,
    expiresAt: payload.exp,
  };
}