/**
 * Enhanced Auth Hook
 * Combines Supabase auth with JWT token parsing and enhanced permissions
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useAuthApi } from './use-auth';
import { supabase } from '@/lib/supabase';
import { decodeJWT, isTokenExpired as checkTokenExpired, isTokenExpiringWithin, extractUserFromToken } from '@/utils/jwt';
import type { BranchRole, AuthTokenPayload } from '@repo/types/auth';

interface EnhancedAuthState {
  // Combined user data
  user: unknown | null;
  session: unknown | null;
  loading: boolean;
  
  // JWT-specific data
  jwtPayload: AuthTokenPayload | null;
  tokenExpiry: Date | null;
  isTokenExpired: boolean;
  
  // Enhanced user context
  userId: string | null;
  email: string | null;
  chainId: string | null;
  branchId: string | null;
  branchName: string | null;
  role: BranchRole | null;
  permissions: string[];
  
  // Permission utilities
  hasPermission: (permission: string) => boolean;
  hasRole: (role: BranchRole) => boolean;
  hasAnyRole: (roles: BranchRole[]) => boolean;
  isChainOwner: boolean;
  isBranchManager: boolean;
  isBranchStaff: boolean;
  isBranchCashier: boolean;
  
  // Token management
  refreshToken: () => Promise<void>;
  isTokenExpiring: (minutes?: number) => boolean;
}

export function useEnhancedAuth(): EnhancedAuthState {
  const supabaseAuth = useAuth();
  const apiAuth = useAuthApi();
  const [jwtPayload, setJwtPayload] = useState<AuthTokenPayload | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState<Date | null>(null);
  const [isTokenExpired, setIsTokenExpired] = useState(false);

  // Parse JWT token when session changes
  useEffect(() => {
    const parseToken = async () => {
      if (supabaseAuth.session?.access_token) {
        const payload = decodeJWT(supabaseAuth.session.access_token);
        setJwtPayload(payload);
        
        if (payload?.exp) {
          setTokenExpiry(new Date(payload.exp * 1000));
          setIsTokenExpired(checkTokenExpired(supabaseAuth.session.access_token));
        }
      } else {
        setJwtPayload(null);
        setTokenExpiry(null);
        setIsTokenExpired(false);
      }
    };

    parseToken();
  }, [supabaseAuth.session?.access_token]);

  // Monitor token expiration
  useEffect(() => {
    if (!supabaseAuth.session?.access_token) return;

    const checkExpiration = () => {
      const expired = checkTokenExpired(supabaseAuth.session!.access_token);
      setIsTokenExpired(expired);
    };

    // Check immediately
    checkExpiration();

    // Check every minute
    const interval = setInterval(checkExpiration, 60 * 1000);
    return () => clearInterval(interval);
  }, [supabaseAuth.session]);

  // Auto-fetch user profile when session changes
  useEffect(() => {
    if (supabaseAuth.session?.access_token && supabaseAuth.user && !apiAuth.user) {
      apiAuth.refreshProfile().catch(error => {
        console.warn('Failed to auto-fetch profile:', error);
      });
    }
  }, [supabaseAuth.session?.access_token, supabaseAuth.user, apiAuth.user, apiAuth.refreshProfile]);

  // Extract user context - prioritize API data over JWT
  const jwtUserContext = extractUserFromToken(supabaseAuth.session?.access_token || '');

  
  const userContext = {
    userId: apiAuth.user?.id || supabaseAuth.user?.id || null,
    email: apiAuth.user?.email || supabaseAuth.user?.email || null,
    chainId: apiAuth.user?.chain_id || jwtUserContext?.chainId || null,
    branchId: apiAuth.user?.branch_id || jwtUserContext?.branchId || null,
    branchName: apiAuth.user?.branch_name || jwtUserContext?.branchName || null,
    role: apiAuth.user?.role || jwtUserContext?.role || null,
    permissions: apiAuth.user?.permissions || jwtUserContext?.permissions || [],
    issuedAt: jwtUserContext?.issuedAt || null,
    expiresAt: jwtUserContext?.expiresAt || null,
  };


  // Ensure permissions is always an array
  const safePermissions = useMemo(() => {
    return Array.isArray(userContext.permissions) ? userContext.permissions : [];
  }, [userContext.permissions]);

  // Permission utilities
  const hasPermission = useCallback((permission: string): boolean => {
    // Super admin (future) will have wildcard permissions
    if (safePermissions.includes('*')) return true;
    
    return safePermissions.includes(permission);
  }, [safePermissions]);

  const hasRole = useCallback((role: BranchRole): boolean => {
    return userContext.role === role;
  }, [userContext.role]);

  const hasAnyRole = useCallback((roles: BranchRole[]): boolean => {
    if (!userContext.role) return false;
    return roles.includes(userContext.role);
  }, [userContext.role]);

  // Token management
  const refreshToken = useCallback(async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Token refresh failed:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
      throw error;
    }
  }, []);

  const isTokenExpiring = useCallback((minutes: number = 5): boolean => {
    if (!supabaseAuth.session?.access_token) return true;
    return isTokenExpiringWithin(supabaseAuth.session.access_token, minutes);
  }, [supabaseAuth.session?.access_token]);

  // Auto-refresh token when expiring
  useEffect(() => {
    if (!supabaseAuth.session?.access_token) return;

    const checkAndRefresh = async () => {
      if (isTokenExpiring(10)) { // Refresh 10 minutes before expiry
        try {
          await refreshToken();
        } catch (error) {
          console.warn('Auto token refresh failed:', error);
        }
      }
    };

    // Check every 5 minutes
    const interval = setInterval(checkAndRefresh, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [supabaseAuth.session, isTokenExpiring, refreshToken]);

  return {
    // Combined auth state
    user: supabaseAuth.user || apiAuth.user,
    session: supabaseAuth.session,
    loading: supabaseAuth.loading || apiAuth.loginLoading,
    
    // JWT-specific data
    jwtPayload,
    tokenExpiry,
    isTokenExpired,
    
    // Enhanced user context
    userId: userContext.userId,
    email: userContext.email,
    chainId: userContext.chainId,
    branchId: userContext.branchId,
    branchName: userContext.branchName,
    role: userContext.role,
    permissions: safePermissions,
    
    // Permission utilities
    hasPermission,
    hasRole,
    hasAnyRole,
    isChainOwner: hasRole('chain_owner'),
    isBranchManager: hasRole('branch_manager'),
    isBranchStaff: hasRole('branch_staff'),
    isBranchCashier: hasRole('branch_cashier'),
    
    // Token management
    refreshToken,
    isTokenExpiring,
  };
}

/**
 * Hook for permission-only checks (lighter weight)
 */
export function usePermissions() {
  const { hasPermission, hasRole, hasAnyRole, permissions, role, isChainOwner, isBranchManager } = useEnhancedAuth();
  
  return {
    hasPermission,
    hasRole,
    hasAnyRole,
    permissions,
    role,
    isChainOwner,
    isBranchManager,
    
    // Common permission checks
    canManageUsers: isChainOwner, // Only chain owners can add users
    canDeleteUsers: hasPermission('users:delete') || isChainOwner,
    canManageMenu: hasPermission('menu:write') || isChainOwner || isBranchManager,
    canViewReports: hasPermission('reports:read') || isChainOwner || isBranchManager,
    canAccessSettings: hasPermission('settings:read') || isChainOwner || isBranchManager,
    canManageSettings: hasPermission('settings:write') || isChainOwner,
    canManageOrders: hasPermission('orders:write') || isChainOwner || isBranchManager,
    canProcessPayments: hasPermission('payments:write') || hasRole('branch_cashier') || isChainOwner,
  };
}