/**
 * Auth Debug Component
 * For testing enhanced auth functionality
 */

"use client";

import { useEnhancedAuth, usePermissions } from '@/hooks/use-enhanced-auth';

export function AuthDebug() {
  const auth = useEnhancedAuth();
  const permissions = usePermissions();

  if (!auth.user) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg">
        <h3 className="font-bold mb-2">Auth Debug (Not Logged In)</h3>
        <p>Please log in to see auth data</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-100 rounded-lg space-y-4">
      <h3 className="font-bold mb-2">Enhanced Auth Debug</h3>
      
      {/* User Context */}
      <div className="bg-white p-3 rounded">
        <h4 className="font-semibold mb-2">User Context</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>User ID: {auth.userId}</div>
          <div>Email: {auth.email}</div>
          <div>Chain ID: {auth.chainId}</div>
          <div>Branch ID: {auth.branchId}</div>
          <div>Branch Name: {auth.branchName}</div>
          <div>Role: {auth.role}</div>
        </div>
      </div>

      {/* Permissions */}
      <div className="bg-white p-3 rounded">
        <h4 className="font-semibold mb-2">Permissions</h4>
        <div className="text-sm space-y-1">
          <div>Permissions: {auth.permissions?.join(', ') || 'None'}</div>
          <div className="grid grid-cols-2 gap-1 mt-2">
            <div>Is Chain Owner: {auth.isChainOwner ? '✅' : '❌'}</div>
            <div>Is Branch Manager: {auth.isBranchManager ? '✅' : '❌'}</div>
            <div>Can Manage Users: {permissions.canManageUsers ? '✅' : '❌'}</div>
            <div>Can Delete Users: {permissions.canDeleteUsers ? '✅' : '❌'}</div>
            <div>Can Manage Menu: {permissions.canManageMenu ? '✅' : '❌'}</div>
            <div>Can Access Settings: {permissions.canAccessSettings ? '✅' : '❌'}</div>
          </div>
        </div>
      </div>

      {/* Token Info */}
      <div className="bg-white p-3 rounded">
        <h4 className="font-semibold mb-2">Token Info</h4>
        <div className="text-sm space-y-1">
          <div>Token Expired: {auth.isTokenExpired ? '❌' : '✅'}</div>
          <div>Token Expiry: {auth.tokenExpiry?.toLocaleString()}</div>
          <div>Token Expiring Soon: {auth.isTokenExpiring() ? '⚠️' : '✅'}</div>
        </div>
      </div>

      {/* JWT Payload */}
      {auth.jwtPayload && (
        <div className="bg-white p-3 rounded">
          <h4 className="font-semibold mb-2">JWT Payload</h4>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(auth.jwtPayload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}