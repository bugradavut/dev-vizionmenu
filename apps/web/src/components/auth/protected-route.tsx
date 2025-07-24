/**
 * Protected Route Component
 * Provides page-level route protection with role-based access control
 */

"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEnhancedAuth } from '@/hooks/use-enhanced-auth';
import { GenericSkeleton } from '@/components/skeletons/generic-skeleton';
import type { BranchRole } from '@repo/types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  
  // Basic auth requirements
  requireAuth?: boolean;
  redirectTo?: string;
  
  // Role-based protection
  requiredRole?: BranchRole;
  requiredRoles?: BranchRole[];
  
  // Permission-based protection
  requiredPermission?: string;
  requiredPermissions?: string[];
  
  // Custom authorization check
  customCheck?: (auth: ReturnType<typeof useEnhancedAuth>) => boolean;
  
  // Loading and error states
  loadingComponent?: React.ReactNode;
  unauthorizedComponent?: React.ReactNode;
  
  // Debug mode
  debug?: boolean;
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  redirectTo = '/login',
  requiredRole,
  requiredRoles,
  requiredPermission,
  requiredPermissions,
  customCheck,
  loadingComponent,
  unauthorizedComponent,
  debug = false,
}: ProtectedRouteProps) {
  const router = useRouter();
  const auth = useEnhancedAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuthorization = () => {
      // Wait for auth to load
      if (auth.loading) {
        setIsAuthorized(null);
        return;
      }

      // Basic auth check
      if (requireAuth && !auth.user) {
        setIsAuthorized(false);
        router.push(redirectTo);
        return;
      }

      // Skip further checks if auth not required
      if (!requireAuth) {
        setIsAuthorized(true);
        return;
      }

      // Role-based checks
      if (requiredRole && !auth.hasRole(requiredRole)) {
        setIsAuthorized(false);
        return;
      }

      if (requiredRoles && !auth.hasAnyRole(requiredRoles)) {
        setIsAuthorized(false);
        return;
      }

      // Permission-based checks
      if (requiredPermission && !auth.hasPermission(requiredPermission)) {
        setIsAuthorized(false);
        return;
      }

      if (requiredPermissions) {
        const hasAllPermissions = requiredPermissions.every(permission => 
          auth.hasPermission(permission)
        );
        if (!hasAllPermissions) {
          setIsAuthorized(false);
          return;
        }
      }

      // Custom authorization check
      if (customCheck && !customCheck(auth)) {
        setIsAuthorized(false);
        return;
      }

      // All checks passed
      setIsAuthorized(true);
    };

    checkAuthorization();
  }, [
    auth,
    requireAuth,
    requiredRole,
    requiredRoles,
    requiredPermission,
    requiredPermissions,
    customCheck,
    redirectTo,
    router,
    debug,
  ]);

  // Loading state
  if (auth.loading || isAuthorized === null) {
    return loadingComponent || <GenericSkeleton />;
  }

  // Unauthorized state
  if (isAuthorized === false) {
    if (unauthorizedComponent) {
      return <>{unauthorizedComponent}</>;
    }
    
    // Default unauthorized component
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don&apos;t have permission to access this page.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Authorized - render children
  return <>{children}</>;
}

/**
 * Higher-order component version for easier usage
 */
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  protection: Omit<ProtectedRouteProps, 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...protection}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

/**
 * Common protection presets
 */
export const ProtectionPresets = {
  // Basic authentication required
  authenticated: {
    requireAuth: true,
  },
  
  // Chain owner only
  chainOwnerOnly: {
    requireAuth: true,
    requiredRole: 'chain_owner' as BranchRole,
  },
  
  // Management roles (chain owner or branch manager)
  managementOnly: {
    requireAuth: true,
    requiredRoles: ['chain_owner', 'branch_manager'] as BranchRole[],
  },
  
  // User management permission required
  userManagement: {
    requireAuth: true,
    requiredPermission: 'users:write',
  },
  
  // Settings access required
  settingsAccess: {
    requireAuth: true,
    requiredPermissions: ['settings:read'],
  },
  
  // Settings management required
  settingsManagement: {
    requireAuth: true,
    requiredPermissions: ['settings:write'],
  },
} as const;