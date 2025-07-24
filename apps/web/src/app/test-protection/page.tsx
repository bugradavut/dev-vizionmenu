/**
 * Test Protection Page
 * For testing different protection levels
 */

"use client";

import { ProtectedRoute, ProtectionPresets } from "@/components/auth/protected-route";

export default function TestProtectionPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Protection Test Page</h1>
      
      
      <div className="mt-8 space-y-6">
        {/* Test 1: Chain Owner Only */}
        <ProtectedRoute 
          requiredRole="chain_owner"
          debug={false}
          unauthorizedComponent={
            <div className="p-4 bg-red-100 border border-red-300 rounded">
              ❌ Chain Owner Only Section - Access Denied
            </div>
          }
        >
          <div className="p-4 bg-green-100 border border-green-300 rounded">
            ✅ Chain Owner Only Section - You have access!
          </div>
        </ProtectedRoute>

        {/* Test 2: Branch Manager Only */}
        <ProtectedRoute 
          requiredRole="branch_manager"
          debug={false}
          unauthorizedComponent={
            <div className="p-4 bg-red-100 border border-red-300 rounded">
              ❌ Branch Manager Only Section - Access Denied
            </div>
          }
        >
          <div className="p-4 bg-green-100 border border-green-300 rounded">
            ✅ Branch Manager Only Section - You have access!
          </div>
        </ProtectedRoute>

        {/* Test 3: Management Roles */}
        <ProtectedRoute 
          {...ProtectionPresets.managementOnly}
          debug={false}
          unauthorizedComponent={
            <div className="p-4 bg-red-100 border border-red-300 rounded">
              ❌ Management Only Section - Access Denied
            </div>
          }
        >
          <div className="p-4 bg-green-100 border border-green-300 rounded">
            ✅ Management Only Section - You have access!
          </div>
        </ProtectedRoute>

        {/* Test 4: Specific Permission */}
        <ProtectedRoute 
          requiredPermission="reports:read"
          debug={false}
          unauthorizedComponent={
            <div className="p-4 bg-red-100 border border-red-300 rounded">
              ❌ Reports Read Permission - Access Denied
            </div>
          }
        >
          <div className="p-4 bg-green-100 border border-green-300 rounded">
            ✅ Reports Read Permission - You have access!
          </div>
        </ProtectedRoute>

        {/* Test 5: Non-existent Permission */}
        <ProtectedRoute 
          requiredPermission="super_admin:access"
          debug={false}
          unauthorizedComponent={
            <div className="p-4 bg-red-100 border border-red-300 rounded">
              ❌ Super Admin Permission - Access Denied (as expected)
            </div>
          }
        >
          <div className="p-4 bg-green-100 border border-green-300 rounded">
            ✅ Super Admin Permission - You have access!
          </div>
        </ProtectedRoute>
      </div>
    </div>
  );
}